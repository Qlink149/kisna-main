"""MongoDB query helpers for excel_orders listing."""

import re
from typing import Any

from app.services.order_mapper import EXCEL_STATUS_TO_PORTAL

ORDER_DOC_FILTER: dict[str, Any] = {"_id": {"$not": {"$regex": "^__"}}}

PORTAL_STATUS_FILTERS: dict[str, dict] = {
    "UNASSIGNED": {
        "$or": [
            {"status": "UNASSIGNED"},
            {"status": {"$exists": False}, "excelStatus": "Pending from Vendor"},
        ]
    },
    "PENDING_VENDOR_REVIEW": {"status": "PENDING_VENDOR_REVIEW"},
    "IN_PRODUCTION": {
        "$or": [
            {"status": {"$in": ["IN_PRODUCTION", "FINISHING"]}},
            {
                "status": {"$exists": False},
                "excelStatus": {"$in": ["God WIP", "GOD WIP", "Inter Store Transfer"]},
            },
        ]
    },
    "READY_FOR_QC": {
        "$or": [
            {"status": {"$in": ["READY_FOR_QC", "QC_IN_REVIEW", "QC_FAILED"]}},
            {"status": {"$exists": False}, "excelStatus": "Ready For Dispatch"},
        ]
    },
    "QC_FAILED": {"status": "QC_FAILED"},
    "AWAITING_PAYMENT": {
        "$or": [
            {"status": {"$in": ["AWAITING_PAYMENT", "PAYMENT_OVERDUE"]}},
        ]
    },
    "DISPATCHED": {"status": "DISPATCHED"},
}


def build_orders_query(
    *,
    search: str | None = None,
    status: str | None = None,
    excel_status: str | None = None,
    state: str | None = None,
    vendor: str | None = None,
) -> dict[str, Any]:
    clauses: list[dict] = [ORDER_DOC_FILTER]

    if status and status in PORTAL_STATUS_FILTERS:
        clauses.append(PORTAL_STATUS_FILTERS[status])
    if excel_status:
        clauses.append({"excelStatus": excel_status})
    if state:
        clauses.append({"state": state})
    if vendor:
        vendor_pattern = re.escape(vendor.strip())
        clauses.append({
            "$or": [
                {"assignedVendor": {"$regex": f"^{vendor_pattern}$", "$options": "i"}},
                {"complexity": {"$regex": f"^{vendor_pattern}$", "$options": "i"}},
                {"designerName": {"$regex": f"^{vendor_pattern}$", "$options": "i"}},
            ]
        })
    if search:
        pattern = re.escape(search.strip())
        clauses.append({
            "$or": [
                {"_id": {"$regex": pattern, "$options": "i"}},
                {"orderNo": {"$regex": pattern, "$options": "i"}},
                {"designNo": {"$regex": pattern, "$options": "i"}},
                {"customerName": {"$regex": pattern, "$options": "i"}},
                {"customerCode": {"$regex": pattern, "$options": "i"}},
                {"city": {"$regex": pattern, "$options": "i"}},
                {"state": {"$regex": pattern, "$options": "i"}},
                {"collection": {"$regex": pattern, "$options": "i"}},
                {"assignedVendor": {"$regex": pattern, "$options": "i"}},
                {"complexity": {"$regex": pattern, "$options": "i"}},
            ]
        })

    if len(clauses) == 1:
        return clauses[0]
    return {"$and": clauses}


def stats_pipeline() -> list[dict]:
    """Aggregate portal status counts from excel_orders."""
    branches = []
    for excel_status, portal_status in EXCEL_STATUS_TO_PORTAL.items():
        branches.append({
            "case": {
                "$and": [
                    {"$or": [{"$eq": ["$status", None]}, {"$not": ["$status"]}]},
                    {"$eq": ["$excelStatus", excel_status]},
                ]
            },
            "then": portal_status,
        })

    return [
        {"$match": ORDER_DOC_FILTER},
        {
            "$addFields": {
                "portalStatus": {
                    "$switch": {
                        "branches": branches,
                        "default": {
                            "$ifNull": ["$status", "IN_PRODUCTION"],
                        },
                    }
                }
            }
        },
        {"$group": {"_id": "$portalStatus", "count": {"$sum": 1}}},
    ]
