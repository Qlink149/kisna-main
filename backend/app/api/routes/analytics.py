from fastapi import APIRouter
from app.core.database import get_db
from app.services.excel_store import orders_collection

router = APIRouter(prefix="/analytics", tags=["analytics"])

ORDER_MATCH = {"_id": {"$not": {"$regex": "^__"}}}


@router.get("/")
async def get_analytics():
    db = get_db()
    col = orders_collection(db)

    total_orders = await col.count_documents(ORDER_MATCH)

    # Aggregate totals in one pass
    totals_agg = await col.aggregate([
        {"$match": ORDER_MATCH},
        {"$group": {
            "_id": None,
            "totalQty": {"$sum": "$totalQty"},
            "totalGoldWeight": {"$sum": "$goldWeight"},
            "totalDpRate": {"$sum": "$totalDpRate"},
            "totalDpRateWithGst": {"$sum": "$totalDpRateWithGst"},
        }}
    ]).to_list(1)
    totals = totals_agg[0] if totals_agg else {}

    unique_customers = len(await col.distinct("customerCode", ORDER_MATCH))
    unique_states = len(await col.distinct("state", ORDER_MATCH))

    # Status breakdown by qty and gold weight
    status_agg = await col.aggregate([
        {"$match": ORDER_MATCH},
        {"$group": {
            "_id": "$excelStatus",
            "qty": {"$sum": "$totalQty"},
            "goldWt": {"$sum": "$goldWeight"},
        }},
        {"$sort": {"qty": -1}},
    ]).to_list(20)

    # Karatage by order count
    kt_agg = await col.aggregate([
        {"$match": ORDER_MATCH},
        {"$group": {"_id": "$kt", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 8},
    ]).to_list(8)

    # Top states by order count
    state_agg = await col.aggregate([
        {"$match": ORDER_MATCH},
        {"$group": {"_id": "$state", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 8},
    ]).to_list(8)

    # Top customers by total qty
    customer_agg = await col.aggregate([
        {"$match": ORDER_MATCH},
        {"$group": {"_id": "$customerName", "qty": {"$sum": "$totalQty"}}},
        {"$sort": {"qty": -1}},
        {"$limit": 8},
    ]).to_list(8)

    # Collection mix by order count
    coll_agg = await col.aggregate([
        {"$match": ORDER_MATCH},
        {"$group": {"_id": "$collection", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 8},
    ]).to_list(8)

    # Delivery priority by order count
    deliv_agg = await col.aggregate([
        {"$match": ORDER_MATCH},
        {"$group": {"_id": "$deliveryPriority", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 8},
    ]).to_list(8)

    # Order type breakdown
    type_agg = await col.aggregate([
        {"$match": ORDER_MATCH},
        {"$group": {"_id": "$orderType", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]).to_list(10)

    return {
        "totalOrders": total_orders,
        "totalQty": totals.get("totalQty", 0),
        "totalGoldWeight": round(totals.get("totalGoldWeight", 0), 2),
        "totalDpRate": round(totals.get("totalDpRate", 0), 2),
        "totalDpRateWithGst": round(totals.get("totalDpRateWithGst", 0), 2),
        "uniqueCustomers": unique_customers,
        "uniqueStates": unique_states,
        "statusCounts": [
            {"status": s["_id"], "qty": s["qty"], "goldWt": round(s["goldWt"], 2)}
            for s in status_agg if s["_id"]
        ],
        "karatage": [{"kt": k["_id"], "count": k["count"]} for k in kt_agg if k["_id"]],
        "topStates": [{"state": s["_id"], "count": s["count"]} for s in state_agg if s["_id"]],
        "topCustomers": [{"customer": c["_id"], "qty": c["qty"]} for c in customer_agg if c["_id"]],
        "collections": [{"collection": c["_id"], "count": c["count"]} for c in coll_agg if c["_id"]],
        "deliveryPriority": [{"priority": d["_id"], "count": d["count"]} for d in deliv_agg if d["_id"]],
        "orderTypes": [{"type": t["_id"], "count": t["count"]} for t in type_agg if t["_id"]],
    }
