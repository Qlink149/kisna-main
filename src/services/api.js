const BASE = "/api";

async function request(path, init) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json();
}

function toQuery(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      qs.set(key, String(value));
    }
  });
  const s = qs.toString();
  return s ? `?${s}` : "";
}

export const fetchOrders = (params = {}) =>
  request(`/orders${toQuery(params)}`);

export const fetchOrderStats = () => request("/orders/stats");

export const patchOrder = (id, updates) =>
  request(`/orders/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });

export const fetchVendors = () => request("/vendors/");

export const fetchActivities = () => request("/activities/");

export const postActivity = (payload) =>
  request("/activities/", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const fetchAnalytics = () => request("/analytics/");

export const notifyWhatsApp = (payload) =>
  request("/whatsapp/notify", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const fetchDemoVendorInfo = () => request("/demo/vendor-portal");

export const seedDemoVendorPortal = () =>
  request("/demo/vendor-portal/seed", { method: "POST" });

export const resetDemoVendorPortal = () =>
  request("/demo/vendor-portal/seed", { method: "DELETE" });

export const DEMO_VENDOR_NAME = "Demo Workshop Surat";

export async function downloadOrdersExport(params = {}) {
  const res = await fetch(`${BASE}/orders/export${toQuery(params)}`);
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Export failed: ${text}`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "kisna-orders-export.csv";
  a.click();
  URL.revokeObjectURL(url);
}
