import uuid
from fastapi import APIRouter, status
from app.core.database import get_db
from app.models.activity import ActivityCreate
from app.services.excel_store import META_ACTIVITY_ID, orders_collection

router = APIRouter(prefix="/activities", tags=["activities"])

STATUS_TYPE = {
    "Ready For Dispatch": "warning",
    "God WIP": "primary",
    "GOD WIP": "primary",
    "Pending from Vendor": "info",
    "Inter Store Transfer": "primary",
}

CATEGORY_HINT = {
    "Ready For Dispatch": "QC",
    "God WIP": "Production",
    "GOD WIP": "Production",
    "Pending from Vendor": "Assignment",
    "Inter Store Transfer": "Production",
}


def _activity_type(excel_status: str | None) -> str:
    if not excel_status:
        return "info"
    return STATUS_TYPE.get(excel_status, "info")


async def _generated_feed(db):
    """Build activity items from recent excel_orders rows."""
    col = orders_collection(db)
    docs = await col.find(
        {"_id": {"$not": {"$regex": "^__"}}},
        {
            "orderNo": 1,
            "designNo": 1,
            "customerName": 1,
            "excelStatus": 1,
            "vendorPlacingDate": 1,
            "assignedVendor": 1,
            "designerName": 1,
        },
    ).sort("vendorPlacingDate", -1).limit(12).to_list(12)

    items = []
    for doc in docs:
        order_no = doc.get("orderNo") or doc.get("_id")
        status_label = doc.get("excelStatus") or "In progress"
        vendor = doc.get("assignedVendor") or doc.get("designerName") or "Workshop"
        customer = doc.get("customerName") or "Customer"
        items.append({
            "id": f"gen-{order_no}",
            "title": f"Order {order_no} — {status_label}",
            "description": f"{customer} · {vendor}",
            "time": doc.get("vendorPlacingDate") or "—",
            "type": _activity_type(doc.get("excelStatus")),
            "category": CATEGORY_HINT.get(doc.get("excelStatus") or "", "Operations"),
        })
    return items


@router.get("/")
async def list_activities():
    db = get_db()
    col = orders_collection(db)

    stored = []
    meta = await col.find_one({"_id": META_ACTIVITY_ID})
    if meta and meta.get("items"):
        stored = list(meta["items"])

    generated = await _generated_feed(db)

    seen = set()
    merged = []
    for item in stored + generated:
        key = item.get("id") or item.get("title")
        if key in seen:
            continue
        seen.add(key)
        merged.append(item)
        if len(merged) >= 30:
            break

    return merged


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_activity(payload: ActivityCreate):
    db = get_db()
    col = orders_collection(db)
    entry = payload.model_dump()
    entry["id"] = str(uuid.uuid4())

    await col.update_one(
        {"_id": META_ACTIVITY_ID},
        {"$push": {"items": {"$each": [entry], "$position": 0, "$slice": 50}}},
        upsert=True,
    )
    return entry


@router.delete("/")
async def clear_activities():
    db = get_db()
    col = orders_collection(db)
    result = await col.delete_one({"_id": META_ACTIVITY_ID})
    return {"ok": True, "deleted": result.deleted_count}
