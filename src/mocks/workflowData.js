/**
 * Mock workflow data for Orders, QC, Bureau, Payment, Dispatch & Vendor Portal.
 * Replace or extend these arrays with your own datasets — home dashboard still uses live MongoDB.
 */

export const DEMO_VENDOR_NAME = "Demo Workshop Surat";
export const DEMO_VENDOR_ID = "demo-workshop-surat";
export const WORKFLOW_ORDER_COUNT = 17;

export function isMockWorkflowOrder(order) {
  const id = String(order?.id ?? order?.orderNo ?? order?._id ?? "");
  return id.startsWith("MOCK-") || id.startsWith("DEMO-KG-");
}

const now = () =>
  new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

function clone(data) {
  return JSON.parse(JSON.stringify(data));
}

export const MOCK_ORDERS = [
  {
    id: "MOCK-1001",
    orderNo: "MOCK-1001",
    designNo: "KDM-RING-4421",
    style: "Solitaire Halo Ring",
    collection: "Bridal",
    customerName: "Kisna Flagship Mumbai",
    store: "Kisna Flagship Mumbai",
    city: "Mumbai",
    state: "Maharashtra",
    kt: "18KT",
    goldWeight: 4.2,
    qty: 1,
    totalQty: 1,
    orderValue: 125000,
    status: "UNASSIGNED",
    priority: "High Priority",
    excelStatus: "Pending from Vendor",
    orderDate: "Jun 10, 2026",
  },
  {
    id: "MOCK-1007",
    orderNo: "MOCK-1007",
    designNo: "KDM-ANK-3140",
    style: "Charm Anklet",
    collection: "Daily Wear",
    customerName: "Kisna Store Indore",
    store: "Kisna Store Indore",
    city: "Indore",
    state: "Madhya Pradesh",
    kt: "18KT",
    goldWeight: 4.8,
    qty: 2,
    totalQty: 2,
    orderValue: 86000,
    status: "UNASSIGNED",
    priority: "Standard",
    excelStatus: "Pending from Vendor",
    orderDate: "Jun 13, 2026",
  },
  {
    id: "MOCK-1008",
    orderNo: "MOCK-1008",
    designNo: "KDM-TOP-2711",
    style: "Floral Tops",
    collection: "Everyday",
    customerName: "Kisna Store Nagpur",
    store: "Kisna Store Nagpur",
    city: "Nagpur",
    state: "Maharashtra",
    kt: "18KT",
    goldWeight: 2.9,
    qty: 4,
    totalQty: 4,
    orderValue: 118000,
    status: "UNASSIGNED",
    priority: "High Priority",
    excelStatus: "Pending from Vendor",
    orderDate: "Jun 14, 2026",
  },
  {
    id: "MOCK-1009",
    orderNo: "MOCK-1009",
    designNo: "KDM-MNG-6024",
    style: "Mangalsutra Chain",
    collection: "Wedding",
    customerName: "Kisna Store Lucknow",
    store: "Kisna Store Lucknow",
    city: "Lucknow",
    state: "Uttar Pradesh",
    kt: "22KT",
    goldWeight: 11.6,
    qty: 1,
    totalQty: 1,
    orderValue: 245000,
    status: "UNASSIGNED",
    priority: "Standard",
    excelStatus: "Pending from Vendor",
    orderDate: "Jun 14, 2026",
  },
  {
    id: "MOCK-1010",
    orderNo: "MOCK-1010",
    designNo: "KDM-NOS-1908",
    style: "Diamond Nose Pin",
    collection: "Essentials",
    customerName: "Kisna Store Kochi",
    store: "Kisna Store Kochi",
    city: "Kochi",
    state: "Kerala",
    kt: "18KT",
    goldWeight: 1.1,
    qty: 5,
    totalQty: 5,
    orderValue: 76000,
    status: "UNASSIGNED",
    priority: "Standard",
    excelStatus: "Pending from Vendor",
    orderDate: "Jun 15, 2026",
  },
  {
    id: "MOCK-1011",
    orderNo: "MOCK-1011",
    designNo: "KDM-BRC-4552",
    style: "Curb Bracelet",
    collection: "Men",
    customerName: "Kisna Store Chandigarh",
    store: "Kisna Store Chandigarh",
    city: "Chandigarh",
    state: "Chandigarh",
    kt: "22KT",
    goldWeight: 16.3,
    qty: 1,
    totalQty: 1,
    orderValue: 305000,
    status: "UNASSIGNED",
    priority: "High Priority",
    excelStatus: "Pending from Vendor",
    orderDate: "Jun 16, 2026",
  },
  {
    id: "MOCK-1002",
    orderNo: "MOCK-1002",
    designNo: "KDM-PEND-8812",
    style: "Temple Pendant",
    collection: "Heritage",
    customerName: "Kisna Store Surat",
    store: "Kisna Store Surat",
    city: "Surat",
    state: "Gujarat",
    kt: "22KT",
    goldWeight: 8.5,
    qty: 2,
    totalQty: 2,
    orderValue: 210000,
    status: "PENDING_VENDOR_REVIEW",
    assignedVendor: DEMO_VENDOR_NAME,
    complexity: DEMO_VENDOR_NAME,
    designerName: DEMO_VENDOR_NAME,
    expectedTatDays: 14,
    priority: "Standard",
    excelStatus: "Pending from Vendor",
    orderDate: "Jun 8, 2026",
  },
  {
    id: "DEMO-KG-1001",
    orderNo: "DEMO-KG-1001",
    designNo: "KDM-RING-4421",
    style: "Solitaire Halo Ring",
    collection: "Bridal",
    customerName: "Kisna Flagship Mumbai",
    store: "Kisna Flagship Mumbai",
    city: "Mumbai",
    state: "Maharashtra",
    kt: "18KT",
    goldWeight: 4.2,
    qty: 1,
    totalQty: 1,
    orderValue: 125000,
    status: "PENDING_VENDOR_REVIEW",
    assignedVendor: DEMO_VENDOR_NAME,
    complexity: DEMO_VENDOR_NAME,
    designerName: DEMO_VENDOR_NAME,
    expectedTatDays: 10,
    priority: "High Priority",
    notes: "Demo assignment — accept this order to test vendor workflow.",
    storeContactNumber: "9876543210",
    vendorContactNumber: "9876543211",
    excelStatus: "Pending from Vendor",
  },
  {
    id: "DEMO-KG-1002",
    orderNo: "DEMO-KG-1002",
    designNo: "KDM-PEND-8812",
    style: "Temple Pendant",
    collection: "Heritage",
    customerName: "Kisna Store Surat",
    store: "Kisna Store Surat",
    city: "Surat",
    state: "Gujarat",
    kt: "22KT",
    goldWeight: 8.5,
    qty: 2,
    totalQty: 2,
    orderValue: 210000,
    status: "IN_PRODUCTION",
    assignedVendor: DEMO_VENDOR_NAME,
    complexity: DEMO_VENDOR_NAME,
    designerName: DEMO_VENDOR_NAME,
    expectedTatDays: 14,
    assignedDatApproved: now(),
    excelStatus: "God WIP",
  },
  {
    id: "MOCK-1003",
    orderNo: "MOCK-1003",
    designNo: "KDM-BRC-2200",
    style: "Classic Bangle",
    collection: "Daily Wear",
    customerName: "Kisna Store Bangalore",
    store: "Kisna Store Bangalore",
    city: "Bangalore",
    state: "Karnataka",
    kt: "22KT",
    goldWeight: 18.0,
    qty: 1,
    totalQty: 1,
    orderValue: 295000,
    status: "IN_PRODUCTION",
    assignedVendor: "Taash Polish House",
    complexity: "Taash Polish House",
    expectedTatDays: 12,
    excelStatus: "God WIP",
  },
  {
    id: "DEMO-KG-1003",
    orderNo: "DEMO-KG-1003",
    designNo: "KDM-BRC-3301",
    style: "Kada Bracelet",
    collection: "Men",
    customerName: "Kisna Store Delhi",
    store: "Kisna Store Delhi",
    city: "Delhi",
    state: "Delhi",
    kt: "22KT",
    goldWeight: 22.0,
    qty: 1,
    totalQty: 1,
    orderValue: 380000,
    status: "READY_FOR_QC",
    assignedVendor: DEMO_VENDOR_NAME,
    complexity: DEMO_VENDOR_NAME,
    designerName: DEMO_VENDOR_NAME,
    dateCompleted: now(),
    excelStatus: "Ready For Dispatch",
  },
  {
    id: "MOCK-1004",
    orderNo: "MOCK-1004",
    designNo: "KDM-NEK-1100",
    style: "Layered Necklace",
    collection: "Bridal",
    customerName: "Kisna Store Chennai",
    store: "Kisna Store Chennai",
    city: "Chennai",
    state: "Tamil Nadu",
    kt: "18KT",
    goldWeight: 12.4,
    qty: 1,
    totalQty: 1,
    orderValue: 178000,
    status: "QC_IN_REVIEW",
    assignedVendor: "Heritage Casting Co.",
    complexity: "Heritage Casting Co.",
    excelStatus: "Ready For Dispatch",
  },
  {
    id: "DEMO-KG-1004",
    orderNo: "DEMO-KG-1004",
    designNo: "KDM-ERR-9901",
    style: "Stud Earrings",
    collection: "Daily Wear",
    customerName: "Kisna Store Pune",
    store: "Kisna Store Pune",
    city: "Pune",
    state: "Maharashtra",
    kt: "18KT",
    goldWeight: 3.1,
    qty: 1,
    totalQty: 1,
    orderValue: 68000,
    status: "QC_FAILED",
    assignedVendor: DEMO_VENDOR_NAME,
    complexity: DEMO_VENDOR_NAME,
    designerName: DEMO_VENDOR_NAME,
    qcRemarks: "Prong stability below standard — rework required.",
    excelStatus: "Ready For Dispatch",
  },
  {
    id: "DEMO-KG-1005",
    orderNo: "DEMO-KG-1005",
    designNo: "KDM-NEK-5500",
    style: "Choker Necklace",
    collection: "Bridal",
    customerName: "Kisna Store Ahmedabad",
    store: "Kisna Store Ahmedabad",
    city: "Ahmedabad",
    state: "Gujarat",
    kt: "22KT",
    goldWeight: 35.0,
    qty: 1,
    totalQty: 1,
    orderValue: 520000,
    status: "AWAITING_PAYMENT",
    assignedVendor: DEMO_VENDOR_NAME,
    complexity: DEMO_VENDOR_NAME,
    designerName: DEMO_VENDOR_NAME,
    qcPassedDate: now(),
    paymentStatusDaysCount: "DAY 2/7",
    storeContactNumber: "9876543210",
    vendorContactNumber: "9876543211",
  },
  {
    id: "MOCK-1005",
    orderNo: "MOCK-1005",
    designNo: "KDM-RNG-7700",
    style: "Cocktail Ring",
    collection: "Occasion",
    customerName: "Kisna Store Kolkata",
    store: "Kisna Store Kolkata",
    city: "Kolkata",
    state: "West Bengal",
    kt: "18KT",
    goldWeight: 6.8,
    qty: 1,
    totalQty: 1,
    orderValue: 142000,
    status: "PAYMENT_OVERDUE",
    assignedVendor: "Surat Fine Jewels",
    complexity: "Surat Fine Jewels",
    paymentStatusDaysCount: "DAY 9/7",
    qcPassedDate: "Jun 1, 2026",
  },
  {
    id: "DEMO-KG-1006",
    orderNo: "DEMO-KG-1006",
    designNo: "KDM-RNG-2200",
    style: "Band Ring",
    collection: "Couple",
    customerName: "Kisna Store Jaipur",
    store: "Kisna Store Jaipur",
    city: "Jaipur",
    state: "Rajasthan",
    kt: "18KT",
    goldWeight: 5.5,
    qty: 2,
    totalQty: 2,
    orderValue: 95000,
    status: "DISPATCHED",
    assignedVendor: DEMO_VENDOR_NAME,
    complexity: DEMO_VENDOR_NAME,
    designerName: DEMO_VENDOR_NAME,
    dispatchDate: new Date().toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }),
    logisticsPartner: "BlueDart Premium",
    trackingNo: "BD-DEMO-1006",
    storeContactNumber: "9876543210",
    vendorContactNumber: "9876543211",
  },
  {
    id: "MOCK-1006",
    orderNo: "MOCK-1006",
    designNo: "KDM-CHN-4400",
    style: "Rope Chain",
    collection: "Daily Wear",
    customerName: "Kisna Store Hyderabad",
    store: "Kisna Store Hyderabad",
    city: "Hyderabad",
    state: "Telangana",
    kt: "22KT",
    goldWeight: 9.2,
    qty: 3,
    totalQty: 3,
    orderValue: 168000,
    status: "DISPATCHED",
    assignedVendor: "Taash Polish House",
    complexity: "Taash Polish House",
    dispatchDate: "Jun 12, 2026",
    logisticsPartner: "DTDC Express",
    trackingNo: "DTDC-MOCK-4400",
  },
];

export const MOCK_VENDORS = [
  {
    id: DEMO_VENDOR_ID,
    name: DEMO_VENDOR_NAME,
    capacity: 45,
    avatar: "",
    status: "Optimal",
    tat: "10d",
    orderCount: 6,
    isDemo: true,
  },
  {
    id: "taash-polish-house",
    name: "Taash Polish House",
    capacity: 62,
    avatar: "",
    status: "Optimal",
    tat: "12d",
    orderCount: 2,
    isDemo: false,
  },
  {
    id: "heritage-casting-co",
    name: "Heritage Casting Co.",
    capacity: 38,
    avatar: "",
    status: "Optimal",
    tat: "14d",
    orderCount: 1,
    isDemo: false,
  },
  {
    id: "surat-fine-jewels",
    name: "Surat Fine Jewels",
    capacity: 71,
    avatar: "",
    status: "Warning",
    tat: "11d",
    orderCount: 1,
    isDemo: false,
  },
];

export const MOCK_ACTIVITIES = [
  {
    id: "mock-act-1",
    title: "Order DEMO-KG-1003 — Ready For Dispatch",
    description: "Kisna Store Delhi · Demo Workshop Surat",
    time: "10:42 AM",
    type: "warning",
    category: "QC",
  },
  {
    id: "mock-act-2",
    title: "Order DEMO-KG-1005 — Awaiting payment clearance",
    description: "Kisna Store Ahmedabad · Demo Workshop Surat",
    time: "09:15 AM",
    type: "info",
    category: "Payment",
  },
  {
    id: "mock-act-3",
    title: "Order MOCK-1001 — Pending vendor assignment",
    description: "Kisna Flagship Mumbai · Unassigned",
    time: "08:30 AM",
    type: "info",
    category: "Assignment",
  },
  {
    id: "mock-act-4",
    title: "Order DEMO-KG-1006 — Dispatched via BlueDart",
    description: "Kisna Store Jaipur · Tracking BD-DEMO-1006",
    time: "Yesterday",
    type: "success",
    category: "Dispatch",
  },
  {
    id: "mock-act-5",
    title: "Order DEMO-KG-1002 — In production at workshop",
    description: "Kisna Store Surat · Demo Workshop Surat",
    time: "Yesterday",
    type: "primary",
    category: "Production",
  },
];

export function computeOrderStats(orders) {
  const byStatus = {};
  for (const o of orders) {
    const s = o.status || "IN_PRODUCTION";
    byStatus[s] = (byStatus[s] || 0) + 1;
  }
  const count = (...statuses) => statuses.reduce((sum, s) => sum + (byStatus[s] || 0), 0);
  return {
    total: orders.length,
    unassigned: count("UNASSIGNED"),
    pendingVendorReview: count("PENDING_VENDOR_REVIEW"),
    inProduction: count("IN_PRODUCTION", "FINISHING"),
    pendingQC: count("READY_FOR_QC", "QC_IN_REVIEW", "QC_FAILED"),
    awaitingPayment: count("AWAITING_PAYMENT", "PAYMENT_OVERDUE"),
    dispatched: count("DISPATCHED"),
    byStatus,
  };
}

function matchesStatus(order, status) {
  if (!status) return true;
  const s = order.status || "IN_PRODUCTION";
  const map = {
    UNASSIGNED: ["UNASSIGNED"],
    PENDING_VENDOR_REVIEW: ["PENDING_VENDOR_REVIEW"],
    IN_PRODUCTION: ["IN_PRODUCTION", "FINISHING"],
    READY_FOR_QC: ["READY_FOR_QC", "QC_IN_REVIEW", "QC_FAILED"],
    QC_FAILED: ["QC_FAILED"],
    AWAITING_PAYMENT: ["AWAITING_PAYMENT", "PAYMENT_OVERDUE"],
    DISPATCHED: ["DISPATCHED"],
  };
  return (map[status] || [status]).includes(s);
}

export function filterWorkflowOrders(orders, filters = {}) {
  const { search, status, excelStatus, state, vendor, page = 1, limit = 50 } = filters;
  let list = [...orders];

  if (status) list = list.filter((o) => matchesStatus(o, status));
  if (excelStatus) list = list.filter((o) => o.excelStatus === excelStatus);
  if (state) list = list.filter((o) => o.state === state);
  if (vendor) {
    const v = vendor.trim().toLowerCase();
    list = list.filter(
      (o) =>
        (o.assignedVendor || "").toLowerCase() === v ||
        (o.complexity || "").toLowerCase() === v ||
        (o.designerName || "").toLowerCase() === v
    );
  }
  if (search?.trim()) {
    const q = search.trim().toLowerCase();
    list = list.filter((o) =>
      [
        o.id,
        o.orderNo,
        o.designNo,
        o.customerName,
        o.city,
        o.state,
        o.collection,
        o.assignedVendor,
        o.complexity,
        o.style,
      ]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q))
    );
  }

  const total = list.length;
  const pages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;
  const items = list.slice(start, start + limit);

  return { items, total, page, limit, pages };
}

export function getInitialWorkflowState() {
  const orders = clone(MOCK_ORDERS);
  return {
    orders,
    vendors: clone(MOCK_VENDORS),
    activities: clone(MOCK_ACTIVITIES),
    orderStats: computeOrderStats(orders),
  };
}

export function resetWorkflowState() {
  return getInitialWorkflowState();
}
