from typing import Literal, Any
from pydantic import BaseModel, model_validator


class Vendor(BaseModel):
    id: str
    name: str
    capacity: int
    avatar: str
    status: Literal["Optimal", "Warning", "Overload"]
    tat: str

    @model_validator(mode="before")
    @classmethod
    def remap_mongo_id(cls, data: Any) -> Any:
        if isinstance(data, dict) and "_id" in data and "id" not in data:
            data = dict(data)
            data["id"] = data.pop("_id")
        return data
