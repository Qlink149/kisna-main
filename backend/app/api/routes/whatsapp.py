import logging

from fastapi import APIRouter
from pydantic import BaseModel

from app.services.whatsapp import mask_phone, notify_event

router = APIRouter(prefix="/whatsapp", tags=["whatsapp"])
logger = logging.getLogger(__name__)


class WhatsAppNotifyRequest(BaseModel):
    event: str
    orderId: str
    storePhone: str | None = None
    vendorPhone: str | None = None
    vendorName: str | None = None
    customer: str | None = None
    designNo: str | None = None
    tatDays: int | None = None
    remarks: str | None = None
    logistics: str | None = None
    trackingNo: str | None = None


@router.post("/notify")
async def send_notification(payload: WhatsAppNotifyRequest):
    logger.info(
        "WhatsApp notify request event=%s order=%s store=%s vendor=%s",
        payload.event,
        payload.orderId,
        mask_phone(payload.storePhone),
        mask_phone(payload.vendorPhone),
    )
    context = payload.model_dump()
    result = await notify_event(
        payload.event,
        store_phone=payload.storePhone,
        vendor_phone=payload.vendorPhone,
        context=context,
    )
    logger.info(
        "WhatsApp notify response event=%s order=%s messages=%s skipped=%s reason=%s",
        payload.event,
        payload.orderId,
        [
            {
                "recipient": message.get("recipient"),
                "phone": mask_phone(message.get("phone")),
                "ok": message.get("ok"),
                "skipped": message.get("skipped"),
                "error": message.get("error"),
                "provider_status": message.get("body", {}).get("status")
                if isinstance(message.get("body"), dict)
                else None,
            }
            for message in result.get("messages", [])
        ],
        result.get("skipped"),
        result.get("reason"),
    )
    return result
