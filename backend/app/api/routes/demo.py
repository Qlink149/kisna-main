"""Demo vendor portal — seed orders for end-to-end workflow testing."""

from datetime import datetime

from fastapi import APIRouter

from app.constants import DEMO_ORDER_PREFIX, DEMO_VENDOR_ID, DEMO_VENDOR_NAME
from app.core.database import get_db
from app.services.excel_store import orders_collection
from app.services.order_mapper import excel_to_portal

router = APIRouter(prefix="/demo", tags=["demo"])

DEMO_ORDERS = [
    {
        "_id": f"{DEMO_ORDER_PREFIX}1001",
        "orderNo": f"{DEMO_ORDER_PREFIX}1001",
        "designNo": "KDM-RING-4421",
        "style": "Solitaire Halo Ring",
        "collection": "Bridal",
        "customerName": "Kisna Flagship Mumbai",
        "city": "Mumbai",
        "state": "Maharashtra",
        "kt": "18KT",
        "goldWeight": 4.2,
        "qty": 1,
        "totalQty": 1,
        "orderValue": 125000,
        "status": "PENDING_VENDOR_REVIEW",
        "assignedVendor": DEMO_VENDOR_NAME,
        "expectedTatDays": 10,
        "priority": "High Priority",
        "notes": "Demo assignment — accept this order to test vendor workflow.",
        "storeContactNumber": "9876543210",
        "vendorContactNumber": "9876543211",
        "excelStatus": "Pending from Vendor",
    },
    {
        "_id": f"{DEMO_ORDER_PREFIX}1002",
        "orderNo": f"{DEMO_ORDER_PREFIX}1002",
        "designNo": "KDM-PEND-8812",
        "style": "Temple Pendant",
        "collection": "Heritage",
        "customerName": "Kisna Store Surat",
        "city": "Surat",
        "state": "Gujarat",
        "kt": "22KT",
        "goldWeight": 8.5,
        "qty": 2,
        "totalQty": 2,
        "orderValue": 210000,
        "status": "IN_PRODUCTION",
        "assignedVendor": DEMO_VENDOR_NAME,
        "expectedTatDays": 14,
        "assignedDatApproved": datetime.now().strftime("%b %d, %Y"),
        "excelStatus": "God WIP",
    },
    {
        "_id": f"{DEMO_ORDER_PREFIX}1003",
        "orderNo": f"{DEMO_ORDER_PREFIX}1003",
        "designNo": "KDM-BRC-3301",
        "style": "Kada Bracelet",
        "collection": "Men",
        "customerName": "Kisna Store Delhi",
        "city": "Delhi",
        "state": "Delhi",
        "kt": "22KT",
        "goldWeight": 22.0,
        "qty": 1,
        "totalQty": 1,
        "orderValue": 380000,
        "status": "READY_FOR_QC",
        "assignedVendor": DEMO_VENDOR_NAME,
        "dateCompleted": datetime.now().strftime("%b %d, %Y"),
        "excelStatus": "Ready For Dispatch",
    },
    {
        "_id": f"{DEMO_ORDER_PREFIX}1004",
        "orderNo": f"{DEMO_ORDER_PREFIX}1004",
        "designNo": "KDM-ERR-9901",
        "style": "Stud Earrings",
        "collection": "Daily Wear",
        "customerName": "Kisna Store Pune",
        "city": "Pune",
        "state": "Maharashtra",
        "kt": "18KT",
        "goldWeight": 3.1,
        "qty": 1,
        "totalQty": 1,
        "orderValue": 68000,
        "status": "QC_FAILED",
        "assignedVendor": DEMO_VENDOR_NAME,
        "qcRemarks": "Prong stability below standard — rework required.",
        "excelStatus": "Ready For Dispatch",
    },
    {
        "_id": f"{DEMO_ORDER_PREFIX}1005",
        "orderNo": f"{DEMO_ORDER_PREFIX}1005",
        "designNo": "KDM-NEK-5500",
        "style": "Choker Necklace",
        "collection": "Bridal",
        "customerName": "Kisna Store Ahmedabad",
        "city": "Ahmedabad",
        "state": "Gujarat",
        "kt": "22KT",
        "goldWeight": 35.0,
        "qty": 1,
        "totalQty": 1,
        "orderValue": 520000,
        "status": "AWAITING_PAYMENT",
        "assignedVendor": DEMO_VENDOR_NAME,
        "qcPassedDate": datetime.now().strftime("%b %d, %Y"),
        "paymentStatusDaysCount": "DAY 2/7",
        "storeContactNumber": "9876543210",
        "vendorContactNumber": "9876543211",
    },
    {
        "_id": f"{DEMO_ORDER_PREFIX}1006",
        "orderNo": f"{DEMO_ORDER_PREFIX}1006",
        "designNo": "KDM-RNG-2200",
        "style": "Band Ring",
        "collection": "Couple",
        "customerName": "Kisna Store Jaipur",
        "city": "Jaipur",
        "state": "Rajasthan",
        "kt": "18KT",
        "goldWeight": 5.5,
        "qty": 2,
        "totalQty": 2,
        "orderValue": 95000,
        "status": "DISPATCHED",
        "assignedVendor": DEMO_VENDOR_NAME,
        "dispatchDate": datetime.now().strftime("%b %d, %Y, %I:%M %p"),
        "logisticsPartner": "BlueDart Premium",
        "trackingNo": "BD-DEMO-1006",
        "storeContactNumber": "9876543210",
        "vendorContactNumber": "9876543211",
    },
]


@router.get("/vendor-portal")
async def demo_vendor_info():
    db = get_db()
    col = orders_collection(db)
    count = await col.count_documents({
        "_id": {"$regex": f"^{DEMO_ORDER_PREFIX}"},
    })
    return {
        "vendorId": DEMO_VENDOR_ID,
        "vendorName": DEMO_VENDOR_NAME,
        "seeded": count > 0,
        "orderCount": count,
        "workflow": [
            f"{DEMO_ORDER_PREFIX}1001 — Pending vendor acceptance",
            f"{DEMO_ORDER_PREFIX}1002 — In production",
            f"{DEMO_ORDER_PREFIX}1003 — Ready for QC (ops desk)",
            f"{DEMO_ORDER_PREFIX}1004 — QC failed (vendor rework alert)",
            f"{DEMO_ORDER_PREFIX}1005 — Awaiting payment",
            f"{DEMO_ORDER_PREFIX}1006 — Dispatched",
        ],
    }


@router.post("/vendor-portal/seed")
async def seed_demo_vendor_portal():
    db = get_db()
    col = orders_collection(db)
    seeded = []
    for doc in DEMO_ORDERS:
        payload = {**doc, "complexity": DEMO_VENDOR_NAME, "designerName": DEMO_VENDOR_NAME}
        await col.replace_one({"_id": doc["_id"]}, payload, upsert=True)
        seeded.append(excel_to_portal(payload))
    return {
        "ok": True,
        "vendorName": DEMO_VENDOR_NAME,
        "message": f"Seeded {len(seeded)} demo orders for {DEMO_VENDOR_NAME}.",
        "orders": seeded,
    }


@router.delete("/vendor-portal/seed")
async def reset_demo_vendor_portal():
    db = get_db()
    col = orders_collection(db)
    result = await col.delete_many({"_id": {"$regex": f"^{DEMO_ORDER_PREFIX}"}})
    return {
        "ok": True,
        "deleted": result.deleted_count,
        "vendorName": DEMO_VENDOR_NAME,
    }
