import React, { useState, useEffect, useMemo, useRef } from "react";
import { OrderStatus, PriorityLevel } from "../types.js";
import {
  Bell, Search, Settings, Filter, Download,
  CheckCircle2, XCircle, X, Truck, ArrowRight
} from "lucide-react";
import AnalyticsDashboard from "./AnalyticsDashboard.jsx";
import NotificationPanel, { NotificationBell, categorizeNotification } from "./NotificationPanel.jsx";
import { fetchAnalytics, fetchOrders, notifyWhatsApp, downloadOrdersExport, DEMO_VENDOR_NAME } from "../services/api.js";


export default function OperationsPortal({
  orders,
  orderStats = {},
  ordersMeta = { total: 0, page: 1, pages: 1, limit: 50 },
  orderFilters = {},
  onOrderFiltersChange,
  activities,
  vendors,
  setOrders,
  addActivity,
  onRefreshActivities,
  onRefreshOrders,
  tab,
  setTab,
  onSwitchToVendorPortal,
  onOpenDemoVendorPortal,
}) {
  // Filters & State
  const [searchQuery, setSearchQuery] = useState(orderFilters.search || "");
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unseenCount, setUnseenCount] = useState(0);
  const [alertToast, setAlertToast] = useState({ message: "", sub: "", visible: false });
  const latestActivityIdRef = useRef(null);

  // Vendor Assignment Selection State
  const [assigningOrder, setAssigningOrder] = useState(null);
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [expectedTatDays, setExpectedTatDays] = useState(14);
  const [priorityLevel, setPriorityLevel] = useState(PriorityLevel.STANDARD);
  const [assignmentNotes, setAssignmentNotes] = useState("");
  const [assignmentStoreNumber, setAssignmentStoreNumber] = useState("");
  const [assignmentVendorNumber, setAssignmentVendorNumber] = useState("");

  // QC Side Drawer Panel State
  const [reviewingOrder, setReviewingOrder] = useState(null);
  const [qcChecklist, setQcChecklist] = useState({
    finishPolishing: false,
    weightVerification: false,
    hallmarkingCheck: false,
    prongStability: false,
  });
  const [remarks, setRemarks] = useState("");
  const [qcStoreNumber, setQcStoreNumber] = useState("");
  const [qcVendorNumber, setQcVendorNumber] = useState("");

  const [dispatchedOrders, setDispatchedOrders] = useState([]);
  const [paymentPendingOrders, setPaymentPendingOrders] = useState([]);
  const [paymentConfirmOrder, setPaymentConfirmOrder] = useState(null);
  const [paymentStoreNumber, setPaymentStoreNumber] = useState("");
  const [paymentVendorNumber, setPaymentVendorNumber] = useState("");

  const loadPaymentTabOrders = () => {
    Promise.all([
      fetchOrders({ status: "AWAITING_PAYMENT", limit: 100, page: 1 }),
      fetchOrders({ status: "PAYMENT_OVERDUE", limit: 100, page: 1 }),
      fetchOrders({ status: "DISPATCHED", limit: 100, page: 1 }),
    ])
      .then(([awaiting, overdue, dispatched]) => {
        setPaymentPendingOrders([...awaiting.items, ...overdue.items]);
        setDispatchedOrders(dispatched.items);
      })
      .catch(() => {
        setPaymentPendingOrders([]);
        setDispatchedOrders([]);
      });
  };

  // Analytics data for AI insights
  const [analyticsData, setAnalyticsData] = useState(null);
  useEffect(() => {
    fetchAnalytics().then(setAnalyticsData).catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if ((orderFilters.search || "") !== searchQuery) {
        onOrderFiltersChange?.({ ...orderFilters, search: searchQuery, page: 1 });
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const applyFilters = (patch) => {
    onOrderFiltersChange?.({ ...orderFilters, ...patch, page: 1 });
  };

  const goToPage = (page) => {
    onOrderFiltersChange?.({ ...orderFilters, page });
  };

  const renderPaginationFooter = () => (
    <div className="p-4 bg-[#EFF4FF] border-t border-[#C6C6CF]/25 flex flex-wrap gap-3 justify-between items-center text-xs text-[#76767F] font-semibold">
      <span>
        Showing {ordersMeta.total === 0 ? 0 : (ordersMeta.page - 1) * ordersMeta.limit + 1}–
        {Math.min(ordersMeta.page * ordersMeta.limit, ordersMeta.total)} of {ordersMeta.total.toLocaleString("en-IN")} orders
      </span>
      <div className="flex gap-1.5 items-center">
        <button
          type="button"
          className="px-2 py-1 bg-white border border-[#C6C6CF]/20 rounded hover:bg-slate-50 disabled:opacity-40"
          disabled={ordersMeta.page <= 1}
          onClick={() => goToPage(ordersMeta.page - 1)}
        >
          Prev
        </button>
        <span className="px-2">Page {ordersMeta.page} / {ordersMeta.pages}</span>
        <button
          type="button"
          className="px-2 py-1 bg-white border border-[#C6C6CF]/20 rounded hover:bg-slate-50 disabled:opacity-40"
          disabled={ordersMeta.page >= ordersMeta.pages}
          onClick={() => goToPage(ordersMeta.page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );

  const handleExport = async (extra = {}) => {
    setExporting(true);
    try {
      await downloadOrdersExport({
        search: orderFilters.search,
        status: orderFilters.status,
        excelStatus: orderFilters.excelStatus,
        state: orderFilters.state,
        ...extra,
      });
      showToast(`Exported orders to CSV.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const sendWhatsApp = (event, order, phones, extra = {}) => {
    const store = phones?.store?.trim();
    const vendor = phones?.vendor?.trim();
    if (!store && !vendor) {
      showToast("Enter store and/or vendor WhatsApp numbers to send notifications.");
      return Promise.resolve();
    }

    return notifyWhatsApp({
      event,
      orderId: order?.id || order?.orderNo,
      storePhone: store,
      vendorPhone: vendor,
      customer: order?.customerName || order?.store,
      designNo: order?.designNo || order?.style,
      ...extra,
    })
      .then((res) => {
        if (res.skipped) {
          const reason = res.reason || "Gupshup not configured";
          showToast(
            reason.includes("configured")
              ? "WhatsApp not configured — add GUPSHUP_API_KEY, GUPSHUP_SOURCE and template IDs in backend/.env"
              : reason
          );
          return;
        }
        const sent = (res.messages || []).filter((m) => m.ok);
        const failed = (res.messages || []).filter((m) => m.ok === false);
        if (sent.length) {
          const targets = sent.map((m) => `${m.recipient} (${m.phone})`).join(", ");
          showToast(`WhatsApp sent to ${targets}.`);
        }
        if (failed.length) {
          const detail = failed.map((m) => `${m.recipient}: ${m.error || m.body?.message || "failed"}`).join("; ");
          showToast(`WhatsApp failed - ${detail}`);
        }
      })
      .catch((err) => showToast(err instanceof Error ? err.message : "WhatsApp notification could not be sent."));
  };

  // Success Notification Dialog/Toast
  const [toast, setToast] = useState({ message: "", visible: false });

  const showToast = (message) => {
    setToast({ message, visible: true });
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 4000);
  };

  const showAlertToast = (message, sub = "") => {
    setAlertToast({ message, sub, visible: true });
    setTimeout(() => {
      setAlertToast(prev => ({ ...prev, visible: false }));
    }, 6000);
  };

  const openAssignmentModal = (order) => {
    setAssigningOrder(order);
    setAssignmentStoreNumber(order.storeContactNumber || order.customerPhone || "");
    setAssignmentVendorNumber(order.vendorContactNumber || "");
  };

  const openQCReviewDrawer = (order) => {
    setReviewingOrder(order);
    setQcStoreNumber(order.storeContactNumber || order.customerPhone || "");
    setQcVendorNumber(order.vendorContactNumber || "");
  };

  // Handlers
  const handleAssignVendorSubmit = () => {
    if (!assigningOrder || !selectedVendorId) return;
    if (!assignmentStoreNumber || !assignmentVendorNumber) {
      showToast("Enter store and vendor WhatsApp numbers before assignment.");
      return;
    }

    const vendor = vendors.find(v => v.id === selectedVendorId);
    if (!vendor) return;

    setOrders(prevOrders => 
      prevOrders.map(order => 
        order.id === assigningOrder.id
          ? {
              ...order,
              status: OrderStatus.PENDING_VENDOR_REVIEW,
              assignedVendor: vendor.name,
              storeContactNumber: assignmentStoreNumber,
              vendorContactNumber: assignmentVendorNumber,
              expectedTatDays,
              priority: priorityLevel,
              notes: assignmentNotes,
              dateApproved: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
            }
          : order
      )
    );

    sendWhatsApp("vendor_assign", assigningOrder, {
      store: assignmentStoreNumber,
      vendor: assignmentVendorNumber,
    }, {
      vendorName: vendor.name,
      tatDays: expectedTatDays,
      remarks: assignmentNotes,
    });

    addActivity(
      `Order ${assigningOrder.id} Assigned`,
      `Assigned to ${vendor.name} with ${expectedTatDays} days expected turnaround. Gupshup assignment template queued to store ${assignmentStoreNumber || "N/A"} and vendor ${assignmentVendorNumber || "N/A"}.`,
      "primary",
      { category: "Assignment", vendorName: vendor.name, orderId: assigningOrder.id }
    );

    showToast(`Order ${assigningOrder.id} assigned to ${vendor.name}. Opening vendor portal…`);
    onSwitchToVendorPortal?.(vendor.name, "dashboard");
    setAssigningOrder(null);
    setSelectedVendorId("");
    setExpectedTatDays(14);
    setPriorityLevel(PriorityLevel.STANDARD);
    setAssignmentNotes("");
    setAssignmentStoreNumber("");
    setAssignmentVendorNumber("");
  };

  const handleQCPass = (orderId) => {
    const order = orders.find((o) => o.id === orderId);
    const storePhone = qcStoreNumber || order?.storeContactNumber || order?.customerPhone || "";
    const vendorPhone = qcVendorNumber || order?.vendorContactNumber || "";
    if (!storePhone && !vendorPhone) {
      showToast("Enter store and/or vendor WhatsApp numbers before marking QC passed.");
      return;
    }

    setOrders(prevOrders => 
      prevOrders.map(order => 
        order.id === orderId
          ? {
              ...order,
              status: OrderStatus.AWAITING_PAYMENT,
              qcChecklist: { ...qcChecklist },
              qcRemarks: remarks,
              storeContactNumber: storePhone,
              vendorContactNumber: vendorPhone,
              qcPassedDate: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
              paymentStatusDaysCount: "DAY 1/7"
            }
          : order
      )
    );

    sendWhatsApp("qc_passed", order || { id: orderId }, {
      store: storePhone,
      vendor: vendorPhone,
    }, { vendorName: order?.assignedVendor || order?.complexity || "" });

    addActivity(
      `QC Passed: ${orderId}`,
      `Order passed QC — now awaiting payment. Vendor: ${order?.assignedVendor || order?.complexity || "Workshop"}. WhatsApp sent to store ${storePhone || "N/A"} and vendor ${vendorPhone || "N/A"}.`,
      "success",
      { category: "QC", vendorName: order?.assignedVendor || order?.complexity || "", orderId }
    );

    showToast(`Order ${orderId} passed QC. Moved to Payment & Dispatch. WhatsApp queued.`);
    loadPaymentTabOrders();
    onRefreshOrders?.();
    setReviewingOrder(null);
    setQcStoreNumber("");
    setQcVendorNumber("");
  };

  const handleQCFail = (orderId) => {
    const order = orders.find((o) => o.id === orderId);
    const storePhone = qcStoreNumber || order?.storeContactNumber || order?.customerPhone || "";
    const vendorPhone = qcVendorNumber || order?.vendorContactNumber || "";
    if (!storePhone && !vendorPhone) {
      showToast("Enter store and/or vendor WhatsApp numbers before flagging audit failed.");
      return;
    }

    setOrders(prevOrders => 
      prevOrders.map(order => 
        order.id === orderId
          ? {
              ...order,
              status: OrderStatus.QC_FAILED,
              qcChecklist: { ...qcChecklist },
              qcRemarks: remarks,
              storeContactNumber: storePhone,
              vendorContactNumber: vendorPhone
            }
          : order
      )
    );

    sendWhatsApp("qc_failed", order || { id: orderId }, {
      store: storePhone,
      vendor: vendorPhone,
    }, {
      remarks: remarks || "Unspecified quality check failure",
      vendorName: order?.assignedVendor || order?.complexity || "",
    });

    addActivity(
      `QC FAILED: ${orderId}`,
      `Flagged for review. Vendor: ${order?.assignedVendor || order?.complexity || "Workshop"}. Reason: ${remarks || "Unspecified quality check failure"}. WhatsApp sent to store ${storePhone || "N/A"} and vendor ${vendorPhone || "N/A"}.`,
      "error",
      { category: "QC", vendorName: order?.assignedVendor || order?.complexity || "", orderId }
    );

    showToast(`Order ${orderId} failed QC. Vendor notified via WhatsApp.`);
    onRefreshOrders?.();
    setReviewingOrder(null);
    setQcStoreNumber("");
    setQcVendorNumber("");
  };

  const handleConfirmPayment = (orderId) => {
    const order = orders.find((o) => o.id === orderId) || paymentPendingOrders.find((o) => o.id === orderId);
    if (!order) return;
    setPaymentConfirmOrder(order);
    setPaymentStoreNumber(order.storeContactNumber || order.customerPhone || "");
    setPaymentVendorNumber(order.vendorContactNumber || "");
  };

  const handleConfirmPaymentSubmit = () => {
    if (!paymentConfirmOrder) return;
    if (!paymentStoreNumber && !paymentVendorNumber) {
      showToast("Enter store and/or vendor WhatsApp numbers before dispatching.");
      return;
    }

    const orderId = paymentConfirmOrder.id;
    const randomTracking = `BD-${Math.floor(100000000 + Math.random() * 900000000)}`;

    setOrders((prevOrders) =>
      prevOrders.map((order) =>
        order.id === orderId
          ? {
              ...order,
              status: OrderStatus.DISPATCHED,
              storeContactNumber: paymentStoreNumber || order.storeContactNumber,
              vendorContactNumber: paymentVendorNumber || order.vendorContactNumber,
              dispatchDate: `${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}, ${new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`,
              logisticsPartner: "BlueDart Premium",
              trackingNo: randomTracking,
            }
          : order
      )
    );

    sendWhatsApp(
      "payment_dispatched",
      paymentConfirmOrder,
      { store: paymentStoreNumber, vendor: paymentVendorNumber },
      { logistics: "BlueDart Premium", trackingNo: randomTracking }
    );

    addActivity(
      `Payment Cleared & Dispatched: ${orderId}`,
      `Payment recorded. Dispatched via BlueDart Premium (${randomTracking}). WhatsApp queued to store ${paymentStoreNumber || "N/A"} and vendor ${paymentVendorNumber || "N/A"}.`,
      "success"
    );

    showToast(`Payment confirmed! Order ${orderId} dispatched via BlueDart.`);
    setPaymentConfirmOrder(null);
    setPaymentStoreNumber("");
    setPaymentVendorNumber("");
    loadPaymentTabOrders();
    onRefreshOrders?.();
  };

  // Auto move overdue to inventory
  const handleMoveToInventory = (orderId) => {
    setOrders(prevOrders => 
      prevOrders.map(order => 
        order.id === orderId
          ? {
              ...order,
              status: OrderStatus.UNASSIGNED,
              assignedVendor: undefined,
              expectedTatDays: undefined,
              paymentStatusDaysCount: undefined
            }
          : order
      )
    );

    addActivity(
      `Order ${orderId} Moved to Stock`,
      `Payment unpaid for >7 days. Order cancelled and item returned to unallocated reservoir.`,
      "warning"
    );

    showToast(`Order ${orderId} returned to unassigned operations queue.`);
  };

  // Dynamic Metrics from MongoDB stats
  const pendingAssignmentCount = (orderStats.unassigned ?? 0) + (orderStats.pendingVendorReview ?? 0);
  const activeProductionCount = orderStats.inProduction ?? 0;
  const pendingQCCount = orderStats.pendingQC ?? 0;
  const awaitingPaymentCount = orderStats.awaitingPayment ?? 0;
  const dispatchedCount = orderStats.dispatched ?? 0;
  const totalOrdersCount = orderStats.total ?? ordersMeta.total ?? 0;
  const totalGoldWeight = analyticsData?.totalGoldWeight ?? 0;
  const workbookStatusCounts = analyticsData?.statusCounts?.reduce((acc, row) => {
    acc[row.status] = row.qty;
    return acc;
  }, {}) ?? {};

  const filteredOrders = orders;

  const sortedVendors = useMemo(() => {
    const list = [...vendors];
    list.sort((a, b) => {
      if (a.isDemo && !b.isDemo) return -1;
      if (!a.isDemo && b.isDemo) return 1;
      return (b.orderCount ?? 0) - (a.orderCount ?? 0);
    });
    const hasDemo = list.some((v) => v.isDemo || v.name === DEMO_VENDOR_NAME);
    if (!hasDemo) {
      list.unshift({
        id: "demo-workshop-surat",
        name: DEMO_VENDOR_NAME,
        capacity: 45,
        status: "Optimal",
        tat: "10d",
        orderCount: 0,
        isDemo: true,
      });
    }
    return list;
  }, [vendors]);

  const actionTabForActivity = (act) => {
    const cat = act.category || categorizeNotification(act);
    const text = `${act.title || ""} ${act.description || ""}`.toLowerCase();
    if (cat === "QC" || text.includes("ready for qc") || text.includes("crafting completed")) return "qc";
    if (cat === "Payment" || text.includes("payment")) return "payment";
    if (cat === "Dispatch" || text.includes("dispatch")) return "payment";
    if (cat === "Assignment" || text.includes("reject") || text.includes("assigned")) return "assignment";
    if (cat === "Production" || text.includes("accepted") || text.includes("in production")) return "assignment";
    if (text.includes("qc")) return "qc";
    return "home";
  };

  const isVendorPortalEvent = (act) =>
    Boolean(act.vendorName) ||
    /vendor accepted|vendor rejected|ready for qc|crafting completed|in production|advanced order/i.test(
      `${act.title || ""} ${act.description || ""}`.toLowerCase()
    );

  const opsNotifications = useMemo(() => {
    const queue = [];
    if (pendingAssignmentCount > 0) {
      queue.push({
        id: "sys-assign",
        category: "Assignment",
        title: `${pendingAssignmentCount.toLocaleString("en-IN")} orders need vendor assignment`,
        description: "Excel status: Pending from Vendor — allocate workshops in Orders tab.",
        time: "Live",
        actionTab: "assignment",
      });
    }
    if (activeProductionCount > 0) {
      queue.push({
        id: "sys-production",
        category: "Production",
        title: `${activeProductionCount.toLocaleString("en-IN")} orders in workshop production`,
        description: "God WIP / GOD WIP / inter-store transfer pipeline.",
        time: "Live",
        actionTab: "assignment",
      });
    }
    if (pendingQCCount > 0) {
      queue.push({
        id: "sys-qc",
        category: "QC",
        title: `${pendingQCCount.toLocaleString("en-IN")} orders in QC queue`,
        description: 'Excel "Ready For Dispatch" rows — audit before payment release.',
        time: "Live",
        actionTab: "qc",
      });
    }
    if (awaitingPaymentCount > 0) {
      queue.push({
        id: "sys-payment",
        category: "Payment",
        title: `${awaitingPaymentCount.toLocaleString("en-IN")} orders awaiting payment`,
        description: "Only orders that passed QC in the portal appear here (not all Excel rows).",
        time: "Live",
        actionTab: "payment",
      });
    }
    if (dispatchedCount > 0) {
      queue.push({
        id: "sys-dispatch",
        category: "Dispatch",
        title: `${dispatchedCount.toLocaleString("en-IN")} dispatched shipments`,
        description: "Payment cleared and logistics handoff recorded.",
        time: "Live",
        actionTab: "payment",
      });
    }
    const vendorAlerts = activities
      .filter(isVendorPortalEvent)
      .slice(0, 12)
      .map((act) => ({
        ...act,
        id: act.id || `vendor-${act.title}`,
        category: act.category || categorizeNotification(act),
        actionTab: actionTabForActivity(act),
      }));

    const vendorAlertKeys = new Set(vendorAlerts.map((a) => a.id));

    const activityItems = activities
      .filter((act) => !vendorAlertKeys.has(act.id || `vendor-${act.title}`))
      .map((act) => ({
        ...act,
        category: act.category || categorizeNotification(act),
        actionTab: actionTabForActivity(act),
      }));

    return [...queue, ...vendorAlerts, ...activityItems];
  }, [
    pendingAssignmentCount,
    activeProductionCount,
    pendingQCCount,
    awaitingPaymentCount,
    dispatchedCount,
    activities,
  ]);

  const notificationCount = opsNotifications.length;

  // Detect new vendor events and push an alert to the admin
  useEffect(() => {
    if (!activities.length) return;
    const newestId = activities[0]?.id;
    if (latestActivityIdRef.current === null) {
      latestActivityIdRef.current = newestId;
      return;
    }
    if (newestId !== latestActivityIdRef.current) {
      latestActivityIdRef.current = newestId;
      const newest = activities[0];
      if (isVendorPortalEvent(newest)) {
        setUnseenCount((n) => n + 1);
        const isAccept = /accepted/i.test(newest.title);
        const isReject = /rejected/i.test(newest.title);
        const isQC    = /qc|quality|audit/i.test(newest.title);
        const sub = newest.description?.slice(0, 90) || "";
        if (isAccept)  showAlertToast(`Vendor accepted an order`, sub);
        else if (isReject) showAlertToast(`Vendor rejected an order`, sub);
        else if (isQC) showAlertToast(`Order submitted for QC`, sub);
        else           showAlertToast(newest.title, sub);
      }
    }
  }, [activities]);

  useEffect(() => {
    if (tab === "payment") {
      loadPaymentTabOrders();
      return;
    }
    const statusByTab = {
      assignment: "",
      qc: "READY_FOR_QC",
    };
    if (statusByTab[tab] !== undefined) {
      applyFilters({
        status: statusByTab[tab],
        ...(tab === "assignment" ? { vendor: "", search: "", excelStatus: "", state: "" } : {}),
      });
      if (tab === "assignment") setSearchQuery("");
    }
  }, [tab]);

  return (
    <div className="operations-portal-light flex h-[100dvh] font-sans antialiased text-[#0B1C30] overflow-hidden">
      
      {/* SIDEBAR FOR OPERATIONS CONTROL */}
      <aside className="operations-sidebar-light w-[280px] flex flex-col justify-between shrink-0 overflow-y-auto border-r relative overflow-hidden">
        <div>
          {/* Brand/Logo */}
          <div className="px-6 py-8 border-b border-[#C9A84C]/15 relative">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#F8F9FB] border border-[#C6C6CF]/60">
                <span className="font-mono text-xl font-black text-[#C9A84C] tracking-wide">K1</span>
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white leading-none">KISNA ONE</h1>
                <p className="text-xs text-[#C9A84C]/60 mt-1 uppercase tracking-widest font-semibold">Operations Control</p>
              </div>
            </div>
          </div>

          {/* Navigation links */}
          <nav className="mt-8 px-4 space-y-1">
            <button
              onClick={() => setTab("home")}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-150 ${
                tab === "home" 
                  ? "bg-[#C9A84C]/15 text-[#C9A84C] font-semibold border-r-4 border-[#C9A84C]" 
                  : "text-white/50 hover:bg-white/8 hover:text-white/90"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[20px]">dashboard</span>
                <span className="text-sm">Home Overview</span>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{background:"rgba(201,168,76,0.12)",color:"rgba(201,168,76,0.7)"}}>{totalOrdersCount}</span>
            </button>

            <button
              onClick={() => setTab("assignment")}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-150 ${
                tab === "assignment" 
                  ? "bg-[#C9A84C]/15 text-[#C9A84C] font-semibold border-r-4 border-[#C9A84C]" 
                  : "text-white/50 hover:bg-white/8 hover:text-white/90"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[20px] fill-current">assignment_ind</span>
                <span className="text-sm">Orders</span>
              </div>
              {pendingAssignmentCount > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-600 text-white font-bold animate-pulse">
                  {pendingAssignmentCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setTab("qc")}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-150 ${
                tab === "qc" 
                  ? "bg-[#C9A84C]/15 text-[#C9A84C] font-semibold border-r-4 border-[#C9A84C]" 
                  : "text-white/50 hover:bg-white/8 hover:text-white/90"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[20px]">fact_check</span>
                <span className="text-sm">QC Review Bureau</span>
              </div>
              {pendingQCCount > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#C9A84C] text-[#0D1B3E] font-bold">
                  {pendingQCCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setTab("payment")}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-150 ${
                tab === "payment" 
                  ? "bg-[#C9A84C]/15 text-[#C9A84C] font-semibold border-r-4 border-[#C9A84C]" 
                  : "text-white/50 hover:bg-white/8 hover:text-white/90"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[20px]">payments</span>
                <span className="text-sm">Payment &amp; Dispatch</span>
              </div>
              {awaitingPaymentCount > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500 text-black font-bold">
                  {awaitingPaymentCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setTab("settings")}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-150 ${
                tab === "settings" 
                  ? "bg-[#C9A84C]/15 text-[#C9A84C] font-semibold border-r-4 border-[#C9A84C]" 
                  : "text-white/50 hover:bg-white/8 hover:text-white/90"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[20px]">settings</span>
                <span className="text-sm">Settings Control</span>
              </div>
            </button>
          </nav>
        </div>

        {/* User Card Profile Switcher */}
        <div className="px-6 py-8 border-t border-[#C6C6CF]/10">
          <div className="p-4 bg-[#C9A84C]/5 rounded-xl border border-[#C9A84C]/10 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#C9A84C]/20 flex items-center justify-center font-bold text-[#C9A84C]">
                OM
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate text-white">Operations Manager</p>
                <p className="text-[10px] text-[#7784AD] uppercase tracking-wider font-semibold">Kisna Operations</p>
              </div>
            </div>
            
            {/* Demo Vendor Portal — seed sample orders and test full workflow */}
            <button
              onClick={() => onOpenDemoVendorPortal?.("dashboard")}
              className="w-full flex items-center justify-between px-3 py-2.5 bg-[#C9A84C] text-slate-900 font-bold text-xs rounded-lg hover:bg-[#ffe08f] transition-all cursor-pointer shadow-lg shadow-[#C9A84C]/10"
            >
              <span>Demo Vendor Portal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                const preferred =
                  vendors.find((v) => v.isDemo) ||
                  vendors.find((v) => /taash/i.test(v.name)) ||
                  vendors[0];
                onSwitchToVendorPortal?.(preferred?.name, "dashboard");
              }}
              className="w-full flex items-center justify-center px-3 py-2 text-white/70 font-semibold text-[10px] rounded-lg hover:bg-white/10 transition-all cursor-pointer"
            >
              Open live vendor portal
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN LAYOUT CANVAS */}
      <main className="operations-canvas-light flex-grow flex flex-col min-w-0 h-full overflow-hidden">
        
        {/* HEADER BAR */}
        <header className="h-20 bg-white border-b border-[#C6C6CF]/20 flex items-center justify-between px-8 shrink-0 z-10 shadow-sm">
          {/* Left search */}
          <div className="flex items-center gap-4 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-[#76767F] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search orders, vendors, styles, products..."
                className="w-full pl-10 pr-4 py-2.5 bg-[#EFF4FF] border-none rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0D1B3E]/10 placeholder:text-[#76767F]/60 text-[#0B1C30]"
              />
            </div>
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")}
                className="text-xs text-[#76767F] hover:text-[#0B1C30] underline"
              >
                Clear
              </button>
            )}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-ping"></span>
                <p className="text-sm font-semibold text-[#0B1C30] leading-none">Ops Management Terminal</p>
              </div>
              <p className="text-xs text-[#76767F]/80 mt-1 font-mono">UTC: 2026-06-11 10:00</p>
            </div>

            <div className="flex items-center gap-1.5 border-l border-[#C6C6CF]/20 pl-6">
              <NotificationBell
                count={unseenCount || notificationCount}
                onClick={() => {
                  onRefreshActivities?.();
                  setNotificationsOpen(true);
                  setUnseenCount(0);
                }}
              />
              <button 
                onClick={() => setTab("settings")}
                className={`p-2 rounded-full transition-colors ${tab === "settings" ? "bg-[#C9A84C]/20 text-[#C9A84C]" : "hover:bg-[#F8F9FF]"}`}
              >
                <Settings className="w-4 h-4 text-[#76767F]" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full border border-[#C6C6CF]/30 overflow-hidden shadow-inner">
                <img 
                  alt="Operations Manager Executive Profile" 
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBEUz7opdLBsaK2tdifl5Tg97G73VyD252Td0clbQ5wwa-2iTOBwqD5qyK8pH_XieETnLktwwM5WZPulNSUax3DCulnnddGDn-jNjsGgwMy48AUznUHZ9iSwi_Lb4A3wLZjG9g4UD1ZgZHrz8pUgx_XgnR_l8GzksxIsPmOsrpcPUAY0-MGE3vho4BTOz_b9ekYP8WomaHj6X4eDyzfTHEV5m8XXAWON5cDcl9MTKsN_BoKsWh_zFSq9ZoPAbQOsrSdI79w5kpDVMnA"
                  className="w-full h-full object-cover" 
                />
              </div>
            </div>
          </div>
        </header>

        {/* CONTAINER FOR SCROLLABLE PERSPECTIVE TAB */}
        <div className="flex-grow overflow-y-auto p-8 custom-scrollbar">

          {/* TAB 1: OPERATIONS HOME OVERVIEW */}
          {tab === "home" && (
            <div className="space-y-8 animate-in fade-in duration-200">

              {/* Header block */}
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-xs uppercase tracking-widest font-mono text-[#C9A84C] font-bold">FRN / CRV MASTER DASHBOARD</p>
                  <h2 className="text-3xl font-black text-[#0D1B3E] mt-1">Operations Analytics</h2>
                  <p className="text-[#45464E] text-sm mt-1">Live aggregates from the running-order workbook — 2,118 orders across India.</p>
                </div>
                <button
                  onClick={() => handleExport()}
                  disabled={exporting}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#0D1B3E] hover:bg-[#1E3A5F] text-[#F8F9FF] rounded-xl font-bold text-sm shadow-md transition-all disabled:opacity-60"
                >
                  <Download className="w-4 h-4 text-[#C9A84C]" />
                  <span>{exporting ? "Exporting…" : "Export Report"}</span>
                </button>
              </div>

              {/* Analytics from Excel workbook */}
              <AnalyticsDashboard />

              {/* AI Operations Intelligence */}
              {analyticsData && analyticsData.totalOrders > 0 && (
                <div className="bg-white border border-[#C6C6CF]/30 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-5">
                    <div className="p-1.5 bg-[#0D1B3E] rounded-lg">
                      <span className="material-symbols-outlined text-[16px] text-[#C9A84C]">psychology</span>
                    </div>
                    <h3 className="font-bold text-base text-[#0D1B3E]">AI Operations Intelligence</h3>
                    <span className="ml-auto text-[9px] bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Live Data</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      {
                        icon: "location_on",
                        color: "#3266ad",
                        bg: "#EFF4FF",
                        title: `${analyticsData.topStates?.[0]?.state || "N/A"} leads order volume`,
                        body: `${analyticsData.topStates?.[0]?.count || 0} orders (${((( analyticsData.topStates?.[0]?.count || 0) / analyticsData.totalOrders) * 100).toFixed(1)}% of total) — highest demand state in network`,
                      },
                      {
                        icon: "diamond",
                        color: "#C9A84C",
                        bg: "#FDF8EC",
                        title: `${analyticsData.karatage?.[0]?.kt || "22KT"} dominates karatage mix`,
                        body: `${(analyticsData.karatage?.[0]?.count || 0).toLocaleString("en-IN")} orders in top category — ${((( analyticsData.karatage?.[0]?.count || 0) / analyticsData.totalOrders) * 100).toFixed(1)}% market share`,
                      },
                      {
                        icon: "scale",
                        color: "#1d9e75",
                        bg: "#EDFAF4",
                        title: `${((analyticsData.totalGoldWeight || 0) / 1000).toFixed(2)} kg gold committed`,
                        body: `Avg ${((analyticsData.totalGoldWeight || 0) / (analyticsData.totalOrders || 1)).toFixed(2)} gm/order across ${(analyticsData.totalOrders || 0).toLocaleString("en-IN")} workbook orders`,
                      },
                      {
                        icon: "groups",
                        color: "#534ab7",
                        bg: "#F3F0FF",
                        title: `${(analyticsData.uniqueCustomers || 0).toLocaleString("en-IN")} retail partners active`,
                        body: `Nationwide reach across ${analyticsData.uniqueStates || 0} states — top customer: ${analyticsData.topCustomers?.[0]?.customer || "N/A"}`,
                      },
                    ].map((insight) => (
                      <div key={insight.title} className="flex gap-3 p-4 rounded-xl border border-[#C6C6CF]/20" style={{ background: insight.bg }}>
                        <div className="p-2 rounded-lg shrink-0" style={{ background: insight.color + "22" }}>
                          <span className="material-symbols-outlined text-[18px]" style={{ color: insight.color }}>{insight.icon}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-[#0D1B3E] leading-snug truncate">{insight.title}</p>
                          <p className="text-[11px] text-[#76767F] mt-0.5 leading-snug">{insight.body}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Executive Leadership */}
              <div className="bg-white border border-[#C6C6CF]/30 p-6 rounded-2xl">
                <h3 className="font-bold text-base text-[#0D1B3E] mb-4">Executive Leadership</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Virtual CEO */}
                  <div className="flex items-center gap-4 p-4 rounded-xl border border-[#C9A84C]/20 bg-gradient-to-r from-[#FDF8EC] to-white">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center font-extrabold text-white text-base shrink-0"
                      style={{ background: "linear-gradient(135deg, #C9A84C, #A07830)" }}>
                      VJ
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-[#0D1B3E] truncate">Vikram Jaiswal</p>
                      <p className="text-[11px] text-[#76767F]">Chief Executive Officer</p>
                      <span className="text-[9px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded font-bold uppercase mt-1 inline-block">
                        Strategic Advisory — Non-Operational
                      </span>
                    </div>
                    <span className="ml-auto text-[10px] text-[#76767F] bg-gray-100 px-2 py-1 rounded-full font-bold shrink-0">Offline</span>
                  </div>
                  {/* Operations Manager */}
                  <div className="flex items-center gap-4 p-4 rounded-xl border border-[#C6C6CF]/20 bg-[#F8F9FB]">
                    <div className="w-12 h-12 rounded-full bg-[#C9A84C]/20 flex items-center justify-center font-extrabold text-[#C9A84C] text-base shrink-0">
                      OM
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-[#0D1B3E] truncate">Operations Manager</p>
                      <p className="text-[11px] text-[#76767F]">Head of Operations</p>
                      <span className="text-[9px] bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded font-bold uppercase mt-1 inline-block">
                        Active — Online
                      </span>
                    </div>
                    <span className="ml-auto text-[10px] text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded-full font-bold shrink-0">Online</span>
                  </div>
                </div>
              </div>

              {/* Activity feed + vendor snapshot */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                <div className="bg-white border border-[#C6C6CF]/30 p-6 rounded-2xl">
                  <h3 className="font-bold text-base text-[#0D1B3E] mb-6">Recent Operations Activity</h3>
                  <div className="relative pl-6 space-y-6 before:content-[‘’] before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-gray-100">
                    {activities.map((act) => (
                      <div key={act.id} className="relative">
                        <span className={`absolute -left-[23px] top-1 w-3.5 h-3.5 rounded-full border-4 border-white ${
                          act.type === "success" ? "bg-green-500" :
                          act.type === "error" ? "bg-red-500" :
                          act.type === "warning" ? "bg-[#C9A84C]" : "bg-[#0D1B3E]"
                        }`} />
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-xs font-bold text-[#0D1B3E]">{act.title}</p>
                            <p className="text-[10px] text-[#76767F] mt-0.5">{act.description}</p>
                          </div>
                          <span className="font-mono text-[9px] text-[#76767F] font-bold">{act.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white border border-[#C6C6CF]/30 p-6 rounded-2xl">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-base text-[#0D1B3E]">Vendor Network Status</h3>
                    <button onClick={() => setTab("assignment")} className="text-xs text-[#C9A84C] font-bold hover:underline">Manage Load</button>
                  </div>
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 text-[#76767F] font-semibold">
                        <th className="pb-3">Vendor</th>
                        <th className="pb-3">Capacity</th>
                        <th className="pb-3">Status</th>
                        <th className="pb-3">TAT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {sortedVendors.map((vendor) => (
                        <tr
                          key={vendor.id}
                          onClick={() => {
                            if (vendor.isDemo) onOpenDemoVendorPortal?.("dashboard");
                            else onSwitchToVendorPortal?.(vendor.name, "active");
                          }}
                          className="hover:bg-slate-50 transition-colors cursor-pointer"
                          title={`Open ${vendor.name} vendor dashboard`}
                        >
                          <td className="py-3 font-bold text-[#0B1C30]">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="w-5 h-5 rounded-full bg-[#C9A84C]/20 text-[#C9A84C] text-[9px] font-black flex items-center justify-center shrink-0">
                                {vendor.name.slice(0, 1)}
                              </span>
                              <span className="break-words">{vendor.name}</span>
                              {vendor.isDemo && (
                                <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">Demo</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3">
                            <div className="flex items-center gap-2 max-w-[100px]">
                              <div className="flex-1 h-1.5 bg-[#EFF4FF] rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${vendor.capacity > 90 ? "bg-red-500" : vendor.capacity > 70 ? "bg-amber-500" : "bg-green-500"}`} style={{ width: `${vendor.capacity}%` }} />
                              </div>
                              <span className="font-mono text-[10px] text-[#76767F] font-bold">{vendor.capacity}%</span>
                            </div>
                          </td>
                          <td className="py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${vendor.status === "Optimal" ? "bg-green-50 text-green-700" : vendor.status === "Warning" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`}>
                              {vendor.status}
                            </span>
                          </td>
                          <td className="py-3 font-mono text-[#0D1B3E] font-bold">{vendor.tat}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: VENDOR ASSIGNMENT MODULE */}
          {tab === "assignment" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* Header */}
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-2xl font-black text-[#0D1B3E]">All Orders</h2>
                  <p className="text-sm text-[#45464E] mt-1">Complete view of all orders across every workflow status — assign, QC, dispatch, and payment stages.</p>
                </div>
                <div className="flex gap-2.5 flex-wrap">
                  <button
                    onClick={() => setShowFilterPanel((v) => !v)}
                    className={`flex items-center gap-1.5 px-4 py-2 border rounded-xl font-bold text-sm transition-all ${showFilterPanel ? "bg-[#EFF4FF] border-[#3266ad]/40 text-[#0D1B3E]" : "bg-white border-[#C6C6CF]/40 text-[#0B1C30] hover:bg-[#F8F9FF]"}`}
                  >
                    <Filter className="w-4 h-4 text-[#76767F]" />
                    <span>Filter</span>
                  </button>
                  <button
                    onClick={() => handleExport()}
                    disabled={exporting}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#0D1B3E] text-white rounded-xl font-bold text-sm hover:bg-[#1E3A5F] transition-all shadow-sm disabled:opacity-60"
                  >
                    <Download className="w-4 h-4 text-[#C9A84C]" />
                    <span>{exporting ? "Exporting…" : "Export All"}</span>
                  </button>
                </div>
              </div>

              {showFilterPanel && (
                <div className="bg-white border border-[#C6C6CF]/30 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                  <label className="text-xs font-bold text-[#76767F] uppercase">
                    Portal Status
                    <select
                      value={orderFilters.status || ""}
                      onChange={(e) => applyFilters({ status: e.target.value })}
                      className="mt-1 w-full border border-[#C6C6CF]/40 rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="">All statuses</option>
                      <option value="UNASSIGNED">Unassigned</option>
                      <option value="PENDING_VENDOR_REVIEW">Pending vendor review</option>
                      <option value="IN_PRODUCTION">In production</option>
                      <option value="READY_FOR_QC">Ready for QC</option>
                      <option value="QC_FAILED">QC failed</option>
                      <option value="AWAITING_PAYMENT">Awaiting payment</option>
                      <option value="DISPATCHED">Dispatched</option>
                    </select>
                  </label>
                  <label className="text-xs font-bold text-[#76767F] uppercase">
                    Workbook Status
                    <select
                      value={orderFilters.excelStatus || ""}
                      onChange={(e) => applyFilters({ excelStatus: e.target.value })}
                      className="mt-1 w-full border border-[#C6C6CF]/40 rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="">All workbook statuses</option>
                      <option value="Pending from Vendor">Pending from Vendor</option>
                      <option value="God WIP">God WIP</option>
                      <option value="GOD WIP">GOD WIP</option>
                      <option value="Ready For Dispatch">Ready For Dispatch</option>
                      <option value="Inter Store Transfer">Inter Store Transfer</option>
                    </select>
                  </label>
                  <label className="text-xs font-bold text-[#76767F] uppercase">
                    State
                    <input
                      value={orderFilters.state || ""}
                      onChange={(e) => applyFilters({ state: e.target.value })}
                      placeholder="e.g. Gujarat"
                      className="mt-1 w-full border border-[#C6C6CF]/40 rounded-lg px-3 py-2 text-sm"
                    />
                  </label>
                  <div className="flex items-end">
                    <button
                      onClick={() => {
                        applyFilters({ status: "", excelStatus: "", state: "", search: "" });
                        setSearchQuery("");
                      }}
                      className="w-full px-4 py-2 border border-[#C6C6CF]/40 rounded-lg text-sm font-bold hover:bg-[#F8F9FF]"
                    >
                      Clear filters
                    </button>
                  </div>
                </div>
              )}

              {/* Order status summary line */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white border border-[#C6C6CF]/20 p-4 rounded-xl">
                  <p className="text-[10px] text-[#76767F] font-bold uppercase tracking-wider">Unassigned Queue</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-3xl font-black text-[#0D1B3E]">{pendingAssignmentCount}</span>
                    <span className="text-[11px] bg-red-50 text-red-700 px-2 py-0.5 rounded-full font-bold">Needs action</span>
                  </div>
                </div>
                <div className="bg-white border border-[#C6C6CF]/20 p-4 rounded-xl">
                  <p className="text-[10px] text-[#76767F] font-bold uppercase tracking-wider">In Production</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-3xl font-black text-[#0D1B3E]">{activeProductionCount}</span>
                    <span className="text-[11px] text-purple-700 font-bold">Active</span>
                  </div>
                </div>
                <div className="bg-white border border-[#C6C6CF]/20 p-4 rounded-xl">
                  <p className="text-[10px] text-[#76767F] font-bold uppercase tracking-wider">QC / Dispatch</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-3xl font-black text-[#0D1B3E]">{pendingQCCount + (orderStats.dispatched ?? 0)}</span>
                    <span className="text-[11px] text-blue-700 font-bold">Processing</span>
                  </div>
                </div>
                <div className="bg-white border-l-4 border-l-[#C9A84C] border border-[#C6C6CF]/20 p-4 rounded-xl">
                  <p className="text-[10px] text-[#76767F] font-bold uppercase tracking-wider">Awaiting Payment</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-3xl font-black text-[#C9A84C]">{awaitingPaymentCount}</span>
                    <span className="text-[10px] bg-[#fed977]/40 text-[#755B00] px-2 py-0.5 rounded font-bold">PENDING</span>
                  </div>
                </div>
              </div>

              {/* Table section */}
              <div className="bg-white border border-[#C6C6CF]/30 rounded-2xl overflow-hidden shadow-sm kisna-table-wrap">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1720px] table-fixed text-left text-sm border-collapse">
                    <colgroup>
                      <col className="w-[96px]" />
                      <col className="w-[160px]" />
                      <col className="w-[230px]" />
                      <col className="w-[110px]" />
                      <col className="w-[230px]" />
                      <col className="w-[170px]" />
                      <col className="w-[110px]" />
                      <col className="w-[120px]" />
                      <col className="w-[140px]" />
                      <col className="w-[190px]" />
                      <col className="w-[160px]" />
                      <col className="w-[164px]" />
                    </colgroup>
                    <thead>
                      <tr className="bg-[#EFF4FF] border-b border-[#C6C6CF]/25 text-[#647187] font-semibold text-[11px] tracking-wide uppercase">
                        <th className="py-3.5 px-6 whitespace-nowrap align-top">Order ID</th>
                        <th className="py-3.5 px-4 whitespace-nowrap align-top">Design No.</th>
                        <th className="py-3.5 px-4 whitespace-nowrap align-top">Customer / Location</th>
                        <th className="py-3.5 px-4 whitespace-nowrap align-top">Gold Specs</th>
                        <th className="py-3.5 px-4 whitespace-nowrap align-top">Ordering Store</th>
                        <th className="py-3.5 px-4 whitespace-nowrap align-top">Kisna Style</th>
                        <th className="py-3.5 px-4 whitespace-nowrap align-top">Qty / Value</th>
                        <th className="py-3.5 px-4 whitespace-nowrap align-top">Date Approved</th>
                        <th className="py-3.5 px-4 whitespace-nowrap align-top">Expected Delivery</th>
                        <th className="py-3.5 px-4 whitespace-nowrap align-top">Assigned Vendor</th>
                        <th className="py-3.5 px-4 whitespace-nowrap align-top">Operational Status</th>
                        <th className="py-3.5 px-6 text-right whitespace-nowrap align-top">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredOrders.map((order) => {
                        const STATUS_META = {
                          [OrderStatus.UNASSIGNED]: { label: "Unassigned", cls: "bg-red-50 text-red-600 border-red-100" },
                          [OrderStatus.PENDING_VENDOR_REVIEW]: { label: "Pending Review", cls: "bg-blue-50 text-blue-600 border-blue-200" },
                          [OrderStatus.REJECTED_BY_VENDOR]: { label: "Rejected", cls: "bg-red-50 text-red-700 border-red-200" },
                          [OrderStatus.IN_PRODUCTION]: { label: "In Production", cls: "bg-purple-50 text-purple-700 border-purple-200" },
                          [OrderStatus.FINISHING]: { label: "Finishing", cls: "bg-indigo-50 text-indigo-700 border-indigo-200" },
                          [OrderStatus.READY_FOR_QC]: { label: "Ready for QC", cls: "bg-sky-50 text-sky-700 border-sky-200" },
                          [OrderStatus.QC_IN_REVIEW]: { label: "QC In Review", cls: "bg-amber-50 text-amber-700 border-amber-200" },
                          [OrderStatus.QC_FAILED]: { label: "QC Failed", cls: "bg-red-50 text-red-700 border-red-200" },
                          [OrderStatus.AWAITING_PAYMENT]: { label: "Awaiting Payment", cls: "bg-orange-50 text-orange-700 border-orange-200" },
                          [OrderStatus.PAYMENT_OVERDUE]: { label: "Payment Overdue", cls: "bg-red-50 text-red-600 border-red-100" },
                          [OrderStatus.DISPATCHED]: { label: "Dispatched", cls: "bg-green-50 text-green-700 border-green-200" },
                          [OrderStatus.COMPLETED_ARCHIVED]: { label: "Completed", cls: "bg-gray-50 text-gray-600 border-gray-200" },
                        };
                        const meta = STATUS_META[order.status] || { label: order.status, cls: "bg-gray-50 text-gray-600 border-gray-200" };
                        const canAssign = order.status === OrderStatus.UNASSIGNED;
                        const canReassign = [OrderStatus.PENDING_VENDOR_REVIEW, OrderStatus.REJECTED_BY_VENDOR].includes(order.status);
                        return (
                          <tr key={order.id} className="hover:bg-slate-50/50 transition-colors align-top">
                            <td className="py-4 px-6 font-mono text-[13px] leading-5 font-bold text-[#0D1B3E] whitespace-normal break-normal">{order.id}</td>
                            <td className="py-4 px-4">
                              <p className="font-mono text-xs leading-5 font-bold text-[#0D1B3E] whitespace-nowrap">{order.designNo || order.style}</p>
                              <p className="text-[10px] leading-4 text-[#76767F] truncate" title={`${order.designCategory || "—"} / ${order.collection || "—"}`}>{order.designCategory || "—"} / {order.collection || "—"}</p>
                            </td>
                            <td className="py-4 px-4">
                              <p className="font-bold leading-5 text-slate-800 break-normal">{order.customerName || order.store}</p>
                              <p className="text-[10px] leading-4 text-[#76767F] break-normal">{order.city || "—"}, {order.state || "—"}</p>
                            </td>
                            <td className="py-4 px-4 text-xs leading-5 font-semibold text-[#76767F] whitespace-nowrap">
                              <p>{order.goldWeight ?? "—"}g</p>
                              <p>{order.kt || "—"} / {order.color || "—"}</p>
                            </td>
                            <td className="py-4 px-4">
                              <p className="font-bold leading-5 text-slate-800 break-normal">{order.store}</p>
                            </td>
                            <td className="py-4 px-4">
                              <p className="text-slate-800 font-medium leading-5 break-normal">{order.style}</p>
                            </td>
                            <td className="py-4 px-4 text-[#76767F] font-medium whitespace-nowrap">
                              <p>{order.qty} unit</p>
                              <p className="text-[10px]">INR {order.orderValue ? order.orderValue.toLocaleString("en-IN") : "N/A"}</p>
                            </td>
                            <td className="py-4 px-4 text-xs leading-5 font-semibold text-[#76767F] whitespace-nowrap">{order.dateApproved || "Pending"}</td>
                            <td className="py-4 px-4 text-xs leading-5 font-semibold text-[#76767F] whitespace-nowrap">{order.expectedDeliveryDate || "Pending"}</td>
                            <td className="py-4 px-4">
                              {order.assignedVendor ? (
                                <div className="flex items-start gap-1.5 font-bold leading-5 text-[#0D1B3E]">
                                  <span className="w-2 h-2 rounded-full bg-[#C9A84C] shrink-0 mt-1.5"></span>
                                  <span className="break-normal">{order.assignedVendor}</span>
                                </div>
                              ) : (
                                <span className="text-[#C6C6CF] font-bold">—</span>
                              )}
                            </td>
                            <td className="py-4 px-4">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border whitespace-nowrap ${meta.cls}`}>
                                {meta.label}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-right whitespace-nowrap">
                              {canAssign ? (
                                <button
                                  onClick={() => openAssignmentModal(order)}
                                  className="inline-flex min-w-[112px] items-center justify-center whitespace-nowrap px-4 py-2 bg-[#C9A84C] text-slate-900 font-bold text-xs rounded-lg hover:bg-[#ffe08f] transition-all cursor-pointer shadow-sm"
                                >
                                  Assign Vendor
                                </button>
                              ) : canReassign ? (
                                <button
                                  onClick={() => openAssignmentModal(order)}
                                  className="text-xs font-bold text-[#76767F] hover:text-[#0D1B3E] underline"
                                >
                                  Reassign
                                </button>
                              ) : (
                                <span className="text-[10px] text-[#C6C6CF] font-semibold">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {renderPaginationFooter()}
              </div>

            </div>
          )}

          {/* TAB 3: QUALITY CONTROL AUDITING BUREAU */}
          {tab === "qc" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* Header */}
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-2xl font-black text-[#0D1B3E]">Quality Control Testing Desk</h2>
                  <p className="text-sm text-[#45464E] mt-1">Audit, check, and confirm jewelry items completed by workshop manufacturing teams prior to payment release.</p>
                </div>
                <button className="flex items-center gap-1.5 px-4 py-2 bg-white border border-[#C6C6CF]/40 text-[#0B1C30] rounded-xl font-bold text-sm hover:bg-[#F8F9FF] transition-all">
                  <Filter className="w-4 h-4 text-[#76767F]" />
                  <span>Config Requirements</span>
                </button>
              </div>

              {/* QC metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                
                <div className="bg-white border border-[#C6C6CF]/20 p-4 rounded-xl">
                  <p className="text-[10px] text-[#76767F] font-bold uppercase tracking-wider">Awaiting Bureau Audit</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-3xl font-black text-[#0D1B3E]">
                      {(orderStats.pendingQC ?? 0).toLocaleString("en-IN")}
                    </span>
                    <span className="text-xs font-bold text-amber-600">+12% vs last week</span>
                  </div>
                </div>

                <div className="bg-white border border-[#C6C6CF]/20 p-4 rounded-xl">
                  <p className="text-[10px] text-[#76767F] font-bold uppercase tracking-wider">Average Check Time</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-3xl font-black text-[#0D1B3E]">4.2 Hrs</span>
                    <span className="text-xs text-green-600 font-bold">-0.5 Hrs</span>
                  </div>
                </div>

                <div className="bg-white border-l-4 border-l-red-600 border border-[#C6C6CF]/20 p-4 rounded-xl">
                  <p className="text-[10px] text-[#76767F] font-bold uppercase tracking-wider">Failed Audits Last 24h</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-3xl font-black text-red-600">03</span>
                    <span className="text-[10px] bg-red-50 text-red-700 px-2 py-0.5 rounded font-bold uppercase font-mono">Reject Alerts Sent</span>
                  </div>
                </div>

                <div className="bg-white border border-[#C6C6CF]/20 p-4 rounded-xl">
                  <p className="text-[10px] text-[#76767F] font-bold uppercase tracking-wider">Verified Active Inspectors</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-3xl font-black text-[#0D1B3E]">18</span>
                    <span className="text-xs text-[#76767F] font-semibold">84% Capacity</span>
                  </div>
                </div>

              </div>

              {/* QC orders table */}
              <div className="bg-white border border-[#C6C6CF]/30 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-[#EFF4FF] border-b border-[#C6C6CF]/25 text-[#76767F] font-semibold text-xs tracking-wider uppercase">
                        <th className="p-4 px-6">Order ID</th>
                        <th className="p-4">Completed Vendor</th>
                        <th className="p-4">Kisna Style</th>
                        <th className="p-4">Product Variant</th>
                        <th className="p-4">Date Completed</th>
                        <th className="p-4 text-center">Days Pending</th>
                        <th className="p-4">Auditing Status</th>
                        <th className="p-4 text-right px-6">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {orders.map((order) => (
                        <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 px-6 font-mono font-bold text-[#0D1B3E]">{order.id}</td>
                          <td className="p-4">
                            <div className="flex items-center gap-1.5 font-bold text-slate-800">
                              <span className="w-4 h-4 bg-[#EFF4FF] border border-[#d3e4fe] flex items-center justify-center rounded text-[8px] font-bold text-[#0D1B3E]">
                                {order.assignedVendor ? order.assignedVendor.slice(0, 2).toUpperCase() : "WO"}
                              </span>
                              <span>{order.assignedVendor || "Workshop"}</span>
                            </div>
                          </td>
                          <td className="p-4 text-slate-800 font-medium">{order.style}</td>
                          <td className="p-4 text-[#76767F] font-medium">{order.product}</td>
                          <td className="p-4 text-xs font-semibold text-[#76767F]">{order.dateCompleted || "Today"}</td>
                          <td className="p-4 text-center">
                            <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-600 font-bold text-[10px] border border-red-100">
                              2 Days Limit
                            </span>
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              order.status === OrderStatus.QC_FAILED 
                                ? "bg-red-50 text-red-600 border border-red-200" 
                                : order.status === OrderStatus.QC_IN_REVIEW
                                ? "bg-[#feea9f]/45 text-[#755B00] border border-amber-200"
                                : "bg-blue-50 text-blue-600 border border-blue-200"
                            }`}>
                              {order.status === OrderStatus.QC_FAILED ? "QC FAILED (ALERTE)" : 
                               order.status === OrderStatus.QC_IN_REVIEW ? "QC IN REVIEW" : "PENDING AUDIT"}
                            </span>
                          </td>
                          <td className="p-4 text-right px-6">
                            <button
                              onClick={() => {
                                openQCReviewDrawer(order);
                                if (order.qcChecklist) {
                                  setQcChecklist({ ...order.qcChecklist });
                                } else {
                                  setQcChecklist({
                                    finishPolishing: false,
                                    weightVerification: false,
                                    hallmarkingCheck: false,
                                    prongStability: false,
                                  });
                                }
                                setRemarks(order.qcRemarks || "");
                              }}
                              className="px-4 py-1.5 border border-secondary text-secondary font-bold text-xs rounded-lg hover:bg-secondary/5 transition-colors cursor-pointer"
                            >
                              Review Order Audits
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {renderPaginationFooter()}
              </div>

            </div>
          )}

          {/* TAB 4: PAYMENT & DISPATCH SYSTEM */}
          {tab === "payment" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* Header */}
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-2xl font-black text-[#0D1B3E]">Payment Ledger &amp; Logistics Dispatch</h2>
                  <p className="text-sm text-[#45464E] mt-1">Observe invoice settlement limits, authorize logistics handoff, and generate BlueDart tracking.</p>
                </div>
                <div className="flex gap-2">
                  <button className="flex items-center gap-1.5 px-4 py-2 bg-white border border-[#C6C6CF]/45 text-[#0B1C30] rounded-xl font-bold text-sm hover:bg-[#F8F9FF] transition-all">
                    <Filter className="w-4 h-4 text-[#76767F]" />
                    <span>Invoicing Filter</span>
                  </button>
                </div>
              </div>

              {/* Warning notice banner */}
              <div className="bg-[#0D1B3E] text-white p-4 rounded-xl flex items-center justify-between border-l-4 border-l-[#C9A84C] shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="p-1.5 bg-[#C9A84C]/25 text-[#C9A84C] rounded font-bold font-mono text-xs">i</span>
                  <p className="text-xs font-semibold italic">
                    Security Policy: If payment is not recorded/confirmed within 7 days, the jewelry item registry will auto-disband and trigger restocking.
                  </p>
                </div>
                <button className="text-[#96A9BE] hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Core Payments Table */}
              <div className="bg-white border border-[#C6C6CF]/30 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-5 border-b border-[#EFF4FF]">
                  <h3 className="font-bold text-sm text-[#0D1B3E]">Pending Clearance Invoices</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-[#EFF4FF] border-b border-[#C6C6CF]/25 text-[#76767F] font-semibold text-xs tracking-wider uppercase">
                        <th className="p-4 px-6">Order ID</th>
                        <th className="p-4">Store Name</th>
                        <th className="p-4">City Location</th>
                        <th className="p-4">Kisna Account Officer</th>
                        <th className="p-4">QC Clearance Date</th>
                        <th className="p-4">Overdue Days Limit</th>
                        <th className="p-4">Financial Status</th>
                        <th className="p-4 text-right px-6">Dispatch Authorize</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {paymentPendingOrders.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-[#76767F] text-sm">
                            No orders awaiting payment. Pass QC on orders first — only then they move to the payment ledger (Excel &quot;Ready For Dispatch&quot; stays in QC until cleared).
                          </td>
                        </tr>
                      ) : paymentPendingOrders.map((order) => (
                        <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 px-6 font-mono font-bold text-[#0D1B3E]">{order.id}</td>
                          <td className="p-4 font-bold text-slate-800">{order.store}</td>
                          <td className="p-4 text-slate-700 font-semibold">{order.notes?.includes("Mumbai") ? "Mumbai" : "Surat"}</td>
                          <td className="p-4 text-slate-800 font-medium">{order.notes?.includes("Priya") ? "Priya Singh" : "Rajesh Kumar"}</td>
                          <td className="p-4 text-xs font-semibold text-[#76767F]">{order.qcPassedDate || "18-Oct-23"}</td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] border ${
                                order.status === OrderStatus.PAYMENT_OVERDUE 
                                  ? "bg-red-50 text-red-600 border-red-100" 
                                  : "bg-emerald-50 text-emerald-800 border-emerald-100"
                              }`}>
                                {order.paymentStatusDaysCount || "DAY 3/7"}
                              </span>
                              <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden shrink-0">
                                <div className={`h-full rounded-full ${
                                  order.status === OrderStatus.PAYMENT_OVERDUE ? "bg-red-500" : "bg-emerald-500"
                                }`} style={{ width: order.status === OrderStatus.PAYMENT_OVERDUE ? "100%" : "42%" }} />
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              order.status === OrderStatus.PAYMENT_OVERDUE 
                                ? "bg-red-50 text-red-600 border border-red-100" 
                                : "bg-amber-50 text-amber-600 border border-amber-200"
                            }`}>
                              {order.status === OrderStatus.PAYMENT_OVERDUE ? "OVERDUE LIMIT" : "PAYMENT PENDING"}
                            </span>
                          </td>
                          <td className="p-4 text-right px-6 space-x-2">
                            {order.status === OrderStatus.PAYMENT_OVERDUE && (
                              <button
                                onClick={() => handleMoveToInventory(order.id)}
                                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] rounded transition-colors"
                              >
                                RESTOCK STOCK
                              </button>
                            )}
                            <button
                              onClick={() => handleConfirmPayment(order.id)}
                              className="px-3.5 py-1.5 bg-[#0D1B3E] hover:bg-[#1E3A5F] text-white font-bold text-[10px] rounded transition-all cursor-pointer shadow-sm"
                            >
                              CONFIRM PAYMENT &amp; SHIP
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="p-4 bg-[#EFF4FF] border-t border-[#C6C6CF]/25 text-xs text-[#76767F] font-semibold">
                  {paymentPendingOrders.length} order{paymentPendingOrders.length === 1 ? "" : "s"} awaiting payment clearance
                </div>
              </div>

              {/* Dispatched Logistics Table portion */}
              <div className="bg-white border border-[#C6C6CF]/30 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-5 border-b border-[#EFF4FF] flex items-center gap-3">
                  <div className="p-1.5 bg-[#EFF4FF] rounded-lg">
                    <Truck className="w-4 h-4 text-[#0D1B3E]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[#0D1B3E]">Dispatched Distribution Records</h3>
                    <p className="text-[#76767F] text-xs">Real-time handoff shipments tracking with logistics partner.</p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-[#EFF4FF] border-b border-[#C6C6CF]/25 text-[#76767F] font-semibold text-xs tracking-wider uppercase">
                        <th className="p-4 px-6">Order ID</th>
                        <th className="p-4">Cargo Carrier</th>
                        <th className="p-4">Tracking Waybill #</th>
                        <th className="p-4">Dispatch Stamp</th>
                        <th className="p-4">Active Shipment Status</th>
                        <th className="p-4 text-right px-6">Tracking Link</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {dispatchedOrders.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-[#76767F] text-sm">
                            No dispatched orders yet. Confirm payment on a pending invoice to move it here and trigger WhatsApp tracking updates.
                          </td>
                        </tr>
                      ) : dispatchedOrders.map((order) => (
                        <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 px-6 font-mono font-bold text-[#0D1B3E]">{order.id}</td>
                          <td className="p-4 flex items-center gap-2">
                            <span className="w-6 h-6 bg-[#EFF4FF] border border-[#d3e4fe] flex items-center justify-center rounded">
                              <Truck className="w-3.5 h-3.5 text-[#0D1B3E]" />
                            </span>
                            <span className="font-bold text-slate-800">{order.logisticsPartner || "BlueDart Premium"}</span>
                          </td>
                          <td className="p-4 font-mono font-bold text-[#76767F]">{order.trackingNo || "BD-992100451"}</td>
                          <td className="p-4 text-xs font-semibold text-[#76767F]">{order.dispatchDate || "Current Date"}</td>
                          <td className="p-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-green-50 text-green-700 border border-green-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 animate-pulse"></span>
                              In Transit
                            </span>
                          </td>
                          <td className="p-4 text-right px-6">
                            <a 
                              href="#" 
                              onClick={(e) => { e.preventDefault(); showToast(`Initiating Waybill query for ${order.trackingNo}...`); }}
                              className="text-xs font-bold text-[#C9A84C] hover:underline"
                            >
                              Live Tracking Link
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payments Footer summary details */}
              <div className="bg-[#0D1B3E] text-white p-6 rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-6 shadow-md">
                <div className="border-r border-[#C6C6CF]/20 pr-6">
                  <p className="text-[10px] uppercase tracking-wider text-[#96A9BE] font-bold">Sum Outstanding Invoice Balance</p>
                  <p className="text-2xl font-black text-[#C9A84C] mt-1">
                    INR {paymentPendingOrders.reduce((sum, o) => sum + (o.orderValue || o.totalDpRate || 0), 0).toLocaleString("en-IN")}
                  </p>
                  <div className="w-full h-1 bg-white/10 rounded-full mt-2">
                    <div className="h-full bg-[#C9A84C]" style={{ width: `${paymentPendingOrders.length ? Math.min(100, (paymentPendingOrders.length / Math.max(paymentPendingOrders.length + dispatchedOrders.length, 1)) * 100) : 0}%` }} />
                  </div>
                </div>

                <div className="border-r border-[#C6C6CF]/20 pr-6">
                  <p className="text-[10px] uppercase tracking-wider text-[#96A9BE] font-bold">Unsettled Warnings Pending</p>
                  <p className="text-2xl font-black text-rose-500 mt-1">
                    {paymentPendingOrders.filter((o) => o.status === OrderStatus.PAYMENT_OVERDUE).length} Orders Overdue
                  </p>
                  <p className="text-[9px] text-[#7784AD] uppercase tracking-widest font-bold mt-1">{paymentPendingOrders.length} total pending clearance</p>
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[#96A9BE] font-bold">Carrier Dispatch Ratio</p>
                  <p className="text-2xl font-black text-white mt-1">
                    {dispatchedOrders.length + paymentPendingOrders.length > 0
                      ? `${Math.round((dispatchedOrders.length / (dispatchedOrders.length + paymentPendingOrders.length)) * 100)}%`
                      : "0%"} Dispatched
                  </p>
                  <p className="text-[9px] text-green-400 font-bold mt-1">{dispatchedOrders.length} shipments in transit</p>
                </div>
              </div>

            </div>
          )}

          {/* TAB 5: COMPREHENSIVE SETTINGS / VENDOR DASHBOARD SELECTOR */}
          {tab === "settings" && (
            <div className="space-y-8 max-w-5xl animate-in fade-in duration-200">
              
              {/* Header block */}
              <div className="flex flex-col gap-1.5 bg-white border border-[#C6C6CF]/40 p-6 rounded-2xl shadow-sm">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#C9A84C]">
                  <span className="material-symbols-outlined text-sm">settings</span>
                  <span>Kisna One System Settings</span>
                </div>
                <h2 className="text-2xl font-black text-[#0B1C30]">Operations Control &amp; Integrations</h2>
                <p className="text-xs text-[#76767F]">Verify background routing rules, tune benchmark thresholds, and inspect external supplier interfaces.</p>
              </div>

              {/* Grid of panels */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* SPECIAL VENDOR DASHBOARD VIEW CARD */}
                <div className="bg-white border-2 border-dashed border-[#C9A84C]/40 hover:border-[#C9A84C] p-6 rounded-2xl flex flex-col justify-between shadow-sm hover:shadow-md transition-all duration-200 group">
                  <div className="space-y-3.5">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-900 rounded-lg text-[#C9A84C]">
                        <span className="material-symbols-outlined text-xl">gavel</span>
                      </div>
                      <div>
                        <h3 className="font-extrabold text-sm text-[#0B1C30] uppercase tracking-wider group-hover:text-[#C9A84C] transition-colors">Vendor Dashboard View</h3>
                        <p className="text-[10px] text-amber-700 font-bold uppercase tracking-widest mt-0.5">Stitch Design Environment</p>
                      </div>
                    </div>
                    
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Launch the <strong>Demo Vendor Portal</strong> with 6 pre-seeded orders across assignment, production, QC, payment, and dispatch — ideal for testing the full workflow end-to-end.
                    </p>
                  </div>

                  <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Demo vendor: Demo Workshop Surat</span>
                    <button 
                      onClick={() => {
                        onOpenDemoVendorPortal?.("dashboard");
                        showToast("Demo vendor portal seeded and opened.");
                      }}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
                    >
                      <span>Demo Vendor Portal</span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#C9A84C]" />
                    </button>
                  </div>
                </div>

                {/* SIMULATED SYSTEM CONFIGURATIONS */}
                <div className="bg-white border border-[#C6C6CF]/40 p-6 rounded-2xl flex flex-col justify-between shadow-sm">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-extrabold text-xs text-[#0B1C30] uppercase tracking-wider">Intelligence Assignment Engine</h3>
                      <p className="text-[10px] text-[#76767F]">Automatic routing parameters using supplier capacity targets.</p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between pb-3 border-b border-gray-100 text-xs font-semibold">
                        <div>
                          <p className="text-slate-800">Dynamic Capacity Weight Allocation</p>
                          <p className="text-[9px] text-[#76767F] font-normal">Cap production requests at 90% threshold alerts</p>
                        </div>
                        <input type="checkbox" defaultChecked className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900" />
                      </div>

                      <div className="flex items-center justify-between text-xs font-semibold">
                        <div>
                          <p className="text-slate-800">Laser-Hallmarked Verification Queue</p>
                          <p className="text-[9px] text-[#76767F] font-normal">Redirect failed lots instantly to priority rework benches</p>
                        </div>
                        <input type="checkbox" defaultChecked className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900" />
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 mt-6 border-t border-slate-100 flex justify-end">
                    <button 
                      onClick={() => showToast("Adjusted automated routing configurations.")}
                      className="px-5 py-2.5 bg-[#0D1B3E] text-white hover:bg-indigo-950 font-bold text-xs rounded-xl transition-all"
                    >
                      Apply Routings
                    </button>
                  </div>
                </div>

              </div>

            </div>
          )}

        </div>
      </main>

      {/* MODAL WINDOW: VENDOR ASSIGNMENT INPUT (Control Room Table click) */}
      {assigningOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#0B1C30]/50 backdrop-blur-sm" onClick={() => setAssigningOrder(null)} />
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-[#C6C6CF]/30 relative overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header banner */}
            <div className="bg-[#0D1B3E] p-6 text-white flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold">Allocate Supplier - Order {assigningOrder.id}</h3>
                <p className="text-xs text-[#96A9BE] mt-1 leading-relaxed">Select a jewelry craft partner, expected deadlines, and build priorities.</p>
              </div>
              <button onClick={() => setAssigningOrder(null)} className="p-1 hover:bg-white/10 rounded-lg text-[#96A9BE] hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Inputs Form Body */}
            <div className="p-6 space-y-5">
              
              {/* Select Vendor */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#76767F] uppercase tracking-wider">Select Audited Supplier</label>
                <select
                  value={selectedVendorId}
                  onChange={(e) => setSelectedVendorId(e.target.value)}
                  className="w-full border border-[#C6C6CF]/60 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]"
                >
                  <option value="">Select available supplier...</option>
                  {sortedVendors.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.name}{v.isDemo ? " (Demo)" : ""} — workload {v.capacity}% | TAT {v.tat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Deadlines and priorities */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#76767F] uppercase tracking-wider">Expected TAT (Working Days)</label>
                  <input
                    type="number"
                    value={expectedTatDays}
                    onChange={(e) => setExpectedTatDays(Number(e.target.value))}
                    min={2}
                    max={60}
                    className="w-full border border-[#C6C6CF]/60 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#76767F] uppercase tracking-wider">Logistical Priority</label>
                  <select
                    value={priorityLevel}
                    onChange={(e) => setPriorityLevel(e.target.value)}
                    className="w-full border border-[#C6C6CF]/60 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]"
                  >
                    <option value={PriorityLevel.STANDARD}>Standard Route</option>
                    <option value={PriorityLevel.HIGH}>High Priority</option>
                    <option value={PriorityLevel.EXPRESS}>Express Lane</option>
                    <option value={PriorityLevel.URGENT}>URGENT (EXPRESS)</option>
                  </select>
                </div>
              </div>

              {/* Gupshup notification contacts */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#76767F] uppercase tracking-wider">Store WhatsApp Number</label>
                  <input
                    type="tel"
                    value={assignmentStoreNumber}
                    onChange={(e) => setAssignmentStoreNumber(e.target.value)}
                    placeholder="91XXXXXXXXXX"
                    className="w-full border border-[#C6C6CF]/60 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#76767F] uppercase tracking-wider">Vendor WhatsApp Number</label>
                  <input
                    type="tel"
                    value={assignmentVendorNumber}
                    onChange={(e) => setAssignmentVendorNumber(e.target.value)}
                    placeholder="91XXXXXXXXXX"
                    className="w-full border border-[#C6C6CF]/60 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]"
                  />
                </div>
              </div>

              {/* Memo constraints */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#76767F] uppercase tracking-wider">Specific Design Directives</label>
                <textarea
                  value={assignmentNotes}
                  onChange={(e) => setAssignmentNotes(e.target.value)}
                  placeholder="E.g., Hallmark laser stamp required, prong security tolerances..."
                  rows={3}
                  className="w-full border border-[#C6C6CF]/60 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]"
                />
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 pt-3 border-t border-gray-100">
                <button
                  onClick={() => setAssigningOrder(null)}
                  className="flex-1 py-2.5 bg-gray-50 hover:bg-gray-100 text-[#0B1C30] text-xs font-bold uppercase rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignVendorSubmit}
                  disabled={!selectedVendorId || !assignmentStoreNumber || !assignmentVendorNumber}
                  className={`flex-1 py-2.5 text-xs font-bold uppercase rounded-xl transition-all shadow-md ${
                    selectedVendorId && assignmentStoreNumber && assignmentVendorNumber
                      ? "bg-[#C9A84C] hover:bg-[#ffe08f] text-slate-900" 
                      : "bg-[#EFF4FF] text-[#C6C6CF] cursor-not-allowed"
                  }`}
                >
                  Confirm Assignment
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* MODAL: PAYMENT CONFIRM & DISPATCH */}
      {paymentConfirmOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#0B1C30]/50 backdrop-blur-sm" onClick={() => setPaymentConfirmOrder(null)} />
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-[#C6C6CF]/30 relative overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="bg-[#0D1B3E] p-6 text-white flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold">Confirm Payment &amp; Dispatch — {paymentConfirmOrder.id}</h3>
                <p className="text-xs text-[#96A9BE] mt-1">Record payment clearance and send BlueDart tracking via WhatsApp to store and vendor.</p>
              </div>
              <button onClick={() => setPaymentConfirmOrder(null)} className="p-1 hover:bg-white/10 rounded-lg text-[#96A9BE] hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#76767F] uppercase tracking-wider">Store WhatsApp Number</label>
                  <input
                    type="tel"
                    value={paymentStoreNumber}
                    onChange={(e) => setPaymentStoreNumber(e.target.value)}
                    placeholder="10-digit mobile"
                    className="w-full border border-[#C6C6CF]/60 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#76767F] uppercase tracking-wider">Vendor WhatsApp Number</label>
                  <input
                    type="tel"
                    value={paymentVendorNumber}
                    onChange={(e) => setPaymentVendorNumber(e.target.value)}
                    placeholder="10-digit mobile"
                    className="w-full border border-[#C6C6CF]/60 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]"
                  />
                </div>
              </div>
              <p className="text-xs text-[#76767F]">Messages go to each number you enter via Gupshup (store template + vendor template). Use your own number to test.</p>
              <div className="flex gap-3 pt-3 border-t border-gray-100">
                <button
                  onClick={() => setPaymentConfirmOrder(null)}
                  className="flex-1 py-2.5 bg-gray-50 hover:bg-gray-100 text-[#0B1C30] text-xs font-bold uppercase rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmPaymentSubmit}
                  disabled={!paymentStoreNumber && !paymentVendorNumber}
                  className={`flex-1 py-2.5 text-xs font-bold uppercase rounded-xl transition-all shadow-md ${
                    paymentStoreNumber || paymentVendorNumber
                      ? "bg-[#0D1B3E] hover:bg-[#1E3A5F] text-white"
                      : "bg-[#EFF4FF] text-[#C6C6CF] cursor-not-allowed"
                  }`}
                >
                  Confirm Payment &amp; Ship
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RIGHT DRAWER SIDE PANELS: QC CHECKLIST REVIEWS */}
      {reviewingOrder && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Scrim Overlay */}
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setReviewingOrder(null)}
          />
          
          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-[450px] bg-white border-l border-gray-100 h-full flex flex-col justify-between shadow-2xl relative animate-in slide-in-from-right duration-300">
              
              {/* Header */}
              <div className="p-6 border-b border-[#EFF4FF] bg-slate-50 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-[#0D1B3E]">Quality Inspection Audit</h3>
                  <p className="text-xs text-[#76767F]/80 font-mono mt-1">Order Ref: {reviewingOrder.id}</p>
                </div>
                <button 
                  onClick={() => setReviewingOrder(null)}
                  className="p-1 px-2.5 bg-white border border-gray-100 text-[#76767F] hover:text-[#0B1C30] hover:shadow-sm rounded-lg transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Content Checklist Scroll Block */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                
                {/* Product/Design Details Summary */}
                <div className="bg-[#EFF4FF] p-4 rounded-xl border border-[#C6C6CF]/20">
                  <span className="text-[10px] uppercase tracking-wide text-[#7784AD] font-bold">Style Specs Description</span>
                  <p className="text-sm font-bold text-[#0D1B3E] mt-1">{reviewingOrder.style}</p>
                  <p className="text-xs text-slate-800 mt-1">Assigned Supplier: {reviewingOrder.assignedVendor || "Expert Craftsman"}</p>
                </div>

                {/* Gupshup template recipients */}
                <div className="p-4 bg-white border border-[#C6C6CF]/30 rounded-2xl space-y-3">
                  <div>
                    <p className="text-xs font-bold text-[#0D1B3E] uppercase tracking-wider"> Recipients</p>
                    <p className="text-[10px] text-[#76767F] mt-1">Required before marking QC passed or audit failed.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-[#76767F] uppercase tracking-wider">Store Number</label>
                      <input
                        type="tel"
                        value={qcStoreNumber}
                        onChange={(e) => setQcStoreNumber(e.target.value)}
                        placeholder="91XXXXXXXXXX"
                        className="w-full border border-gray-200 p-2.5 rounded-xl text-xs focus:ring-1 focus:ring-[#0D1B3E]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-[#76767F] uppercase tracking-wider">Vendor Number</label>
                      <input
                        type="tel"
                        value={qcVendorNumber}
                        onChange={(e) => setQcVendorNumber(e.target.value)}
                        placeholder="91XXXXXXXXXX"
                        className="w-full border border-gray-200 p-2.5 rounded-xl text-xs focus:ring-1 focus:ring-[#0D1B3E]"
                      />
                    </div>
                  </div>
                </div>

                {/* Inspection image macro photos */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-[#76767F] uppercase tracking-wider block">Bureau Inspection Media</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="aspect-square bg-[#EFF4FF] rounded-xl border border-dashed border-[#C6C6CF] overflow-hidden relative group">
                      <img 
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuA_rg9mwIbormqoZ7UOKZ6QndtYf7tRIph1Ip6ttOcOP5f3QrGc96pFX6G_nIAovNeicEAyG7Ez2A0yM5DaLyZO2YBtqdpaCJjoH0d7xm_2R58MielNmZsEPThqokStO1kCxlUYiJITqRUmWZ9IjSWAY4Qop6jPMsjU85-jjdetPC9bjGmyIgqPWiyya9pnts14k8O5g83zNCZ2kllAuYwdJCVhyBqHVpkH7uDxSjJp00754wC4YgES41gaFPy_AeVNdrGkcVevq2EJ" 
                        alt="Detailed product close up under bureau light studio standards"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                      />
                    </div>
                    <div className="aspect-square bg-[#EFF4FF] rounded-xl border border-dashed border-[#C6C6CF] overflow-hidden relative group">
                      <img 
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuBvZ6uJRYXDt7aN3u3qLQMwFmB49rvU4jFBYXyzLx_g_WB1ndBcGvUCupAt9BvPPH2Do2tAiC-UbfQERDNvjsQCr_sj20n7zGjneYV5E79tbuNEhf68imIXpW7HaqhbRP9Z2vAJMqbgbFH949ZZNi3qQQaz7fYas-5Iy0JKiyPd5i3d7uAvfMmjZZUtwxQH6Z5z7Eoea3EsZojjuuGKiNaoejYMrfvm1Uox83VQrDQJa7ajqqZzFCNhBYD6NYlzuMEdHuzMphcFSFnB" 
                        alt="Diamond settings under inspection calipers tweezers"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                      />
                    </div>
                  </div>
                </div>

                {/* Audit Checklist Form */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-[#76767F] uppercase tracking-wider block">Bureau QC Checklist</label>
                  <div className="p-4 bg-[#EFF4FF]/50 border border-[#C6C6CF]/20 rounded-2xl space-y-3.5">
                    
                    <label className="flex items-start gap-3.5 p-3 hover:bg-white hover:shadow-sm border border-transparent hover:border-[#C6C6CF]/20 rounded-xl cursor-pointer transition-all">
                      <input 
                        type="checkbox"
                        checked={qcChecklist.finishPolishing}
                        onChange={(e) => setQcChecklist({ ...qcChecklist, finishPolishing: e.target.checked })} 
                        className="w-5 h-5 rounded text-[#0D1B3E] focus:ring-[#C9A84C] border-gray-300 mt-0.5"
                      />
                      <div>
                        <p className="text-xs font-bold text-[#0D1B3E]">Finish &amp; Mirror Polishing</p>
                        <p className="text-[10px] text-[#76767F] italic leading-tight mt-0.5">Ensure no hairline micro incisions or polishing friction scars surface on exterior bands.</p>
                      </div>
                    </label>

                    <label className="flex items-start gap-3.5 p-3 hover:bg-white hover:shadow-sm border border-transparent hover:border-[#C6C6CF]/20 rounded-xl cursor-pointer transition-all">
                      <input 
                        type="checkbox" 
                        checked={qcChecklist.weightVerification}
                        onChange={(e) => setQcChecklist({ ...qcChecklist, weightVerification: e.target.checked })}
                        className="w-5 h-5 rounded text-[#0D1B3E] focus:ring-[#C9A84C] border-gray-300 mt-0.5"
                      />
                      <div>
                        <p className="text-xs font-bold text-[#0D1B3E]">Weight Specification Clearance</p>
                        <p className="text-[10px] text-[#76767F] italic leading-tight mt-0.5">Validate weights match design dispatch directives precisely (Permitted Tolerance +/- 0.05g).</p>
                      </div>
                    </label>

                    <label className="flex items-start gap-3.5 p-3 hover:bg-white hover:shadow-sm border border-transparent hover:border-[#C6C6CF]/20 rounded-xl cursor-pointer transition-all">
                      <input 
                        type="checkbox"
                        checked={qcChecklist.hallmarkingCheck}
                        onChange={(e) => setQcChecklist({ ...qcChecklist, hallmarkingCheck: e.target.checked })} 
                        className="w-5 h-5 rounded text-[#0D1B3E] focus:ring-[#C9A84C] border-gray-300 mt-0.5"
                      />
                      <div>
                        <p className="text-xs font-bold text-[#0D1B3E]">BIS/916 Laser Hallmarking</p>
                        <p className="text-[10px] text-[#76767F] italic leading-tight mt-0.5">Verify laser hallmark certification stamp has been embedded legibly on item inner sleeve.</p>
                      </div>
                    </label>

                    <label className="flex items-start gap-3.5 p-3 hover:bg-white hover:shadow-sm border border-transparent hover:border-[#C6C6CF]/20 rounded-xl cursor-pointer transition-all">
                      <input 
                        type="checkbox"
                        checked={qcChecklist.prongStability}
                        onChange={(e) => setQcChecklist({ ...qcChecklist, prongStability: e.target.checked })} 
                        className="w-5 h-5 rounded text-[#0D1B3E] focus:ring-[#C9A84C] border-gray-300 mt-0.5"
                      />
                      <div>
                        <p className="text-xs font-bold text-[#0D1B3E]">Prong Stability &amp; Setting Force</p>
                        <p className="text-[10px] text-[#76767F] italic leading-tight mt-0.5">Pressure-point validation. Diamonds and focal stones must remain perfectly stable without wiggle.</p>
                      </div>
                    </label>

                  </div>
                </div>

                {/* Audit remarks text */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#76767F] uppercase tracking-wider block">Audit Feedback Memos</label>
                  <textarea 
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Log technical defects, prong settings calibrations, mirror polished remarks..."
                    rows={3}
                    className="w-full border border-gray-200 p-3 rounded-xl text-xs focus:ring-1 focus:ring-[#0D1B3E]"
                  />
                </div>

              </div>

              {/* Action buttons footer */}
              <div className="p-6 border-t border-gray-100 bg-[#EFF4FF]/45 grid grid-cols-2 gap-3.5">
                <button
                  onClick={() => handleQCFail(reviewingOrder.id)}
                  disabled={
                    !(
                      (qcStoreNumber || reviewingOrder?.storeContactNumber || reviewingOrder?.customerPhone) ||
                      (qcVendorNumber || reviewingOrder?.vendorContactNumber)
                    )
                  }
                  className="py-3.5 border border-red-600 hover:bg-red-50 text-red-600 text-[10px] tracking-wider uppercase font-extrabold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Flag Audit FAILED</span>
                </button>
                <button
                  onClick={() => handleQCPass(reviewingOrder.id)}
                  disabled={
                    !(
                      (qcStoreNumber || reviewingOrder?.storeContactNumber || reviewingOrder?.customerPhone) ||
                      (qcVendorNumber || reviewingOrder?.vendorContactNumber)
                    )
                  }
                  className="py-3.5 bg-green-700 hover:bg-green-800 text-white text-[10px] tracking-wider uppercase font-extrabold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-green-700/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#C9A84C]" />
                  <span>Mark QC Passed</span>
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* VENDOR ALERT TOAST — top-right, amber border */}
      {alertToast.visible && (
        <div className="fixed top-5 right-6 z-[110] max-w-sm bg-white border border-amber-400 rounded-2xl shadow-2xl px-5 py-4 flex items-start gap-3 animate-in slide-in-from-top duration-300">
          <span className="mt-0.5 shrink-0 w-8 h-8 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center">
            <Bell className="w-4 h-4 text-amber-500" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#0D1B3E] leading-snug">{alertToast.message}</p>
            {alertToast.sub && (
              <p className="text-[10px] text-[#76767F] mt-1 leading-relaxed line-clamp-2">{alertToast.sub}</p>
            )}
            <button
              className="mt-2 text-[10px] font-medium text-amber-600 hover:underline"
              onClick={() => { setNotificationsOpen(true); setUnseenCount(0); setAlertToast(p => ({ ...p, visible: false })); }}
            >
              View in notifications →
            </button>
          </div>
          <button
            onClick={() => setAlertToast(p => ({ ...p, visible: false }))}
            className="ml-auto shrink-0 text-[#C6C6CF] hover:text-[#0D1B3E] transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* TOAST NOTIFICATION STAMP */}
      {toast.visible && (
        <div className="fixed bottom-6 right-6 z-[100] bg-slate-900 border border-[#C9A84C]/25 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom duration-300">
          <CheckCircle2 className="w-5 h-5 text-[#C9A84C]" />
          <span className="text-xs font-bold leading-tight">{toast.message}</span>
        </div>
      )}

      <NotificationPanel
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        items={opsNotifications}
        title="Kisna Operations Alerts"
        emptyMessage="No operational alerts. Workflow events and queue summaries appear here."
        onSelect={(item) => {
          if (item.actionTab) setTab(item.actionTab);
          setNotificationsOpen(false);
        }}
      />

    </div>
  );
}
