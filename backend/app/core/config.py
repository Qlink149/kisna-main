import os
from pydantic_settings import BaseSettings

_env_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", ".env")


class Settings(BaseSettings):
    MONGODB_URL: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "kisna_portal"
    CORS_ORIGINS: list[str] = ["*"]

    GUPSHUP_APP_ID: str = ""
    GUPSHUP_TOKEN: str = ""
    GUPSHUP_API_KEY: str = ""
    GUPSHUP_SOURCE: str = ""
    GUPSHUP_APP_NAME: str = "KisnaOne"
    # Two WhatsApp templates — store (customer) and vendor
    GUPSHUP_STORE_TEMPLATE_ID: str = ""
    GUPSHUP_VENDOR_TEMPLATE_ID: str = ""
    # Legacy aliases (still supported)
    CUSTOMER_NOTIFICATION_TEMPLATE_ID: str = ""
    VENDOR_NOTIFICATION_TEMPLATE_ID: str = ""
    KISNA_DAMAGE_COMPLAINT_FLOW_ID: str = ""

    model_config = {"env_file": _env_file}

    @property
    def gupshup_key(self) -> str:
        return self.GUPSHUP_API_KEY or self.GUPSHUP_TOKEN

    @property
    def store_template_id(self) -> str:
        return self.GUPSHUP_STORE_TEMPLATE_ID or self.CUSTOMER_NOTIFICATION_TEMPLATE_ID

    @property
    def vendor_template_id(self) -> str:
        return (
            self.GUPSHUP_VENDOR_TEMPLATE_ID
            or self.VENDOR_NOTIFICATION_TEMPLATE_ID
            or self.KISNA_DAMAGE_COMPLAINT_FLOW_ID
        )

    def template_for(self, event: str, recipient: str) -> str:
        if recipient == "vendor":
            return self.vendor_template_id
        return self.store_template_id


settings = Settings()
