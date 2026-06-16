import React, { useState, useMemo, useEffect } from "react";
import { OrderStatus, PriorityLevel } from "../types.js";
import { 
  TrendingUp, TrendingDown, Eye, Search, Settings, Filter, Download,
  CheckCircle2, XCircle, AlertTriangle, FileText, Check, Clock, ShieldCheck, 
  Truck, ArrowRight, UserCheck, Calendar, Plus, Play, HelpCircle, Store, X, 
  Zap, Award, ListFilter, CircleDot, RefreshCw, Archive, FlaskConical
} from "lucide-react";
import { DEMO_VENDOR_NAME } from "../services/api.js";
import NotificationPanel, { NotificationBell } from "./NotificationPanel.jsx";


export default function VendorPortal({
  orders,
  ordersMeta = { total: 0, page: 1, pages: 1, limit: 200 },
  orderFilters = {},
  onOrderFiltersChange,
  activities,
  vendors,
  selectedVendorName = "",
  onVendorChange,
  setOrders,
  addActivity,
  onRefreshActivities,
  onRefreshOrders,
  tab,
  setTab,
  onSwitchToOperationsPortal,
  isDemoVendor = false,
  onReseedDemo,
  onResetDemoData,
}) {
  // Page search
  const [searchQuery, setSearchQuery] = useState("");
  const [archiveSearch, setArchiveSearch] = useState("");
  const [settingsTabSub, setSettingsTabSub] = useState("general");
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Update Status Modal State
  const [updatingOrder, setUpdatingOrder] = useState(null);
  const [newStatus, setNewStatus] = useState(OrderStatus.IN_PRODUCTION);

  // Success Notification Dialog/Toast
  const [toast, setToast] = useState({ message: "", visible: false });

  const showToast = (message) => {
    setToast({ message, visible: true });
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 4500);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      onRefreshActivities?.();
      onRefreshOrders?.();
    }, 20000);
    return () => clearInterval(interval);
  }, [onRefreshActivities, onRefreshOrders]);

  const vendorName = selectedVendorName || vendors[0]?.name || "Vendor";
  const vendorInitials = vendorName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "V";
  const normalizeName = (value) => String(value || "").trim().toLowerCase();
  const orderVendor = (o) => o.assignedVendor || o.complexity || o.designerName || "";
  const belongsToVendor = (o) => normalizeName(orderVendor(o)) === normalizeName(vendorName);

  const matchesSearch = (o) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return [o.id, o.designNo, o.style, o.customerName, o.store, o.city, o.state].some((v) =>
      String(v || "").toLowerCase().includes(q)
    );
  };

  const vendorOrders = orders.filter((o) => belongsToVendor(o) && matchesSearch(o));

  const goToPage = (page) => {
    onOrderFiltersChange?.({ ...orderFilters, page });
  };

  const renderPaginationFooter = () => (
    <div className="p-4 bg-[#F2F4F7]/60 border-t border-[#C4C6CD]/25 flex flex-wrap gap-3 justify-between items-center text-xs text-[#74777D] font-semibold">
      <span>
        Showing {ordersMeta.total === 0 ? 0 : (ordersMeta.page - 1) * ordersMeta.limit + 1}–
        {Math.min(ordersMeta.page * ordersMeta.limit, ordersMeta.total)} of {ordersMeta.total.toLocaleString("en-IN")} orders for {vendorName}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={ordersMeta.page <= 1}
          onClick={() => goToPage(ordersMeta.page - 1)}
          className="px-3 py-1.5 rounded-lg border border-[#C4C6CD] bg-white disabled:opacity-40"
        >
          Previous
        </button>
        <span className="px-2">Page {ordersMeta.page} / {ordersMeta.pages}</span>
        <button
          type="button"
          disabled={ordersMeta.page >= ordersMeta.pages}
          onClick={() => goToPage(ordersMeta.page + 1)}
          className="px-3 py-1.5 rounded-lg border border-[#C4C6CD] bg-white disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );

  // Handlers
  const notifyOps = (title, description, type, meta = {}) => {
    const posted = addActivity?.(title, description, type, { vendorName, ...meta });
    Promise.resolve(posted).finally(() => {
      onRefreshActivities?.();
      onRefreshOrders?.();
    });
  };

  const handleAcceptOrder = (orderId) => {
    setOrders(prevOrders => 
      prevOrders.map(order => 
        order.id === orderId
          ? {
              ...order,
              status: OrderStatus.IN_PRODUCTION,
              assignedVendor: order.assignedVendor || vendorName,
              assignedDatApproved: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
            }
          : order
      )
    );

    notifyOps(
      `Vendor accepted order ${orderId}`,
      `${vendorName} accepted the assignment. Order moved to In Production — visible to Kisna Operations.`,
      "success",
      { category: "Production", orderId }
    );

    showToast(`Order ${orderId} accepted successfully! Moved to Active Production.`);
  };

  const handleRejectOrder = (orderId) => {
    setOrders(prevOrders => 
      prevOrders.map(order => 
        order.id === orderId
          ? {
              ...order,
              status: OrderStatus.UNASSIGNED,
              assignedVendor: null,
              expectedTatDays: null
            }
          : order
      )
    );

    notifyOps(
      `Vendor rejected order ${orderId}`,
      `${vendorName} rejected the assignment. Order returned to the unassigned queue for Kisna Operations.`,
      "error",
      { category: "Assignment", orderId }
    );

    showToast(`Order ${orderId} rejected. Returned to Operations Control assignment reservoir.`);
  };

  const handleUpdateStatusSubmit = () => {
    if (!updatingOrder) return;

    setOrders(prevOrders => 
      prevOrders.map(order => 
        order.id === updatingOrder.id
          ? {
              ...order,
              status: newStatus,
              ...(newStatus === OrderStatus.READY_FOR_QC ? { 
                dateCompleted: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) 
              } : {})
            }
          : order
      )
    );

    const isQcReady = newStatus === OrderStatus.READY_FOR_QC;
    const statusLabel = isQcReady ? "Ready for QC" : newStatus.replace(/_/g, " ");

    notifyOps(
      isQcReady
        ? `Vendor submitted order ${updatingOrder.id} for QC`
        : `Vendor updated order ${updatingOrder.id}`,
      `${vendorName} changed status to ${statusLabel}. Kisna Operations can review in the QC desk.`,
      isQcReady ? "info" : "primary",
      { category: isQcReady ? "QC" : "Production", orderId: updatingOrder.id }
    );

    showToast(`Order ${updatingOrder.id} status updated to: ${statusLabel}.`);
    setUpdatingOrder(null);
  };

  const handleTriggerQuickUpdate = (order, nextS) => {
    setOrders(prevOrders => 
      prevOrders.map(o => 
        o.id === order.id
          ? {
              ...o,
              status: nextS,
              ...(nextS === OrderStatus.READY_FOR_QC ? { 
                dateCompleted: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) 
              } : {})
            }
          : o
      )
    );

    const isQcReady = nextS === OrderStatus.READY_FOR_QC;
    const statusLabel = isQcReady ? "Ready for QC" : nextS.replace(/_/g, " ");

    notifyOps(
      isQcReady
        ? `Vendor submitted order ${order.id} for QC`
        : `Vendor updated order ${order.id}`,
      `${vendorName} changed status to ${statusLabel}. Kisna Operations notified.`,
      isQcReady ? "info" : "primary",
      { category: isQcReady ? "QC" : "Production", orderId: order.id }
    );

    showToast(`Order ${order.id} status updated to: ${statusLabel}.`);
  };

  // Metrics — show ops-assigned orders and legacy Excel-linked unassigned rows
  const newOrders = vendorOrders.filter(
    (o) =>
      o.status === OrderStatus.PENDING_VENDOR_REVIEW ||
      (o.status === OrderStatus.UNASSIGNED && belongsToVendor(o))
  );
  const activeOrders = vendorOrders.filter(
    (o) => o.status === OrderStatus.IN_PRODUCTION || o.status === OrderStatus.FINISHING
  );
  const paymentReadyOrders = vendorOrders.filter((o) =>
    [OrderStatus.AWAITING_PAYMENT, OrderStatus.PAYMENT_OVERDUE].includes(o.status)
  );
  const dispatchedOrders = vendorOrders.filter((o) => o.status === OrderStatus.DISPATCHED);
  const completedOrders = vendorOrders.filter((o) =>
    [
      OrderStatus.DISPATCHED,
      OrderStatus.READY_FOR_QC,
      OrderStatus.COMPLETED_ARCHIVED,
      OrderStatus.AWAITING_PAYMENT,
    ].includes(o.status)
  );

  const pendingQCForSupplier = vendorOrders.filter((o) =>
    [OrderStatus.READY_FOR_QC, OrderStatus.QC_IN_REVIEW, OrderStatus.QC_FAILED].includes(o.status)
  );

  const qcFailedOrders = vendorOrders.filter((o) => o.status === OrderStatus.QC_FAILED);

  const activityBelongsToVendor = (act) => {
    const vn = normalizeName(vendorName);
    if (act.vendorName && normalizeName(act.vendorName) === vn) return true;
    const text = `${act.title} ${act.description}`.toLowerCase();
    if (text.includes(vn)) return true;
    if (act.category === "QC" && act.vendorName && normalizeName(act.vendorName) === vn) return true;
    if (act.category === "Assignment" && act.vendorName && normalizeName(act.vendorName) === vn) return true;
    return false;
  };

  const sortedNewOrders = [...newOrders].sort((a, b) => {
    if (a.status === OrderStatus.PENDING_VENDOR_REVIEW && b.status !== OrderStatus.PENDING_VENDOR_REVIEW) return -1;
    if (b.status === OrderStatus.PENDING_VENDOR_REVIEW && a.status !== OrderStatus.PENDING_VENDOR_REVIEW) return 1;
    return 0;
  });

  const vendorNotifications = useMemo(() => {
    const queue = [];
    const pendingReview = vendorOrders.filter((o) => o.status === OrderStatus.PENDING_VENDOR_REVIEW);
    if (pendingReview.length > 0) {
      queue.push({
        id: "vendor-assigned",
        category: "Assignment",
        title: `${pendingReview.length} new assignment${pendingReview.length > 1 ? "s" : ""} from Kisna Ops`,
        description: `Orders assigned to ${vendorName} — accept or reject in New Orders Batch.`,
        time: "Just now",
        actionTab: "dashboard",
      });
    }
    if (newOrders.length > pendingReview.length) {
      queue.push({
        id: "vendor-new",
        category: "Assignment",
        title: `${newOrders.length} orders in your queue`,
        description: "Pending acceptance or Excel-linked unassigned work.",
        time: "Live",
        actionTab: "dashboard",
      });
    }
    if (qcFailedOrders.length > 0) {
      queue.push({
        id: "vendor-qc-fail",
        category: "QC",
        title: `${qcFailedOrders.length} QC failure${qcFailedOrders.length > 1 ? "s" : ""} — rework required`,
        description: "Kisna bureau flagged quality issues. Check remarks and resubmit.",
        time: "Live",
        actionTab: "dashboard",
      });
    }
    if (paymentReadyOrders.length > 0) {
      queue.push({
        id: "vendor-payment",
        category: "Payment",
        title: `${paymentReadyOrders.length} order${paymentReadyOrders.length > 1 ? "s" : ""} passed QC — payment stage`,
        description: "Your work cleared QC and is awaiting Kisna payment & dispatch.",
        time: "Live",
        actionTab: "completed",
      });
    }
    if (dispatchedOrders.length > 0) {
      queue.push({
        id: "vendor-dispatch",
        category: "Dispatch",
        title: `${dispatchedOrders.length} order${dispatchedOrders.length > 1 ? "s" : ""} dispatched`,
        description: "Payment cleared and shipment handed to logistics.",
        time: "Live",
        actionTab: "completed",
      });
    }
    if (activeOrders.length > 0) {
      queue.push({
        id: "vendor-active",
        category: "Production",
        title: `${activeOrders.length} orders in active fabrication`,
        description: "God WIP and in-production workshop jobs.",
        time: "Live",
        actionTab: "active",
      });
    }
    if (pendingQCForSupplier.length > 0) {
      queue.push({
        id: "vendor-qc",
        category: "QC",
        title: `${pendingQCForSupplier.length} orders in bureau QC pipeline`,
        description: "Submitted for Kisna quality audit or awaiting rework.",
        time: "Live",
        actionTab: "dashboard",
      });
    }
    const vendorActivities = activities
      .filter(activityBelongsToVendor)
      .map((act) => ({
        ...act,
        actionTab:
          act.category === "QC" || act.category === "Assignment" ? "dashboard"
          : act.category === "Payment" || act.category === "Dispatch" ? "completed"
          : act.category === "Production" ? "active"
          : act.title?.toLowerCase().includes("accept") || act.title?.toLowerCase().includes("assign") ? "dashboard"
          : act.title?.toLowerCase().includes("qc") ? "dashboard"
          : act.title?.toLowerCase().includes("payment") || act.title?.toLowerCase().includes("dispatch") ? "completed"
          : "completed",
      }));
    return [...queue, ...vendorActivities];
  }, [
    newOrders.length,
    activeOrders.length,
    pendingQCForSupplier.length,
    qcFailedOrders.length,
    paymentReadyOrders.length,
    dispatchedOrders.length,
    vendorName,
    activities,
    vendorOrders,
  ]);

  const notificationCount = vendorNotifications.length;

  return (
    <div className="vendor-portal-minimal flex h-[100dvh] font-sans antialiased text-[#191C1E] overflow-hidden">
      
      {/* SIDEBAR NAVIGATION SHELL */}
      <aside className="vendor-sidebar w-64 flex flex-col justify-between p-6 z-50 shrink-0 overflow-y-auto">
        <div>
          {/* Logo Brand Header */}
          <div className="px-2 mb-8 flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-kisna-gold/10 border border-kisna-gold/30">
                <span className="font-mono text-lg font-black text-kisna-gold">{vendorInitials}</span>
              </div>
              <span className="text-lg font-black tracking-tight text-white">{vendorName}</span>
            </div>
            <span className="text-xs text-kisna-gold/60 tracking-widest uppercase font-bold">Kisna One Vendor</span>
            {isDemoVendor && (
              <span className="mt-2 inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/20 border border-amber-400/40 text-amber-200 text-[10px] font-bold uppercase tracking-wider">
                <FlaskConical className="w-3 h-3" />
                Demo Mode
              </span>
            )}
            {vendors.length > 1 && (
              <select
                value={vendorName}
                onChange={(e) => onVendorChange?.(e.target.value)}
                className="mt-3 w-full rounded-lg border border-white/15 bg-white/10 text-white text-xs font-semibold px-2 py-2 focus:outline-none focus:ring-2 focus:ring-kisna-gold/40"
              >
                {vendors.map((v) => (
                  <option key={v.id} value={v.name} className="text-slate-900">
                    {v.name}{v.isDemo ? " (Demo)" : ""} ({v.orderCount ?? 0})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <button
              onClick={() => setTab("dashboard")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-150 ${
                tab === "dashboard"
                  ? "font-bold border-l-4 border-kisna-gold text-kisna-gold"
                  : "text-white/50 hover:bg-white/[0.08] hover:text-white/90"
              }`}
              style={tab === "dashboard" ? {background:"rgba(201,168,76,0.15)"} : undefined}
            >
              <span className="material-symbols-outlined text-[20px] fill-current">dashboard</span>
              <span className="text-sm font-semibold">New Orders Batch</span>
              {newOrders.length > 0 && (
                <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-extrabold text-kisna-gold bg-kisna-gold/10 border border-kisna-gold/30">
                  {newOrders.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setTab("active")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-150 ${
                tab === "active"
                  ? "font-bold border-l-4 border-kisna-gold text-kisna-gold"
                  : "text-white/50 hover:bg-white/[0.08] hover:text-white/90"
              }`}
              style={tab === "active" ? {background:"rgba(201,168,76,0.15)"} : undefined}
            >
              <span className="material-symbols-outlined text-[20px]">pending_actions</span>
              <span className="text-sm font-semibold">Active Production</span>
              {activeOrders.length > 0 && (
                <span className="ml-auto text-xs px-2 py-0.5 font-bold rounded-full text-white/70" style={{background:"rgba(255,255,255,0.1)"}}>
                  {activeOrders.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setTab("completed")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-150 ${
                tab === "completed"
                  ? "font-bold border-l-4 border-kisna-gold text-kisna-gold"
                  : "text-white/50 hover:bg-white/[0.08] hover:text-white/90"
              }`}
              style={tab === "completed" ? {background:"rgba(201,168,76,0.15)"} : undefined}
            >
              <span className="material-symbols-outlined text-[20px]">task_alt</span>
              <span className="text-sm font-semibold">Shipment History</span>
              {completedOrders.length > 0 && (
                <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-bold text-white/40" style={{background:"rgba(255,255,255,0.07)"}}>
                  {completedOrders.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setTab("settings")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-150 ${
                tab === "settings"
                  ? "font-bold border-l-4 border-kisna-gold text-kisna-gold"
                  : "text-white/50 hover:bg-white/[0.08] hover:text-white/90"
              }`}
              style={tab === "settings" ? {background:"rgba(201,168,76,0.15)"} : undefined}
            >
              <span className="material-symbols-outlined text-[20px]">settings</span>
              <span className="text-sm font-semibold">Portal Settings</span>
            </button>
          </nav>
        </div>

        {/* Brand Handoff Switcher */}
        <div className="pt-6 flex flex-col gap-3" style={{borderTop:"1px solid rgba(201,168,76,0.2)"}}>
          <div className="flex items-center gap-3 p-2 rounded-xl" style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(201,168,76,0.12)"}}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs bg-kisna-gold text-kisna-dark">
              RD
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-xs text-white break-words">{vendorName}</p>
              <p className="text-[10px] uppercase tracking-wider font-bold text-kisna-gold/60">Verified Goldsmith</p>
            </div>
          </div>
          <button
            onClick={onSwitchToOperationsPortal}
            className="w-full py-2.5 text-xs font-bold uppercase rounded-lg transition-all cursor-pointer bg-kisna-gold text-kisna-dark hover:bg-kisna-gold-light"
          >
            Switch to Admin Cockpit
          </button>
        </div>
      </aside>

      {/* MAIN CANVAS */}
      <main className="relative z-10 flex-grow flex flex-col min-w-0 h-full overflow-hidden">
        
        {/* TOP BAR */}
        <header className="h-16 vendor-surface border-b flex items-center justify-between px-10 shrink-0 z-10">
          <div className="flex items-center gap-4 flex-1 max-w-sm">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-[#74777D] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search vendor orders..."
                className="w-full bg-[#F2F4F7] border border-[#C4C6CD] rounded-full py-1.5 pl-9 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-[#785D00]/50 text-[#191C1E]"
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right hidden md:block">
              <p className="text-xs font-semibold text-[#162839]/80 leading-none">Welcome back, {vendorName}</p>
              <p className="text-[10px] text-[#74777D] mt-1 uppercase font-bold tracking-wider">Surat, Gujarat, IN</p>
            </div>

            <div className="flex items-center gap-1.5 border-l border-[#C4C6CD] pl-6">
              <NotificationBell
                count={notificationCount}
                onClick={() => {
                  onRefreshActivities?.();
                  onRefreshOrders?.();
                  setNotificationsOpen(true);
                }}
                className="hover:bg-[#F2F4F7]"
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full border border-gray-200 overflow-hidden shadow-sm">
                <img 
                  alt="Jeweler expert profile" 
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuA6MW63kJ1x0MwKCd8ikOqmKp-3Q011sRJEvR-U4oNP0z0T8DvUr4yUg_Ysn62nyJ5EwwlavgvTbP8uCpsQWorzkC7aOPi-zHNnzjVyl0_WtxoLZ3j4281ekDJ_9sWYBpL6lHVmiDOLzGsd7NhW9jGiWPbEaWmqlK71HxKxdiYsN8MhjDYkcthz0okh35JG31avJgxQ6xS95w9cX0nXg7935TAq7q6Kfq3TUmSr20n4nSAbf0OVcuYMhH4ZwopmCbcTYJfDPEhzvfLO"
                  className="w-full h-full object-cover" 
                />
              </div>
            </div>
          </div>
        </header>

        {/* PORTAL MAIN TAB SCROLL SECTION */}
        <div className="flex-grow overflow-y-auto p-10 custom-scrollbar">

          {isDemoVendor && (
            <div className="mb-6 p-4 rounded-xl border-2 border-amber-400/50 bg-amber-50 flex flex-wrap gap-4 items-center justify-between">
              <div className="flex items-start gap-3">
                <FlaskConical className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-amber-900">Demo Vendor Portal — {DEMO_VENDOR_NAME}</p>
                  <p className="text-xs text-amber-800 mt-1 max-w-2xl">
                    6 sample orders seeded across the workflow: accept assignment → production → QC → payment → dispatch.
                    Use <strong>DEMO-KG-1001</strong> to test accept/reject. Run QC on <strong>DEMO-KG-1003</strong> from Operations.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={async () => {
                  await onResetDemoData?.();
                  onRefreshOrders?.();
                  showToast("Demo data reset to fresh sample orders.");
                }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shrink-0"
              >
                Reset Demo Data
              </button>
            </div>
          )}

          {/* TAB 1: DETAILED NEW ORDERS DASHBOARD WITH ACTION CARDS */}
          {tab === "dashboard" && (
            <div className="space-y-8 animate-in fade-in duration-200">
              
              {/* Header Title block */}
              <section className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-kisna-navy bg-white/70 border border-kisna-gold/20 p-1 px-3.5 rounded-lg w-max">
                  <span>New Batch Allocated</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-kisna-gold"></span>
                  <span>/</span>
                  <span>Updated 2 mins ago</span>
                </div>
                <h1 className="text-3xl font-extrabold tracking-tight text-[#162839]">New Pending Orders — {vendorName}</h1>
                <p className="text-[#43474C] text-sm">Review, evaluate capacities, and accept incoming luxury gold/diamond orders from Kisna brand managers.</p>
              </section>

              {/* Grid of New Orders cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {sortedNewOrders.map((order) => (
                  <div key={order.id} className="vendor-surface border rounded-xl overflow-hidden transition-colors duration-200 hover:border-kisna-gold/50">
                    
                    {/* Header */}
                    <div className="p-6 border-b border-[#ECEEF1] flex justify-between items-start">
                      <div>
                        <span className="text-[10px] text-[#74777D] font-bold uppercase tracking-wider block">Incoming Order Ref</span>
                        <h3 className="text-lg font-extrabold text-[#162839]">{order.id}</h3>
                      </div>
                      <span className="px-3.5 py-1.5 bg-kisna-gold/10 border border-kisna-gold/20 text-[#162839] rounded-lg text-xs font-bold">
                        {order.status === OrderStatus.PENDING_VENDOR_REVIEW ? "Assigned by Kisna Ops" : "Pending Review"}
                      </span>
                    </div>

                    {/* Specs Grid */}
                    <div className="p-6 grid grid-cols-2 gap-6 bg-[#F2F4F7]/40">
                      <div className="space-y-1">
                        <span className="text-[10px] text-[#74777D] uppercase tracking-wider font-bold">Kisna Design Style</span>
                        <p className="text-sm font-bold text-[#162839]">{order.designNo || order.style}</p>
                        <p className="text-[10px] text-[#74777D]">{order.designCategory || order.style}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-[#74777D] uppercase tracking-wider font-bold">Gold Specs</span>
                        <p className="text-sm font-bold text-[#162839]">{order.goldWeight ?? "-"}g / {order.kt || "-"}</p>
                        <p className="text-[10px] text-[#74777D]">Color {order.color || "-"} / Size {order.size || "Std"}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-[#74777D] uppercase tracking-wider font-bold">Customer / Destination</span>
                        <p className="text-sm font-bold text-[#162839]">{order.customerName || order.store}</p>
                        <p className="text-[10px] text-[#74777D]">{order.city || "City"}, {order.state || "State"}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-[#74777D] uppercase tracking-wider font-bold">Qty / Delivery</span>
                        <p className="text-sm font-bold text-amber-700">{order.qty} Unit / Bal {order.balanceQty ?? order.qty}</p>
                        <p className="text-[10px] text-[#74777D]">{order.expectedDeliveryDate || `${order.expectedTatDays || 7} Days Expected`}</p>
                      </div>
                    </div>

                    {/* Notes if available */}
                    {order.notes && (
                      <div className="px-6 py-3.5 bg-yellow-50/50 border-t border-b border-[#C4C6CD]/20 text-xs italic text-amber-800">
                        Design Note: {order.notes}
                      </div>
                    )}

                    {/* Accept / Reject actions */}
                    <div className="p-6 bg-white flex justify-end gap-3.5">
                      <button
                        onClick={() => handleRejectOrder(order.id)}
                        className="px-6 py-2.5 border border-[#C4C6CD] text-[#43474C] rounded-lg text-xs font-bold hover:bg-[#F2F4F7] transition-colors"
                      >
                        Reject Order
                      </button>
                      <button
                        onClick={() => handleAcceptOrder(order.id)}
                        className="px-6 py-2.5 bg-kisna-gold hover:bg-kisna-gold-light text-kisna-dark rounded-lg text-xs font-bold transition-colors active:translate-y-px"
                      >
                        Accept Order
                      </button>
                    </div>

                  </div>
                ))}

                {newOrders.length === 0 && (
                  <div className="col-span-2 p-10 vendor-surface border rounded-xl text-center space-y-4">
                    <div className="text-gray-300 text-xl font-bold font-mono">No New Orders Pending</div>
                    <p className="text-xs text-gray-500">
                      No unassigned orders for {vendorName} on this page ({ordersMeta.total.toLocaleString("en-IN")} total linked in MongoDB).
                      Switch to <strong>Active Production</strong> for God WIP / in-fabrication jobs.
                    </p>
                  </div>
                )}
              </div>

              {/* Core portal dashboard statistics */}
              <section className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
                
                <div className="p-5 vendor-surface border rounded-xl flex items-center gap-4">
                  <div className="w-12 h-12 bg-kisna-gold/10 border border-kisna-gold/20 rounded-lg flex items-center justify-center text-kisna-navy">
                    <span className="material-symbols-outlined text-[24px]">pending</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#74777D] font-bold uppercase tracking-wider block">Pending Workshop Approvals</span>
                    <p className="text-lg font-black text-[#162839]">{newOrders.length} Orders</p>
                  </div>
                </div>

                <div className="p-5 vendor-surface border rounded-xl flex items-center gap-4">
                  <div className="w-12 h-12 bg-kisna-gold/10 border border-kisna-gold/20 rounded-lg flex items-center justify-center text-kisna-navy">
                    <span className="material-symbols-outlined text-[24px]">precision_manufacturing</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#74777D] font-bold uppercase tracking-wider block">Under Jewelry Production</span>
                    <p className="text-lg font-black text-[#162839]">{activeOrders.length} Active</p>
                  </div>
                </div>

                <div className="p-5 vendor-surface border rounded-xl flex items-center gap-4">
                  <div className="w-12 h-12 bg-kisna-gold/10 border border-kisna-gold/20 rounded-lg flex items-center justify-center text-kisna-navy">
                    <span className="material-symbols-outlined text-[24px]">verified</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#74777D] font-bold uppercase tracking-wider block">Monthly Handoff Target</span>
                    <p className="text-lg font-black text-[#162839]">98.4% On-Time</p>
                  </div>
                </div>

              </section>

              {/* QC status notes for supplier transparency */}
              {pendingQCForSupplier.length > 0 && (
                <div className="vendor-surface border p-6 rounded-xl">
                  <h3 className="text-sm font-bold text-[#162839] mb-4">Bureau QC Activity Feed</h3>
                  <div className="space-y-3">
                    {pendingQCForSupplier.map(o => (
                      <div key={o.id} className="p-4 bg-white border border-[#C4C6CD]/30 rounded-xl flex items-center justify-between text-xs font-semibold">
                        <div className="flex items-center gap-3">
                          <CircleDot className={`w-3.5 h-3.5 ${
                            o.status === OrderStatus.QC_FAILED ? "text-red-500 fill-current" : 
                            o.status === OrderStatus.READY_FOR_QC ? "text-blue-500 fill-current" : "text-amber-500 animate-pulse fill-current"
                          }`} />
                          <div>
                            <span className="font-mono font-bold text-[#162839]">{o.id}</span>
                            <span className="text-slate-500 ml-1">({o.style})</span>
                            {o.qcRemarks && <p className="text-[10px] text-[#74777D] mt-1 normal-case leading-snug">Remarks: "{o.qcRemarks}"</p>}
                          </div>
                        </div>

                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          o.status === OrderStatus.QC_FAILED ? "bg-red-50 text-red-600" :
                          o.status === OrderStatus.QC_IN_REVIEW ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-600"
                        }`}>
                          {o.status === OrderStatus.QC_FAILED ? "QC REJECT REDO" : 
                           o.status === OrderStatus.QC_IN_REVIEW ? "REVIEWING BY BUREAU" : "SUBMITTED FOR AUDIT"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Payment & dispatch visibility for vendor */}
              {(paymentReadyOrders.length > 0 || dispatchedOrders.length > 0) && (
                <div className="vendor-surface border p-6 rounded-xl space-y-4">
                  <h3 className="text-sm font-bold text-[#162839]">Payment &amp; Dispatch Tracker</h3>
                  {paymentReadyOrders.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">QC Passed — Awaiting Payment</p>
                      {paymentReadyOrders.map((o) => (
                        <div key={o.id} className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex justify-between items-center text-xs">
                          <span className="font-mono font-bold text-[#162839]">{o.id}</span>
                          <span className="text-emerald-700 font-bold">{o.qcPassedDate || "QC cleared"}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {dispatchedOrders.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Dispatched Shipments</p>
                      {dispatchedOrders.map((o) => (
                        <div key={o.id} className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex justify-between items-center text-xs">
                          <span className="font-mono font-bold text-[#162839]">{o.id}</span>
                          <span className="text-blue-700 font-bold">{o.trackingNo || o.logisticsPartner || "In transit"}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {renderPaginationFooter()}

            </div>
          )}

          {/* TAB 2: ACTIVE PRODUCTION WORKFLOW SCHEDULE */}
          {tab === "active" && (
            <div className="space-y-8 animate-in fade-in duration-200">
              
              {/* Header Title block */}
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-[#162839] mb-1">Active Production Logs — {vendorName}</h2>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex px-3 py-1 bg-[#EFF4FF] border border-[#d1e4fb] text-[#162839] rounded-full text-xs font-bold">
                      {activeOrders.length} Active Orders
                    </span>
                    {activeOrders.filter((o) => o.status === OrderStatus.FINISHING).length > 0 && (
                      <span className="inline-flex px-3 py-1 bg-amber-50 border border-amber-200 text-amber-700 rounded-full text-xs font-bold">
                        {activeOrders.filter((o) => o.status === OrderStatus.FINISHING).length} Finishing
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => showToast(`Workshop cut sheets prepared for ${activeOrders.length} active ${vendorName} orders.`)}
                  className="px-5 py-2.5 border border-[#C4C6CD] bg-white rounded-xl text-xs font-bold hover:bg-[#F2F4F7] transition-all flex items-center gap-2"
                >
                  <Download className="w-4 h-4 text-[#C9A84C]" />
                  <span>Download Workshop Cut sheets</span>
                </button>
              </div>

              {/* Bento diagnostics overview values */}
              <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                <div className="bg-white border border-[#C4C6CD] p-6 rounded-xl flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-4">
                    <span className="p-2 bg-[#feea9f]/40 text-[#755D00] rounded-lg">
                      <Zap className="w-4 h-4 fill-current" />
                    </span>
                    <span className="text-xs text-green-700 font-bold">+12% vs last week</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#74777D] font-bold uppercase tracking-wider block">Daily Goldsmith Capacity</span>
                    <h3 className="text-3xl font-extrabold text-[#162839] mt-1 font-mono">84%</h3>
                  </div>
                </div>

                <div className="bg-white border border-[#C4C6CD] p-6 rounded-xl md:col-span-2 flex items-center justify-between relative overflow-hidden">
                  <div className="z-10">
                    <span className="text-[10px] text-[#74777D] font-bold uppercase tracking-wider block">Projected Fabrication Delivery</span>
                    <h3 className="text-2xl font-black text-[#162839] mt-1 mb-4 leading-none">Next 48 Hours</h3>
                    <div className="flex gap-1.5">
                      <div className="h-1.5 w-16 bg-[#C9A84C] rounded-full"></div>
                      <div className="h-1.5 w-16 bg-[#C9A84C] rounded-full"></div>
                      <div className="h-1.5 w-16 bg-[#C9A84C] rounded-full opacity-35"></div>
                      <div className="h-1.5 w-16 bg-[#C4C6CD] rounded-full opacity-20"></div>
                    </div>
                  </div>
                  <div className="absolute -right-6 -bottom-6 text-gray-100 opacity-60">
                    <span className="material-symbols-outlined text-[120px]">schedule</span>
                  </div>
                </div>

              </section>

              {/* Operations production schedule table */}
              <div className="bg-white border border-[#C4C6CD] rounded-2xl overflow-hidden shadow-sm kisna-table-wrap">
                <div className="px-6 py-4 border-b border-[#ECEEF1] bg-[#F2F4F7]/30 flex justify-between items-center">
                  <span className="text-xs font-bold text-[#162839]">Workshop Production Board</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse min-w-[900px]">
                    <thead>
                      <tr className="bg-white border-b border-[#C4C6CD]/25 text-[#74777D] font-bold text-xs uppercase tracking-wider">
                        <th className="p-4 px-6">Order ID</th>
                        <th className="p-4">Kisna Style No.</th>
                        <th className="p-4">Gold Specs</th>
                        <th className="p-4">Customer / City</th>
                        <th className="p-4">Allocated Date</th>
                        <th className="p-4">Expected Completion</th>
                        <th className="p-4">Current Workshop Status</th>
                        <th className="p-4 text-right px-6">Workshop Advancements</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {activeOrders.map((order) => {
                        const isLate = order.id === "#KG-1043";

                        return (
                          <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-4 px-6 font-mono font-bold text-[#162839]">{order.id}</td>
                            <td className="p-4">
                              <div className="flex items-center gap-3 font-semibold text-slate-800">
                                <span className="w-8 h-8 rounded bg-[#F2F4F7] border border-[#C4C6CD] flex items-center justify-center text-[#74777D]">
                                  <span className="material-symbols-outlined text-sm">diamond</span>
                                </span>
                                <div>
                                  <p>{order.designNo || order.style}</p>
                                  <p className="text-[10px] text-[#74777D]">{order.designCategory || order.product}</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-4 text-xs font-semibold text-[#74777D]">
                              <p>{order.goldWeight ?? "-"}g / {order.kt || "-"}</p>
                              <p>{order.color || "-"} / {order.size || "Std"} / {order.collection || "Collection"}</p>
                            </td>
                            <td className="p-4 text-xs font-semibold text-[#74777D]">
                              <p className="text-slate-800">{order.customerName || order.store}</p>
                              <p>{order.city || "City"}, {order.state || "State"}</p>
                            </td>
                            <td className="p-4 text-xs font-semibold text-[#74777D]">{order.assignedDatApproved || "Oct 20, 2023"}</td>
                            <td className="p-4">
                              {isLate ? (
                                <div className="flex flex-col">
                                  <span className="text-red-600 font-bold text-xs">Oct 25 (Late)</span>
                                  <span className="text-[9px] text-[#74777D] font-mono font-semibold">Due 2 days ago</span>
                                </div>
                              ) : (
                                <span className="text-xs font-semibold text-slate-800">Oct 29, 2023</span>
                              )}
                            </td>
                            <td className="p-4">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold leading-none ${
                                order.status === OrderStatus.FINISHING 
                                  ? "bg-[#fed977]/30 text-[#755B00]" 
                                  : "bg-blue-50 text-blue-800"
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  order.status === OrderStatus.FINISHING ? "bg-[#755B00]" : "bg-blue-500 animate-pulse"
                                }`} />
                                {order.status === OrderStatus.FINISHING ? "Finishing" : "In Fabrication"}
                              </span>
                            </td>
                            <td className="p-4 text-right px-6 space-x-2">
                              {order.status === OrderStatus.IN_PRODUCTION ? (
                                <button
                                  onClick={() => handleTriggerQuickUpdate(order, OrderStatus.FINISHING)}
                                  className="px-3.5 py-1.5 bg-kisna-gold hover:bg-kisna-gold-light text-kisna-dark border-none font-bold text-xs rounded"
                                >
                                  Mark Finishing
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleTriggerQuickUpdate(order, OrderStatus.READY_FOR_QC)}
                                  className="px-3.5 py-1.5 bg-kisna-gold hover:bg-kisna-gold-light text-kisna-dark font-bold text-xs rounded"
                                >
                                  Submit Bureau QC
                                </button>
                              )}
                              
                              <button
                                onClick={() => {
                                  setUpdatingOrder(order);
                                  setNewStatus(order.status);
                                }}
                                className="text-xs text-[#74777D] hover:text-[#162839] hover:underline px-2.5 py-1.5 font-bold"
                              >
                                Options
                              </button>
                            </td>
                          </tr>
                        );
                      })}

                      {activeOrders.length === 0 && (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-[#74777D] text-sm">
                            No active production orders for {vendorName} on this page. Check <strong>New Orders Batch</strong> for pending Excel imports, or use pagination below.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {renderPaginationFooter()}
              </div>

            </div>
          )}

          {/* TAB 3: SIGNED COMPLETED ORDER HISTORY ARCHIVE */}
          {tab === "completed" && (
            <div className="space-y-8 animate-in fade-in duration-200">
              
              {/* Header */}
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-2xl font-black text-[#162839]">Order History Archive — {vendorName}</h2>
                  <p className="text-sm text-[#43474C] mt-1">Authorized transaction logs, courier dispatch details, and bureau quality check history from the last 30 days.</p>
                </div>
                <div className="flex gap-2.5">
                  <button
                    onClick={() => showToast(`Archive invoices prepared for ${completedOrders.length} completed ${vendorName} orders.`)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-white border border-[#C4C6CD] text-[#191C1E] rounded-xl font-bold text-sm hover:bg-[#F2F4F7] transition-all"
                  >
                    <Download className="w-4 h-4 text-[#C9A84C]" />
                    <span>Download Archive Invoices</span>
                  </button>
                  <button
                    onClick={() => showToast("Archive filters are already scoped to the last 30 days.")}
                    className="px-4 py-2 bg-kisna-gold text-kisna-dark rounded-lg font-bold text-sm hover:bg-kisna-gold-light transition-all"
                  >
                    Filter Archive
                  </button>
                </div>
              </div>

              {/* Stats bento boxes */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                <div className="bg-white border border-[#C4C6CD] p-6 rounded-2xl flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[10px] text-[#74777D] uppercase font-bold tracking-wider">Completed Month-to-Date</span>
                    <span className="material-symbols-outlined text-green-700">verified</span>
                  </div>
                  <div className="text-4xl font-extrabold text-[#162839]">42 items</div>
                  <div className="text-[11px] text-green-700 font-bold mt-1 flex items-center gap-1 bg-green-50 px-2.5 py-0.5 rounded-full w-max">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>+12% vs last month</span>
                  </div>
                </div>

                <div className="bg-white border border-[#C4C6CD] p-6 rounded-2xl flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[10px] text-[#74777D] uppercase font-bold tracking-wider">Average Bureau QC Stamp</span>
                    <span className="material-symbols-outlined text-amber-700">analytics</span>
                  </div>
                  <div className="text-4xl font-extrabold text-[#162839]">99.4%</div>
                  <p className="text-xs text-[#74777D] font-semibold mt-1">Excellent operational stability tier</p>
                </div>

                <div className="bg-white border border-[#C4C6CD] p-6 rounded-2xl flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[10px] text-[#74777D] uppercase font-bold tracking-wider">Accumulated Dispatch Value</span>
                    <span className="material-symbols-outlined text-green-700">payments</span>
                  </div>
                  <div className="text-4xl font-extrabold text-[#162839]">INR 1.52 Cr</div>
                  <p className="text-xs text-[#74777D] font-semibold mt-1">32 high-value solitaire goldsmith allocations</p>
                </div>

              </div>

              {/* Orders table list */}
              <div className="bg-white border border-[#C4C6CD] rounded-2xl overflow-hidden shadow-sm">
                <div className="p-5 border-b border-[#ECEEF1] flex items-center justify-between">
                  <h3 className="font-extrabold text-sm text-[#162839]">Recent Shipments</h3>
                  <span className="px-3.5 py-1 bg-[#F2F4F7] text-[#43474C] text-[10px] rounded-full uppercase tracking-wider font-extrabold">Last 30 Days Records</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-[#F2F4F7]/40 border-b border-[#C4C6CD]/25 text-[#74777D] font-bold text-xs uppercase tracking-wider">
                        <th className="p-4 px-6">Order ID</th>
                        <th className="p-4">Luxury Product Design</th>
                        <th className="p-4">Completion Timestamp</th>
                        <th className="p-4">Bureau QC Certification</th>
                        <th className="p-4">Logistic Handoff</th>
                        <th className="p-4 text-right px-6">Receipt / Invoices</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {completedOrders.map((order) => (
                        <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 px-6 font-mono font-bold text-[#162839]">{order.id}</td>
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              {order.image ? (
                                <div className="w-10 h-10 rounded border border-[#C4C6CD] overflow-hidden shrink-0">
                                  <img src={order.image} alt="" className="w-full h-full object-cover" />
                                </div>
                              ) : (
                                <div className="w-10 h-10 rounded bg-[#F2F4F7] border border-[#C4C6CD] flex items-center justify-center shrink-0">
                                  <Archive className="w-4 h-4 text-[#74777D]" />
                                </div>
                              )}
                              <div>
                                <p className="font-bold text-slate-800">{order.product}</p>
                                <p className="text-[10px] text-[#74777D]">{order.style}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-xs font-semibold text-[#74777D]">{order.dateCompleted || "Oct 15, 2023"}</td>
                          <td className="p-4">
                            <span className="inline-flex items-center gap-1 bg-[#EFF4FF] border border-[#d1e4fb] text-[#162839] px-2.5 py-1 rounded-full text-xs font-bold leading-none">
                              <CheckCircle2 className="w-3.5 h-3.5 text-green-700" />
                              Passed QC Stamp
                            </span>
                          </td>
                          <td className="p-4">
                            <span className="px-3 py-1 bg-green-50 border border-green-100 text-green-700 rounded text-xs font-bold uppercase">
                              Dispatched
                            </span>
                          </td>
                          <td className="p-4 text-right px-6">
                            <button
                              onClick={() => showToast(`Opening invoice documents and dispatch tags for ${order.id}...`)}
                              className="p-1 px-3.5 border border-[#C4C6CD] rounded text-slate-700 hover:text-slate-900 text-xs font-bold hover:shadow-xs transition-all flex items-center gap-1 inline-flex"
                            >
                              <FileText className="w-3 h-3 text-[#C9A84C]" />
                              <span>Logs Print</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                      {completedOrders.length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-[#74777D] text-sm">
                            No completed or handoff orders for {vendorName} on this page yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {renderPaginationFooter()}
              </div>

              {/* Vendor Excellence diagnostics banner */}
              <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="vendor-surface border border-[#C4C6CD] p-6 text-[#162839] rounded-xl flex flex-col justify-between">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-11 h-11 bg-kisna-gold/10 flex items-center justify-center text-kisna-gold rounded-lg border border-kisna-gold/20">
                      <Award className="w-5 h-5 fill-current" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-base leading-none">Vendor Excellence Rating</h4>
                      <p className="text-xs text-[#74777D] mt-1 leading-relaxed">{vendorName} maintains on-time dispatch targets from live order data.</p>
                    </div>
                  </div>
                  <p className="text-xs leading-relaxed text-[#74777D] mb-4">
                    Based on internal Kisna QA audits, your goldsmith workshop maintains premium tier benchmark scores (+100% success rating).
                  </p>
                  <div className="h-2 w-full bg-[#ECEEF1] rounded-full overflow-hidden">
                    <div className="h-full bg-kisna-gold rounded-full" style={{ width: "100%" }} />
                  </div>
                </div>

                <div className="bg-white border border-[#C4C6CD] p-6 rounded-2xl flex flex-col justify-between">
                  <div>
                    <h4 className="font-extrabold text-sm text-[#162839] mb-1">Interactive Courier Query</h4>
                    <p className="text-[#74777D] text-xs">Examine historic waybills and certificate databases from Kisna's central server matrix.</p>
                  </div>
                  <div className="flex gap-2 pt-4">
                    <input
                      type="text"
                      value={archiveSearch}
                      onChange={(e) => setArchiveSearch(e.target.value)}
                      placeholder="Enter SKU, Invoice # or Order code..."
                      className="flex-grow bg-[#F2F4F7] border border-[#C4C6CD] rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#162839]"
                    />
                    <button
                      onClick={() => {
                        if (!archiveSearch) return;
                        showToast(`Exhaustive database query submitted for: ${archiveSearch}. Locating certificate...`);
                        setArchiveSearch("");
                      }}
                      className="px-4 py-2 bg-kisna-gold hover:bg-kisna-gold-light text-kisna-dark font-bold text-xs rounded-lg transition-all"
                    >
                      Access Vault
                    </button>
                  </div>
                </div>

              </section>

            </div>
          )}

          {/* TAB 4: PORTAL MOCK SETTINGS SECTION */}
          {tab === "settings" && (
            <div className="space-y-6">
              {/* Settings navigation bar header */}
              <div className="bg-white border border-[#C4C6CD] p-5 rounded-2xl flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-[#162839]">{vendorName} Portal Settings</h2>
                  <p className="text-xs text-[#74777D] mt-1">Configure live supplier parameters or view active dashboard metrics.</p>
                </div>
                
                {/* Horizontal Navigation Pills */}
                <div className="flex gap-2 p-1 bg-[#ECEEF1] rounded-xl shrink-0">
                  <button
                    onClick={() => setSettingsTabSub("general")}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                      settingsTabSub === "general"
                        ? "bg-kisna-gold text-kisna-dark"
                        : "text-[#43474C] hover:bg-[#ECEEF1]/50 hover:text-[#191C1E]"
                    }`}
                  >
                    Portal Parameters
                  </button>
                  <button
                    onClick={() => setSettingsTabSub("dashboard")}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      settingsTabSub === "dashboard"
                        ? "bg-kisna-gold text-kisna-dark"
                        : "text-[#43474C] hover:bg-[#ECEEF1]/50 hover:text-[#191C1E]"
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">dashboard</span>
                    <span>Vendor Dashboard View</span>
                  </button>
                </div>
              </div>

              {settingsTabSub === "general" ? (
                <div className="bg-white border border-[#C4C6CD] p-8 rounded-2xl space-y-6 animate-in fade-in duration-200">
                  <div className="p-4 bg-kisna-gold/10 rounded-lg border border-kisna-gold/25 text-xs text-[#755B00] space-y-2">
                    <p className="font-bold">Operational Context</p>
                    <p className="leading-relaxed">This terminal connects supplier &quot;{vendorName}&quot; directly into Kisna Operations cloud hub endpoints.</p>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-[#ECEEF1]">
                    <div className="flex items-center justify-between pb-4 border-b border-[#ECEEF1]">
                      <div>
                        <p className="text-xs font-bold text-[#162839]">Active Notification Reminders</p>
                        <p className="text-[10px] text-[#74777D]">Trigger laser failure check alarms and payment warning logs.</p>
                      </div>
                      <input type="checkbox" defaultChecked className="w-5 h-5 rounded text-kisna-navy focus:ring-kisna-gold border-gray-300" />
                    </div>

                    <div className="flex items-center justify-between pb-4 border-b border-[#ECEEF1]">
                      <div>
                        <p className="text-xs font-bold text-[#162839]">National Matrix Grounding Map</p>
                        <p className="text-[10px] text-[#74777D]">Overlay high-intelligence delivery waypoints at bottom dashboard panels.</p>
                      </div>
                      <input type="checkbox" defaultChecked className="w-5 h-5 rounded text-kisna-navy focus:ring-kisna-gold border-gray-300" />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[#ECEEF1] flex items-center gap-4">
                    <button
                      onClick={() => showToast("Adjusted configurations and recorded to session database.")}
                      className="px-6 py-2.5 bg-kisna-gold text-kisna-dark rounded-lg text-xs font-bold hover:bg-kisna-gold-light transition-all"
                    >
                      Save Settings
                    </button>
                    <button
                      onClick={() => setSettingsTabSub("dashboard")}
                      className="px-5 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-all border border-slate-200 flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-sm">dashboard</span>
                      <span>Go to Vendor Dashboard View</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-white border border-[#C4C6CD] p-8 rounded-2xl space-y-8 animate-in fade-in duration-200">
                  <div className="bg-gradient-to-r from-[#162839] to-[#0D1B3E] p-5 rounded-xl border border-kisna-gold/20 text-[#162839] flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex bg-kisna-gold/10 text-kisna-gold text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded border border-kisna-gold/20">Stitch Design Preview</span>
                        <span className="text-[10px] text-[#74777D] font-medium">{vendorName} active workspace</span>
                      </div>
                      <h3 className="text-lg font-black mt-2 leading-none">Vendor Dashboard Interface</h3>
                      <p className="text-[#74777D] text-xs mt-1.5 leading-relaxed">Direct mirroring of accepting buffers, live workshop schedules and metrics synchronized with KISNA Operations Control.</p>
                    </div>
                    <button
                      onClick={() => {
                        setTab("dashboard");
                        showToast("Navigated directly back to live active workspace.");
                      }}
                      className="px-4 py-2 bg-kisna-gold hover:bg-kisna-gold-light text-kisna-dark font-bold text-xs rounded-lg transition-colors h-max flex items-center gap-1.5"
                    >
                      <span>Go to Screen View</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* DUPLICATE THE BEAUTIFUL DASHBOARD CORE LAYOUT RIGHT HERE */}
                  <div className="space-y-6">
                    {/* Grid of New Orders cards */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-kisna-gold"></span>
                        <span>Incoming Workshop Orders Queue ({newOrders.length})</span>
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {newOrders.map((order) => (
                          <div key={`settings-order-${order.id}`} className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden hover:border-kisna-gold/50 transition-colors">
                            {/* Header */}
                            <div className="p-4 border-b border-slate-200 flex justify-between items-start">
                              <div>
                                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">ID Ref</span>
                                <h3 className="text-sm font-black text-[#162839]">{order.id}</h3>
                              </div>
                              <span className="px-2 py-0.5 bg-kisna-gold/10 text-kisna-navy rounded text-[10px] font-bold">
                                Pending
                              </span>
                            </div>

                            {/* Specs */}
                            <div className="p-4 grid grid-cols-2 gap-3 text-xs">
                              <div>
                                <span className="text-[9px] text-[#74777D] uppercase tracking-wider block">Style</span>
                                <p className="font-bold text-[#162839]">{order.style}</p>
                              </div>
                              <div>
                                <span className="text-[9px] text-[#74777D] uppercase tracking-wider block">Quantity</span>
                                <p className="font-bold text-[#162839]">{order.qty} Unit</p>
                              </div>
                              <div>
                                <span className="text-[9px] text-[#74777D] uppercase tracking-wider block">Destination</span>
                                <p className="font-bold text-[#162839]">{order.store}</p>
                              </div>
                              <div>
                                <span className="text-[9px] text-[#74777D] uppercase tracking-wider block">Allocated TAT</span>
                                <p className="font-bold text-amber-700">{order.expectedTatDays || 7} Days</p>
                              </div>
                            </div>

                            {/* Accept/Reject inside Settings Dashboard preview */}
                            <div className="p-4 bg-white border-t border-slate-100 flex justify-end gap-2 text-xs">
                              <button
                                onClick={() => handleRejectOrder(order.id)}
                                className="px-3 py-1.5 border border-[#C4C6CD] text-[#43474C] rounded-lg font-bold hover:bg-[#F2F4F7] transition-colors"
                              >
                                Reject
                              </button>
                              <button
                                onClick={() => handleAcceptOrder(order.id)}
                                className="px-3 py-1.5 bg-kisna-gold text-kisna-dark rounded-lg font-bold hover:bg-kisna-gold-light transition-colors"
                              >
                                Accept Order
                              </button>
                            </div>
                          </div>
                        ))}

                        {newOrders.length === 0 && (
                          <div className="col-span-2 p-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-500">
                            No incoming orders to display for {vendorName}.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Dashboard Statistics */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Workshop Key Performance Metrics</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
                          <div className="w-10 h-10 bg-kisna-gold/10 rounded-lg flex items-center justify-center text-kisna-navy">
                            <span className="material-symbols-outlined text-[20px]">pending</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-500 uppercase tracking-wider block">Queue Buffer</span>
                            <p className="text-sm font-black text-[#162839]">{newOrders.length} Pending</p>
                          </div>
                        </div>

                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
                          <div className="w-10 h-10 bg-kisna-gold/10 rounded-lg flex items-center justify-center text-kisna-navy">
                            <span className="material-symbols-outlined text-[20px]">precision_manufacturing</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-500 uppercase tracking-wider block">Goldsmith Desk</span>
                            <p className="text-sm font-black text-[#162839]">{activeOrders.length} Active</p>
                          </div>
                        </div>

                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
                          <div className="w-10 h-10 bg-kisna-gold/10 rounded-lg flex items-center justify-center text-kisna-navy">
                            <span className="material-symbols-outlined text-[20px]">verified</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-500 uppercase tracking-wider block">Completion rate</span>
                            <p className="text-sm font-black text-[#162839]">98.4% On-Time</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bureau feeds if any */}
                    {pendingQCForSupplier.length > 0 && (
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                        <h4 className="text-xs font-black text-slate-700 mb-3">Live Kisna QC Feedback stream</h4>
                        <div className="space-y-2">
                          {pendingQCForSupplier.slice(0, 3).map(o => (
                            <div key={`settings-feed-${o.id}`} className="p-2.5 bg-white rounded-lg border border-slate-200 flex items-center justify-between text-[11px]">
                              <div>
                                <span className="font-bold text-[#162839] font-mono">{o.id}</span>
                                <span className="text-slate-500 ml-1">({o.style})</span>
                              </div>
                              <span className="text-[9px] uppercase px-2 font-black text-blue-600 bg-blue-50/50 rounded-full">{o.status}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </main>

      {/* DIALOG POPUP: MANUAL STATUS UPDATE COMPONENT */}
      {updatingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setUpdatingOrder(null)} />
          <div className="bg-white w-full max-w-md rounded-2xl border border-[#C4C6CD] shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="bg-[#F8F9FB] border-b border-[#C4C6CD] p-5 text-[#162839] flex justify-between items-start">
              <div>
                <h3 className="font-bold text-base leading-none">Workshop Progress Override</h3>
                <p className="text-[10px] text-[#74777D] mt-1">Manual adjustment for {updatingOrder.id}</p>
              </div>
              <button onClick={() => setUpdatingOrder(null)} className="p-1 text-[#74777D] hover:text-[#162839] rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Inputs body */}
            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#74777D] uppercase tracking-wider">Select Workshop Status Stage</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full border border-[#C4C6CD] rounded-xl px-3 py-2 text-xs focus:ring-[#C9A84C] focus:outline-none"
                >
                  <option value={OrderStatus.IN_PRODUCTION}>In Goldsmith Fabrication</option>
                  <option value={OrderStatus.FINISHING}>Polishing / Stones Settings</option>
                  <option value={OrderStatus.READY_FOR_QC}>Completed (Ready for Bureau QC)</option>
                </select>
              </div>

              {newStatus === OrderStatus.READY_FOR_QC && (
                <p className="text-[10px] text-amber-700 font-bold bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                  Note: Advancing order to Completed will automatically send it to Kings Operations Control for checklist verification audits.
                </p>
              )}

              {/* Action buttons */}
              <div className="flex gap-2.5 pt-3 border-t border-[#ECEEF1]">
                <button
                  onClick={() => setUpdatingOrder(null)}
                  className="flex-grow py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-slate-800 text-xs font-bold uppercase transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateStatusSubmit}
                  className="flex-grow py-2 bg-kisna-gold text-kisna-dark font-bold text-xs uppercase rounded-lg hover:bg-kisna-gold-light transition-colors"
                >
                  Confirm Override
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TOAST SYSTEM POPUP */}
      {toast.visible && (
        <div className="fixed bottom-6 right-6 z-[100] bg-white border border-kisna-gold/30 text-[#162839] px-5 py-3 rounded-lg flex items-center gap-3 animate-in slide-in-from-bottom duration-300">
          <CheckCircle2 className="w-5 h-5 text-kisna-gold" />
          <span className="text-xs font-bold leading-tight">{toast.message}</span>
        </div>
      )}

      <NotificationPanel
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        items={vendorNotifications}
        title={`${vendorName} Alerts`}
        emptyMessage={`No alerts for ${vendorName}. Assignment, production, and QC events appear here.`}
        onSelect={(item) => {
          if (item.actionTab) setTab(item.actionTab);
          setNotificationsOpen(false);
        }}
      />

    </div>
  );
}
