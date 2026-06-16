from typing import Literal, Any
from pydantic import BaseModel, model_validator


class ActivityFeedItem(BaseModel):
    id: str
    title: str
    description: str
    time: str
    type: Literal["success", "error", "warning", "info", "primary"]

    @model_validator(mode="before")
    @classmethod
    def remap_mongo_id(cls, data: Any) -> Any:
        if isinstance(data, dict) and "_id" in data and "id" not in data:
            data = dict(data)
            data["id"] = data.pop("_id")
        return data


class ActivityCreate(BaseModel):
    title: str
    description: str
    time: str
    type: Literal["success", "error", "warning", "info", "primary"]
    category: str | None = None
    vendorName: str | None = None
    orderId: str | None = None
