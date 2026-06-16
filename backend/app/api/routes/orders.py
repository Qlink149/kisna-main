import csv
import io
from typing import Any

from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import StreamingResponse

from app.core.database import get_db
from app.models.order import OrderUpdate
from app.services.excel_store import orders_collection
from app.services.order_mapper import excel_to_portal
from app.services.order_query import build_orders_query, stats_pipeline

router = APIRouter(prefix="/orders", tags=["orders"])

EXPORT_COLUMNS = [
    "id", "orderNo", "designNo", "customerName", "city", "state", "kt",
    "goldWeight", "totalQty", "orderValue", "totalDpRate", "excelStatus",
    "status", "assignedVendor", "complexity", "collection", "orderDate",
    "expectedDeliveryDate", "vendorPlacingDate",
]


def _paginated_response(docs: list[dict], total: int, page: int, limit: int) -> dict:
    pages = max(1, (total + limit - 1) // limit)
    return {
        "items": [excel_to_portal(d) for d in docs],
        "total": total,
        "page": page,
        "limit": limit,
        "pages": pages,
    }


@router.get("/stats")
async def order_stats():
    db = get_db()
    col = orders_collection(db)
    total = await col.count_documents(build_orders_query())
    rows = await col.aggregate(stats_pipeline()).to_list(50)
    by_status = {row["_id"]: row["count"] for row in rows if row["_id"]}

    def count(*statuses: str) -> int:
        return sum(by_status.get(s, 0) for s in statuses)

    return {
        "total": total,
        "unassigned": count("UNASSIGNED"),
        "pendingVendorReview": count("PENDING_VENDOR_REVIEW"),
        "inProduction": count("IN_PRODUCTION", "FINISHING"),
        "pendingQC": count("READY_FOR_QC", "QC_IN_REVIEW", "QC_FAILED"),
        "awaitingPayment": count("AWAITING_PAYMENT", "PAYMENT_OVERDUE"),
        "dispatched": count("DISPATCHED"),
        "byStatus": by_status,
    }


@router.get("/export")
async def export_orders(
    search: str | None = None,
    status: str | None = None,
    excel_status: str | None = Query(None, alias="excelStatus"),
    state: str | None = None,
    vendor: str | None = None,
):
    db = get_db()
    col = orders_collection(db)
    query = build_orders_query(
        search=search, status=status, excel_status=excel_status, state=state, vendor=vendor,
    )
    docs = await col.find(query).limit(10000).to_list(10000)

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(EXPORT_COLUMNS)
    for doc in docs:
        mapped = excel_to_portal(doc)
        writer.writerow([mapped.get(col, "") for col in EXPORT_COLUMNS])

    buffer.seek(0)
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="kisna-orders-export.csv"'},
    )


@router.get("/")
async def list_orders(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    search: str | None = None,
    status: str | None = None,
    excel_status: str | None = Query(None, alias="excelStatus"),
    state: str | None = None,
    vendor: str | None = None,
):
    db = get_db()
    col = orders_collection(db)
    query = build_orders_query(
        search=search, status=status, excel_status=excel_status, state=state, vendor=vendor,
    )
    total = await col.count_documents(query)
    skip = (page - 1) * limit
    docs = await col.find(query).sort("_id", 1).skip(skip).limit(limit).to_list(limit)
    return _paginated_response(docs, total, page, limit)


@router.get("/{order_id}")
async def get_order(order_id: str):
    db = get_db()
    doc = await orders_collection(db).find_one({"_id": order_id})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Order {order_id} not found")
    return excel_to_portal(doc)


@router.patch("/{order_id}")
async def update_order(order_id: str, payload: OrderUpdate):
    db = get_db()
    raw = payload.model_dump(exclude_none=False)
    unset_fields = [k for k, v in raw.items() if v is None]
    updates = {k: v for k, v in raw.items() if v is not None}
    if not updates and not unset_fields:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update")

    update_doc: dict[str, Any] = {}
    if updates:
        update_doc["$set"] = updates
    if unset_fields:
        update_doc["$unset"] = {k: "" for k in unset_fields}

    result = await orders_collection(db).find_one_and_update(
        {"_id": order_id},
        update_doc,
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Order {order_id} not found")
    return excel_to_portal(result)
