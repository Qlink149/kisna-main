from enum import Enum
from typing import Optional, Any
from pydantic import BaseModel, model_validator


class OrderStatus(str, Enum):
    UNASSIGNED = "UNASSIGNED"
    PENDING_VENDOR_REVIEW = "PENDING_VENDOR_REVIEW"
    REJECTED_BY_VENDOR = "REJECTED_BY_VENDOR"
    IN_PRODUCTION = "IN_PRODUCTION"
    FINISHING = "FINISHING"
    READY_FOR_QC = "READY_FOR_QC"
    QC_IN_REVIEW = "QC_IN_REVIEW"
    QC_FAILED = "QC_FAILED"
    AWAITING_PAYMENT = "AWAITING_PAYMENT"
    PAYMENT_OVERDUE = "PAYMENT_OVERDUE"
    DISPATCHED = "DISPATCHED"
    COMPLETED_ARCHIVED = "COMPLETED_ARCHIVED"


class PriorityLevel(str, Enum):
    STANDARD = "Standard"
    HIGH = "High Priority"
    EXPRESS = "Express"
    URGENT = "URGENT"


class QCChecklist(BaseModel):
    finishPolishing: bool = False
    weightVerification: bool = False
    hallmarkingCheck: bool = False
    prongStability: bool = False


class Order(BaseModel):
    id: str
    store: str
    style: str
    product: str
    qty: int
    orderType: Optional[str] = None
    orderDate: Optional[str] = None
    designNo: Optional[str] = None
    bagNo: Optional[str] = None
    designCategory: Optional[str] = None
    goldWeight: Optional[float] = None
    extraWeight: Optional[float] = None
    suffix: Optional[str] = None
    size: Optional[str] = None
    kt: Optional[str] = None
    color: Optional[str] = None
    customerName: Optional[str] = None
    customerCode: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    salePerson: Optional[str] = None
    customerType: Optional[str] = None
    mrpRate: Optional[float] = None
    dpRate: Optional[float] = None
    totalQty: Optional[int] = None
    saleQty: Optional[int] = None
    balanceQty: Optional[int] = None
    orderValue: Optional[float] = None
    totalDpRate: Optional[float] = None
    totalDpRateWithGst: Optional[float] = None
    designInstructions: Optional[str] = None
    customerInstructions: Optional[str] = None
    stampInstructions: Optional[str] = None
    sizeInstructions: Optional[str] = None
    designerName: Optional[str] = None
    cadName: Optional[str] = None
    collection: Optional[str] = None
    deliveryPriority: Optional[str] = None
    goldPureRate: Optional[float] = None
    complexity: Optional[str] = None
    complexityPercent: Optional[float] = None
    vendorLeadDays: Optional[int] = None
    vendorPlacingDate: Optional[str] = None
    excelStatus: Optional[str] = None
    expectedDeliveryDate: Optional[str] = None
    dateApproved: Optional[str] = None
    dateCompleted: Optional[str] = None
    dispatchDate: Optional[str] = None
    assignedVendor: Optional[str] = None
    storeContactNumber: Optional[str] = None
    vendorContactNumber: Optional[str] = None
    expectedTatDays: Optional[int] = None
    priority: PriorityLevel
    status: OrderStatus
    qcChecklist: Optional[QCChecklist] = None
    qcRemarks: Optional[str] = None
    qcCheckedDate: Optional[str] = None
    assignedDatApproved: Optional[str] = None
    paymentRemindersCount: Optional[int] = None
    paymentStatusDaysCount: Optional[str] = None
    logisticsPartner: Optional[str] = None
    trackingNo: Optional[str] = None
    qcPassedDate: Optional[str] = None
    image: Optional[str] = None
    notes: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def remap_mongo_id(cls, data: Any) -> Any:
        if isinstance(data, dict) and "_id" in data and "id" not in data:
            data = dict(data)
            data["id"] = data.pop("_id")
        return data


class OrderUpdate(BaseModel):
    store: Optional[str] = None
    style: Optional[str] = None
    product: Optional[str] = None
    qty: Optional[int] = None
    orderType: Optional[str] = None
    orderDate: Optional[str] = None
    designNo: Optional[str] = None
    bagNo: Optional[str] = None
    designCategory: Optional[str] = None
    goldWeight: Optional[float] = None
    extraWeight: Optional[float] = None
    suffix: Optional[str] = None
    size: Optional[str] = None
    kt: Optional[str] = None
    color: Optional[str] = None
    customerName: Optional[str] = None
    customerCode: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    salePerson: Optional[str] = None
    customerType: Optional[str] = None
    mrpRate: Optional[float] = None
    dpRate: Optional[float] = None
    totalQty: Optional[int] = None
    saleQty: Optional[int] = None
    balanceQty: Optional[int] = None
    orderValue: Optional[float] = None
    totalDpRate: Optional[float] = None
    totalDpRateWithGst: Optional[float] = None
    designInstructions: Optional[str] = None
    customerInstructions: Optional[str] = None
    stampInstructions: Optional[str] = None
    sizeInstructions: Optional[str] = None
    designerName: Optional[str] = None
    cadName: Optional[str] = None
    collection: Optional[str] = None
    deliveryPriority: Optional[str] = None
    goldPureRate: Optional[float] = None
    complexity: Optional[str] = None
    complexityPercent: Optional[float] = None
    vendorLeadDays: Optional[int] = None
    vendorPlacingDate: Optional[str] = None
    excelStatus: Optional[str] = None
    expectedDeliveryDate: Optional[str] = None
    dateApproved: Optional[str] = None
    dateCompleted: Optional[str] = None
    dispatchDate: Optional[str] = None
    assignedVendor: Optional[str] = None
    storeContactNumber: Optional[str] = None
    vendorContactNumber: Optional[str] = None
    expectedTatDays: Optional[int] = None
    priority: Optional[PriorityLevel] = None
    status: Optional[OrderStatus] = None
    qcChecklist: Optional[QCChecklist] = None
    qcRemarks: Optional[str] = None
    qcCheckedDate: Optional[str] = None
    assignedDatApproved: Optional[str] = None
    paymentRemindersCount: Optional[int] = None
    paymentStatusDaysCount: Optional[str] = None
    logisticsPartner: Optional[str] = None
    trackingNo: Optional[str] = None
    qcPassedDate: Optional[str] = None
    image: Optional[str] = None
    notes: Optional[str] = None
