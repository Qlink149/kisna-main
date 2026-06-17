import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import OperationsPortal from "./components/OperationsPortal";
import VendorPortal from "./components/VendorPortal";
import { motion, AnimatePresence } from "motion/react";
import { RefreshCw, AlertCircle } from "lucide-react";
import {
  fetchVendors,
  fetchActivities,
  fetchOrderStats,
  DEMO_VENDOR_NAME,
} from "./services/api.js";
import {
  createWorkflowStore,
  applyWorkflowOrderFilters,
  prependWorkflowActivity,
  recomputeWorkflowStats,
  resetWorkflowState,
  getSanitizedWorkflowOrders,
  isMockWorkflowOrder,
} from "./services/mockStore.js";

function JewelryBackground() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      <div
        style={{
          background:
            "linear-gradient(145deg, #0a0820 0%, #1A1250 45%, #0d0a2a 80%, #08061a 100%)",
        }}
        className="absolute inset-0"
      />
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 1600 900"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="diamondGrid" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
            <rect x="40" y="0" width="40" height="40" fill="none" stroke="rgba(201,168,76,0.07)" strokeWidth="0.5" transform="rotate(45 40 20)" />
            <circle cx="40" cy="40" r="1" fill="rgba(201,168,76,0.15)" />
          </pattern>
          <radialGradient id="goldGlow1" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#C9A84C" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#C9A84C" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#diamondGrid)" />
        <ellipse cx="15%" cy="20%" rx="300" ry="300" fill="url(#goldGlow1)" />
        <ellipse cx="85%" cy="75%" rx="350" ry="350" fill="url(#goldGlow1)" />
      </svg>
    </div>
  );
}

const DEFAULT_FILTERS = {
  page: 1,
  limit: 50,
  search: "",
  status: "",
  excelStatus: "",
  state: "",
  vendor: "",
};

export default function App() {
  const [perspective, setPerspective] = useState("operations");
  const [workflow, setWorkflow] = useState(() => createWorkflowStore());
  const [dashboardVendors, setDashboardVendors] = useState([]);
  const [dashboardActivities, setDashboardActivities] = useState([]);
  const [dashboardOrderStats, setDashboardOrderStats] = useState({ total: 0 });
  const [opsOrderFilters, setOpsOrderFilters] = useState(DEFAULT_FILTERS);
  const [vendorOrderFilters, setVendorOrderFilters] = useState({
    ...DEFAULT_FILTERS,
    limit: 200,
  });
  const [operationsTab, setOperationsTab] = useState("home");
  const [vendorTab, setVendorTab] = useState("dashboard");
  const [selectedVendorName, setSelectedVendorName] = useState(DEMO_VENDOR_NAME);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const demoLaunched = useRef(false);

  const workflowOrders = useMemo(
    () => getSanitizedWorkflowOrders(workflow.orders),
    [workflow.orders]
  );

  const workflowOrdersMeta = useMemo(() => {
    const filters = perspective === "vendor" ? vendorOrderFilters : opsOrderFilters;
    const result = applyWorkflowOrderFilters(workflowOrders, filters);
    const { items, ...meta } = result;
    return meta;
  }, [workflowOrders, opsOrderFilters, vendorOrderFilters, perspective]);

  const workflowOrdersForView = useMemo(() => {
    const filters = perspective === "vendor" ? vendorOrderFilters : opsOrderFilters;
    return applyWorkflowOrderFilters(workflowOrders, filters).items;
  }, [workflowOrders, opsOrderFilters, vendorOrderFilters, perspective]);

  useEffect(() => {
    setWorkflow((prev) => {
      const clean = getSanitizedWorkflowOrders(prev.orders);
      if (
        clean.length === prev.orders.length &&
        clean.every((o, i) => o.id === prev.orders[i]?.id)
      ) {
        return prev;
      }
      return { ...prev, orders: clean, orderStats: recomputeWorkflowStats(clean) };
    });
  }, []);

  const openVendorPortal = useCallback((vendorName, tab = "dashboard") => {
    if (vendorName) setSelectedVendorName(vendorName);
    setVendorTab(tab);
    setPerspective("vendor");
  }, []);

  const openDemoVendorPortal = useCallback((tab = "dashboard") => {
    setSelectedVendorName(DEMO_VENDOR_NAME);
    setVendorOrderFilters((prev) => ({
      ...prev,
      vendor: DEMO_VENDOR_NAME,
      status: "",
      excelStatus: "",
      page: 1,
      limit: 200,
    }));
    setVendorTab(tab);
    setPerspective("vendor");
  }, []);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [v, a, stats] = await Promise.all([
        fetchVendors(),
        fetchActivities(),
        fetchOrderStats(),
      ]);
      setDashboardVendors(v);
      setDashboardActivities(a);
      setDashboardOrderStats(stats);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not reach the API. Is the FastAPI server running on :8080?"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (loading || demoLaunched.current) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("portal") === "vendor" || params.get("demo") === "1") {
      demoLaunched.current = true;
      openDemoVendorPortal(params.get("tab") || "dashboard");
    }
  }, [loading, openDemoVendorPortal]);

  const resetDemoData = useCallback(() => {
    const fresh = resetWorkflowState();
    setWorkflow(fresh);
    setSelectedVendorName(DEMO_VENDOR_NAME);
    setOpsOrderFilters(DEFAULT_FILTERS);
    setVendorOrderFilters({ ...DEFAULT_FILTERS, limit: 200 });
  }, []);

  const setWorkflowOrders = useCallback((action) => {
    setWorkflow((prev) => {
      const base = getSanitizedWorkflowOrders(prev.orders);
      const rawNext = typeof action === "function" ? action(base) : action;
      if (!Array.isArray(rawNext)) return prev;

      if (rawNext.some((o) => !isMockWorkflowOrder(o))) {
        return prev;
      }

      const nextOrders =
        rawNext.length < base.length && rawNext.every((o) => base.some((p) => p.id === o.id))
          ? base.map((o) => rawNext.find((n) => n.id === o.id) ?? o)
          : rawNext;

      const clean = getSanitizedWorkflowOrders(nextOrders);
      return {
        ...prev,
        orders: clean,
        orderStats: recomputeWorkflowStats(clean),
      };
    });
  }, []);

  const addWorkflowActivity = useCallback((title, description, type, meta = {}) => {
    const time = new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
    setWorkflow((prev) => ({
      ...prev,
      activities: prependWorkflowActivity(prev.activities, {
        title,
        description,
        time,
        type,
        ...meta,
      }),
    }));
  }, []);

  const refreshDashboardActivities = useCallback(() => {
    fetchActivities().then(setDashboardActivities).catch(console.error);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(145deg, #0a0820, #1A1250, #0d0a2a)" }}>
        <JewelryBackground />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-2 border-[#C9A84C]/30 rounded-full flex items-center justify-center" style={{ boxShadow: "0 0 30px rgba(201,168,76,0.2)" }}>
            <RefreshCw className="w-7 h-7 text-[#C9A84C] animate-spin" />
          </div>
          <div className="text-center">
            <p className="text-[#C9A84C] font-light tracking-[0.3em] uppercase text-xs">Loading</p>
            <p className="text-white/60 text-xs mt-1 tracking-widest">Sales and Support Dashboard</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "linear-gradient(145deg, #0a0820, #1A1250, #0d0a2a)" }}>
        <JewelryBackground />
        <div className="relative z-10 max-w-md w-full rounded-2xl p-8 text-center" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(201,168,76,0.2)", backdropFilter: "blur(20px)" }}>
          <AlertCircle className="w-10 h-10 text-[#C9A84C] mx-auto mb-4" />
          <h2 className="font-bold text-white mb-2">API Unavailable</h2>
          <p className="text-sm text-white/60 mb-4">{error}</p>
          <code className="block rounded-xl p-3 text-xs text-left mb-4 text-[#C9A84C]/80" style={{ background: "rgba(0,0,0,0.3)" }}>
            cd backend{"\n"}
            python -m uvicorn app.main:app --port 8080
          </code>
          <button
            onClick={() => loadDashboard()}
            className="px-6 py-2.5 text-sm font-semibold rounded-xl text-white cursor-pointer transition-all hover:-translate-y-px"
            style={{ background: "linear-gradient(135deg, #0D1B3E, #1A1250)", boxShadow: "0 12px 28px rgba(13,27,62,0.24)" }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen select-none overflow-hidden" style={{ background: "linear-gradient(145deg, #0a0820 0%, #1A1250 45%, #0d0a2a 100%)" }}>
      <JewelryBackground />

      <AnimatePresence mode="wait">
        {perspective === "operations" ? (
          <motion.div
            key="operations-portal"
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 15 }}
            transition={{ duration: 0.25 }}
            className="relative z-10 w-full h-screen"
          >
            <OperationsPortal
              homeVendors={dashboardVendors}
              homeActivities={dashboardActivities}
              homeOrderStats={dashboardOrderStats}
              orders={workflowOrdersForView}
              allWorkflowOrders={workflowOrders}
              orderStats={workflow.orderStats}
              ordersMeta={workflowOrdersMeta}
              orderFilters={opsOrderFilters}
              onOrderFiltersChange={setOpsOrderFilters}
              activities={workflow.activities}
              vendors={workflow.vendors}
              setOrders={setWorkflowOrders}
              addActivity={addWorkflowActivity}
              onRefreshActivities={refreshDashboardActivities}
              tab={operationsTab}
              setTab={setOperationsTab}
              onSwitchToVendorPortal={openVendorPortal}
              onOpenDemoVendorPortal={openDemoVendorPortal}
              onResetDemoData={resetDemoData}
            />
          </motion.div>
        ) : (
          <motion.div
            key="vendor-portal"
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -15 }}
            transition={{ duration: 0.25 }}
            className="relative z-10 w-full h-screen"
          >
            <VendorPortal
              orders={workflowOrdersForView}
              ordersMeta={workflowOrdersMeta}
              orderFilters={vendorOrderFilters}
              onOrderFiltersChange={setVendorOrderFilters}
              activities={workflow.activities}
              vendors={workflow.vendors}
              selectedVendorName={selectedVendorName}
              onVendorChange={setSelectedVendorName}
              setOrders={setWorkflowOrders}
              addActivity={addWorkflowActivity}
              onRefreshActivities={() => {}}
              tab={vendorTab}
              setTab={setVendorTab}
              onSwitchToOperationsPortal={() => setPerspective("operations")}
              isDemoVendor={selectedVendorName === DEMO_VENDOR_NAME}
              onReseedDemo={openDemoVendorPortal}
              onResetDemoData={resetDemoData}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
