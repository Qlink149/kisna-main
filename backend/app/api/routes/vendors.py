import re
from fastapi import APIRouter
from app.constants import DEMO_VENDOR_ID, DEMO_VENDOR_NAME
from app.core.database import get_db
from app.services.excel_store import orders_collection

router = APIRouter(prefix="/vendors", tags=["vendors"])

SKIP_NAMES = frozenset({"-", "OTHER", "other", "Default Value", ""})


def _slug(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def _vendor_status(capacity: int) -> str:
    if capacity > 90:
        return "Overload"
    if capacity > 70:
        return "Warning"
    return "Optimal"


@router.get("/")
async def list_vendors():
    """Derive vendor network stats from excel_orders (designer + assigned workshop names)."""
    db = get_db()
    col = orders_collection(db)
    total = await col.count_documents({"_id": {"$not": {"$regex": "^__"}}})
    if total == 0:
        return [{
            "id": DEMO_VENDOR_ID,
            "name": DEMO_VENDOR_NAME,
            "capacity": 45,
            "avatar": "",
            "status": "Optimal",
            "tat": "10d",
            "orderCount": 0,
            "isDemo": True,
        }]

    counts: dict[str, dict] = {}

    async for doc in col.find(
        {"_id": {"$not": {"$regex": "^__"}}},
        {"designerName": 1, "assignedVendor": 1, "complexity": 1, "vendorLeadDays": 1},
    ):
        name = doc.get("assignedVendor") or doc.get("complexity") or doc.get("designerName")
        if not name or str(name).strip() in SKIP_NAMES:
            continue
        key = str(name).strip()
        if key not in counts:
            counts[key] = {"orders": 0, "lead_days": []}
        counts[key]["orders"] += 1
        lead = doc.get("vendorLeadDays")
        if isinstance(lead, (int, float)) and lead > 0:
            counts[key]["lead_days"].append(float(lead))

    vendors = []
    for name, stats in sorted(counts.items(), key=lambda x: x[1]["orders"], reverse=True):
        share = stats["orders"] / total
        capacity = min(99, max(5, int(share * 100)))
        lead_days = stats["lead_days"]
        tat = f"{(sum(lead_days) / len(lead_days)):.1f}d" if lead_days else "—"
        vendors.append({
            "id": _slug(name),
            "name": name,
            "capacity": capacity,
            "avatar": "",
            "status": _vendor_status(capacity),
            "tat": tat,
            "orderCount": stats["orders"],
            "isDemo": name == DEMO_VENDOR_NAME,
        })

    if not any(v["name"] == DEMO_VENDOR_NAME for v in vendors):
        demo_count = await col.count_documents({
            "$or": [
                {"assignedVendor": DEMO_VENDOR_NAME},
                {"complexity": DEMO_VENDOR_NAME},
                {"designerName": DEMO_VENDOR_NAME},
            ]
        })
        vendors.insert(0, {
            "id": DEMO_VENDOR_ID,
            "name": DEMO_VENDOR_NAME,
            "capacity": 45,
            "avatar": "",
            "status": "Optimal",
            "tat": "10d",
            "orderCount": demo_count,
            "isDemo": True,
        })

    return vendors
