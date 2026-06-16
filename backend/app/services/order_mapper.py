"""Map excel_orders documents to the portal order shape."""

from typing import Any

EXCEL_STATUS_TO_PORTAL: dict[str, str] = {
    "Pending from Vendor": "UNASSIGNED",
    "God WIP": "IN_PRODUCTION",
    "GOD WIP": "IN_PRODUCTION",
    # Excel "Ready For Dispatch" = bureau QC queue (payment only after QC pass in portal)
    "Ready For Dispatch": "READY_FOR_QC",
    "Inter Store Transfer": "IN_PRODUCTION",
}

PRIORITY_KEYWORDS: list[tuple[str, str]] = [
    ("urgent", "URGENT"),
    ("express", "Express"),
    ("high", "High Priority"),
]


def _map_priority(delivery_priority: str | None) -> str:
    if not delivery_priority:
        return "Standard"
    lower = delivery_priority.lower()
    for keyword, level in PRIORITY_KEYWORDS:
        if keyword in lower:
            return level
    return "Standard"


def _portal_status(doc: dict[str, Any]) -> str:
    if doc.get("status"):
        return doc["status"]
    excel_status = doc.get("excelStatus") or ""
    return EXCEL_STATUS_TO_PORTAL.get(excel_status, "IN_PRODUCTION")


def excel_to_portal(doc: dict[str, Any]) -> dict[str, Any]:
    d = dict(doc)
    d["id"] = d.pop("_id")
    d.setdefault("store", d.get("customerName") or d.get("city") or "—")
    d.setdefault("style", d.get("designNo") or "")
    d.setdefault("product", d.get("collection") or d.get("designCategory") or "")
    d["qty"] = int(d.get("qty") or d.get("totalQty") or d.get("balanceQty") or 1)
    d["status"] = _portal_status(d)
    d.setdefault("priority", _map_priority(d.get("deliveryPriority")))
    return d
