from fastapi import APIRouter
from pydantic import BaseModel

from app.services.whatsapp import notify_event

router = APIRouter(prefix="/whatsapp", tags=["whatsapp"])


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
    context = payload.model_dump()
    return await notify_event(
        payload.event,
        store_phone=payload.storePhone,
        vendor_phone=payload.vendorPhone,
        context=context,
    )
