"""Gupshup WhatsApp messaging."""

import json
import logging
import re
from typing import Any

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

GUPSHUP_TEMPLATE_URL = "https://api.gupshup.io/wa/api/v1/template/msg"
GUPSHUP_TEXT_URL = "https://api.gupshup.io/wa/api/v1/msg"

EVENT_LABELS = {
    "vendor_assign": "New vendor assignment",
    "qc_passed": "QC passed — awaiting payment",
    "qc_failed": "QC failed — rework needed",
    "payment_dispatched": "Payment cleared & dispatched",
    "vendor_reject": "Vendor rejected order",
}

EVENT_MESSAGES = {
    "vendor_assign": (
        "KISNA ONE: Order {order_id} assigned to {vendor_name}. "
        "Expected TAT: {tat_days} days. Design: {design_no}. Customer: {customer}."
    ),
    "qc_passed": (
        "KISNA ONE: Order {order_id} passed QC and is awaiting payment. "
        "Design: {design_no}. Customer: {customer}."
    ),
    "qc_failed": (
        "KISNA ONE: Order {order_id} failed QC. Reason: {remarks}. "
        "Design: {design_no}. Please review and rework."
    ),
    "payment_dispatched": (
        "KISNA ONE: Order {order_id} payment cleared. Dispatched via {logistics}. "
        "Tracking: {tracking_no}."
    ),
    "vendor_reject": (
        "KISNA ONE: Order {order_id} was rejected by vendor {vendor_name} and returned to queue."
    ),
}


def normalize_phone(number: str) -> str:
    digits = re.sub(r"\D", "", number or "")
    if len(digits) == 10:
        return f"91{digits}"
    if digits.startswith("0") and len(digits) == 11:
        return f"91{digits[1:]}"
    return digits


def mask_phone(number: str | None) -> str:
    digits = re.sub(r"\D", "", number or "")
    if not digits:
        return ""
    if len(digits) <= 4:
        return "*" * len(digits)
    return f"{digits[:2]}***{digits[-4:]}"


def _configured() -> bool:
    return bool(settings.gupshup_key and settings.GUPSHUP_SOURCE)


def _config_snapshot() -> dict[str, Any]:
    return {
        "has_key": bool(settings.gupshup_key),
        "has_source": bool(settings.GUPSHUP_SOURCE),
        "app_name": settings.GUPSHUP_APP_NAME,
        "has_store_template": bool(settings.store_template_id),
        "has_vendor_template": bool(settings.vendor_template_id),
        "param_mode": settings.GUPSHUP_TEMPLATE_PARAM_MODE,
    }


def build_message(event: str, context: dict[str, Any]) -> str:
    template = EVENT_MESSAGES.get(event, "KISNA ONE update for order {order_id}.")
    safe = {k: str(v or "—") for k, v in context.items()}
    safe.setdefault("order_id", str(context.get("orderId") or "—"))
    safe.setdefault("vendor_name", str(context.get("vendorName") or "—"))
    safe.setdefault("design_no", str(context.get("designNo") or "—"))
    safe.setdefault("tat_days", str(context.get("tatDays") or "—"))
    safe.setdefault("remarks", str(context.get("remarks") or "—"))
    safe.setdefault("logistics", str(context.get("logistics") or "—"))
    safe.setdefault("tracking_no", str(context.get("trackingNo") or "—"))
    try:
        return template.format(**safe)
    except KeyError:
        return f"KISNA ONE update for order {safe.get('order_id', '—')}."


def build_template_params(event: str, context: dict[str, Any]) -> list[str]:
    if settings.GUPSHUP_TEMPLATE_PARAM_MODE.lower() == "static":
        return []

    order_id = str(context.get("orderId") or context.get("order_id") or "—")
    vendor = str(context.get("vendorName") or context.get("vendor_name") or "—")
    customer = str(context.get("customer") or "—")
    design = str(context.get("designNo") or context.get("design_no") or "—")
    remarks = str(context.get("remarks") or "—")
    label = EVENT_LABELS.get(event, "KISNA ONE update")
    detail = remarks if event == "qc_failed" else (design if design != "—" else vendor)
    return [order_id, label, detail or customer]


def _parse_body(response: httpx.Response) -> Any:
    """Try JSON first regardless of Content-Type, fall back to raw text."""
    try:
        return response.json()
    except Exception:
        return {"raw": response.text}


def _gupshup_error(status_code: int, body: Any) -> str | None:
    """Return an error string if Gupshup indicates failure, else None."""
    if status_code >= 400:
        msg = (body.get("message") or body.get("error") or "") if isinstance(body, dict) else ""
        return msg or f"HTTP {status_code}"
    if isinstance(body, dict) and body.get("status") == "error":
        return body.get("message") or "Gupshup rejected the message"
    return None


async def _send_text(destination: str, text: str) -> dict:
    if not _configured():
        logger.warning("WhatsApp text skipped destination=%s config=%s", mask_phone(destination), _config_snapshot())
        return {"skipped": True, "reason": "Gupshup not configured"}

    payload = {
        "channel": "whatsapp",
        "source": settings.GUPSHUP_SOURCE,
        "destination": destination,
        "src.name": settings.GUPSHUP_APP_NAME,
        "message": json.dumps({"type": "text", "text": text}),
    }
    headers = {
        "apikey": settings.gupshup_key,
        "Content-Type": "application/x-www-form-urlencoded",
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        logger.warning("Gupshup text send start destination=%s", mask_phone(destination))
        response = await client.post(GUPSHUP_TEXT_URL, data=payload, headers=headers)
        body = _parse_body(response)
        err = _gupshup_error(response.status_code, body)
        if err:
            logger.error(
                "Gupshup text error destination=%s status=%s body=%s",
                mask_phone(destination), response.status_code, body,
            )
            return {"ok": False, "status": response.status_code, "body": body, "error": err}
        logger.warning("Gupshup text OK destination=%s status=%s body=%s", mask_phone(destination), response.status_code, body)
        return {"ok": True, "body": body}


async def _send_template(destination: str, template_id: str, params: list[str]) -> dict:
    if not _configured():
        logger.warning(
            "WhatsApp template skipped destination=%s template_present=%s config=%s",
            mask_phone(destination), bool(template_id), _config_snapshot(),
        )
        return {"skipped": True, "reason": "Gupshup not configured"}

    payload = {
        "channel": "whatsapp",
        "source": settings.GUPSHUP_SOURCE,
        "destination": destination,
        "src.name": settings.GUPSHUP_APP_NAME,
        "template": json.dumps({"id": template_id, "params": params}),
    }
    headers = {
        "apikey": settings.gupshup_key,
        "Content-Type": "application/x-www-form-urlencoded",
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        logger.warning(
            "Gupshup template send start destination=%s template=%s params_count=%s config=%s",
            mask_phone(destination), template_id, len(params), _config_snapshot(),
        )
        response = await client.post(GUPSHUP_TEMPLATE_URL, data=payload, headers=headers)
        body = _parse_body(response)
        err = _gupshup_error(response.status_code, body)
        if err:
            logger.error(
                "Gupshup template error destination=%s template=%s status=%s body=%s",
                mask_phone(destination), template_id, response.status_code, body,
            )
            return {"ok": False, "status": response.status_code, "body": body, "error": err}
        logger.warning(
            "Gupshup template OK destination=%s template=%s status=%s body=%s",
            mask_phone(destination), template_id, response.status_code, body,
        )
        return {"ok": True, "body": body}


async def send_to_phone(destination: str, event: str, context: dict[str, Any], recipient: str) -> dict:
    phone = normalize_phone(destination)
    if not phone or len(phone) < 10:
        logger.warning(
            "WhatsApp invalid phone recipient=%s raw=%s normalized=%s",
            recipient, mask_phone(destination), mask_phone(phone),
        )
        return {"ok": False, "error": f"Invalid phone number: {destination!r}"}

    template_id = settings.template_for(event, recipient)
    logger.warning(
        "WhatsApp send_to_phone event=%s recipient=%s phone=%s template_present=%s param_mode=%s",
        event, recipient, mask_phone(phone), bool(template_id), settings.GUPSHUP_TEMPLATE_PARAM_MODE,
    )
    if template_id:
        params = build_template_params(event, context)
        result = await _send_template(phone, template_id, params)
        if result.get("ok"):
            return result
        logger.warning(
            "Template failed phone=%s event=%s error=%s; falling back to text",
            mask_phone(phone), event, result.get("error"),
        )

    text = build_message(event, context)
    return await _send_text(phone, text)


async def notify_event(
    event: str,
    *,
    store_phone: str | None = None,
    vendor_phone: str | None = None,
    context: dict[str, Any],
) -> dict:
    logger.warning(
        "WhatsApp notify_event start event=%s store=%s vendor=%s config=%s",
        event, mask_phone(store_phone), mask_phone(vendor_phone), _config_snapshot(),
    )
    results: dict[str, Any] = {"event": event, "messages": []}
    if store_phone:
        result = await send_to_phone(store_phone, event, context, "store")
        results["messages"].append({"recipient": "store", "phone": normalize_phone(store_phone), **result})
    if vendor_phone:
        result = await send_to_phone(vendor_phone, event, context, "vendor")
        results["messages"].append({"recipient": "vendor", "phone": normalize_phone(vendor_phone), **result})
    if not results["messages"]:
        results["skipped"] = True
        results["reason"] = "No phone numbers provided"
    logger.warning(
        "WhatsApp notify_event done event=%s result_summary=%s",
        event,
        [
            {
                "recipient": message.get("recipient"),
                "phone": mask_phone(message.get("phone")),
                "ok": message.get("ok"),
                "skipped": message.get("skipped"),
                "error": message.get("error"),
            }
            for message in results.get("messages", [])
        ],
    )
    return results
