"""Single source of truth: all app data lives in excel_orders."""

META_ACTIVITY_ID = "__kisna_activity_feed__"


def orders_collection(db):
    return db.excel_orders
