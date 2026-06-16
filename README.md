# Kisna One — Jewelry Operations & Vendor Portal

React frontend with a FastAPI backend. **All data is served from a single MongoDB collection: `excel_orders`.**

## Prerequisites

- Node.js 18+
- Python 3.11+
- MongoDB Atlas (or local MongoDB)

## Run locally

**Terminal 1 — Backend**

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env   # set MONGODB_URL
python -m uvicorn app.main:app --port 8080
```

**Terminal 2 — Frontend**

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## MongoDB — single collection

| Collection | Purpose |
|------------|---------|
| `excel_orders` | Orders, analytics, vendor stats, and activity feed (all derived from Excel import) |

Legacy collections (`orders`, `vendors`, `activities`) are removed automatically on API startup.

Order data is loaded directly from the `excel_orders` collection in MongoDB Atlas.

## Deploy

Set `MONGODB_URL` and `DATABASE_NAME` in your deployment environment (see `backend/.env.example`).
