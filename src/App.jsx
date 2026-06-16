import React, { useState, useEffect, useCallback, useRef } from "react";
import OperationsPortal from "./components/OperationsPortal";
import VendorPortal from "./components/VendorPortal";
import { motion, AnimatePresence } from "motion/react";
import { RefreshCw, AlertCircle } from "lucide-react";
import {
  fetchOrders,
  fetchOrderStats,
  fetchVendors,
  fetchActivities,
  patchOrder,
  postActivity,
  seedDemoVendorPortal,
  resetDemoVendorPortal,
  DEMO_VENDOR_NAME,
} from "./services/api.js";

function diff(prev, next) {
  const prevMap = new Map(prev.map((o) => [o.id, JSON.stringify(o)]));
  return next.filter((o) => prevMap.get(o.id) !== JSON.stringify(o));
}

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
          <radialGradient id="goldGlow2" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#9B7FD4" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#9B7FD4" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width="100%" height="100%" fill="url(#diamondGrid)" />

        <g opacity="0.18" stroke="#C9A84C" strokeWidth="0.5" fill="none">
          <polygon points="-60,180 80,0 220,180 80,360" />
          <polygon points="-40,180 80,30 200,180 80,330" />
          <polygon points="-20,180 80,60 180,180 80,300" />
          <line x1="80" y1="0" x2="80" y2="360" strokeWidth="0.3" />
          <line x1="-60" y1="180" x2="220" y2="180" strokeWidth="0.3" />
        </g>

        <g
          opacity="0.18"
          stroke="#C9A84C"
          strokeWidth="0.5"
          fill="none"
          transform="translate(1600 900) rotate(180)"
        >
          <polygon points="-60,180 80,0 220,180 80,360" />
          <polygon points="-40,180 80,30 200,180 80,330" />
          <polygon points="-20,180 80,60 180,180 80,300" />
          <line x1="80" y1="0" x2="80" y2="360" strokeWidth="0.3" />
          <line x1="-60" y1="180" x2="220" y2="180" strokeWidth="0.3" />
        </g>

        <g
          opacity="0.08"
          stroke="#C9A84C"
          strokeWidth="0.8"
          fill="none"
          transform="translate(800 450)"
        >
          <polygon points="0,-120 104,-60 104,60 0,120 -104,60 -104,-60" />
          <polygon points="0,-80 69,-40 69,40 0,80 -69,40 -69,-40" />
          <polygon points="0,-40 35,-20 35,20 0,40 -35,20 -35,-20" />
          <line x1="0" y1="-120" x2="0" y2="120" strokeWidth="0.4" />
          <line x1="-104" y1="-60" x2="104" y2="60" strokeWidth="0.4" />
          <line x1="-104" y1="60" x2="104" y2="-60" strokeWidth="0.4" />
        </g>

        <ellipse cx="15%" cy="20%" rx="300" ry="300" fill="url(#goldGlow1)" />
        <ellipse cx="85%" cy="75%" rx="350" ry="350" fill="url(#goldGlow1)" />
        <ellipse cx="70%" cy="15%" rx="250" ry="250" fill="url(#goldGlow2)" />

        {[
          [20, 15], [75, 25], [45, 70], [85, 45], [10, 60],
          [60, 85], [30, 40], [90, 80], [50, 10], [15, 85],
        ].map(([cx, cy], i) => (
          <svg key={i} x={`${cx}%`} y={`${cy}%`} width="16" height="16" overflow="visible" opacity="0.25">
            <polygon
              points={`0,-8 6,-4 6,4 0,8 -6,4 -6,-4`}
              fill="none"
              stroke="#C9A84C"
              strokeWidth="0.6"
            />
            <circle cx="0" cy="0" r="1.5" fill="#C9A84C" opacity="0.6" />
          </svg>
        ))}
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
  const [orders, setOrdersLocal] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [activities, setActivitiesLocal] = useState([]);
  const [orderStats, setOrderStats] = useState({ total: 0 });
  const [ordersMeta, setOrdersMeta] = useState({ total: 0, page: 1, pages: 1, limit: 50 });
  const [opsOrderFilters, setOpsOrderFilters] = useState(DEFAULT_FILTERS);
  const [vendorOrderFilters, setVendorOrderFilters] = useState({
    ...DEFAULT_FILTERS,
    limit: 200,
  });
  const [operationsTab, setOperationsTab] = useState("home");
  const [vendorTab, setVendorTab] = useState("dashboard");
  const [selectedVendorName, setSelectedVendorName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const demoLaunched = useRef(false);

  const openVendorPortal = useCallback((vendorName, tab = "dashboard") => {
    if (vendorName) setSelectedVendorName(vendorName);
    setVendorTab(tab);
    setPerspective("vendor");
  }, []);

  const openDemoVendorPortal = useCallback(async (tab = "dashboard") => {
    try {
      await seedDemoVendorPortal();
      const [v, stats] = await Promise.all([fetchVendors(), fetchOrderStats()]);
      setVendors(v);
      setOrderStats(stats);
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
      const data = await fetchOrders({
        vendor: DEMO_VENDOR_NAME,
        status: "",
        page: 1,
        limit: 200,
      });
      setOrdersLocal(data.items);
      setOrdersMeta({
        total: data.total,
        page: data.page,
        pages: data.pages,
        limit: data.limit,
      });
    } catch (err) {
      console.error(err);
      openVendorPortal(DEMO_VENDOR_NAME, tab);
    }
  }, [openVendorPortal]);

  const loadOrders = useCallback(async (filters) => {
    const data = await fetchOrders(filters);
    setOrdersLocal(data.items);
    setOrdersMeta({
      total: data.total,
      page: data.page,
      pages: data.pages,
      limit: data.limit,
    });
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [v, a, stats, data] = await Promise.all([
        fetchVendors(),
        fetchActivities(),
        fetchOrderStats(),
        fetchOrders(DEFAULT_FILTERS),
      ]);
      setVendors(v);
      setActivitiesLocal(a);
      setOrderStats(stats);
      setOrdersLocal(data.items);
      setOrdersMeta({
        total: data.total,
        page: data.page,
        pages: data.pages,
        limit: data.limit,
      });
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
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (loading || demoLaunched.current) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("portal") === "vendor" || params.get("demo") === "1") {
      demoLaunched.current = true;
      openDemoVendorPortal(params.get("tab") || "dashboard");
    }
  }, [loading, openDemoVendorPortal]);

  useEffect(() => {
    if (loading) return;
    const filters = perspective === "vendor" ? vendorOrderFilters : opsOrderFilters;
    loadOrders(filters).catch(console.error);
  }, [opsOrderFilters, vendorOrderFilters, perspective, loading, loadOrders]);

  useEffect(() => {
    if (!vendors.length || selectedVendorName) return;
    const preferred =
      vendors.find((v) => /taash/i.test(v.name)) ||
      vendors.find((v) => /polish/i.test(v.name)) ||
      vendors[0];
    setSelectedVendorName(preferred.name);
  }, [vendors, selectedVendorName]);

  useEffect(() => {
    if (!vendors.length || perspective !== "vendor" || !selectedVendorName) return;
    setVendorOrderFilters((prev) => ({
      ...prev,
      vendor: selectedVendorName,
      status: "",
      excelStatus: "",
      page: 1,
      limit: 200,
    }));
  }, [perspective, selectedVendorName, vendors.length]);

  const refreshOrders = useCallback(() => {
    const filters = perspective === "vendor" ? vendorOrderFilters : opsOrderFilters;
    return loadOrders(filters);
  }, [perspective, vendorOrderFilters, opsOrderFilters, loadOrders]);

  const resetDemoData = useCallback(async () => {
    await resetDemoVendorPortal();
    await seedDemoVendorPortal();
    const [v, stats, a] = await Promise.all([
      fetchVendors(),
      fetchOrderStats(),
      fetchActivities(),
    ]);
    setVendors(v);
    setOrderStats(stats);
    setActivitiesLocal(a);
    const filters = perspective === "vendor" ? vendorOrderFilters : opsOrderFilters;
    await loadOrders(filters);
  }, [perspective, vendorOrderFilters, opsOrderFilters, loadOrders]);

  const setOrders = useCallback((action) => {
    setOrdersLocal((prev) => {
      const next = typeof action === "function" ? action(prev) : action;
      const changed = diff(prev, next);
      changed.forEach((o) => {
        const { id, ...updates } = o;
        const payload = Object.fromEntries(
          Object.entries(updates).map(([k, v]) => [k, v === undefined ? null : v])
        );
        patchOrder(id, payload)
          .then((saved) => {
            setOrdersLocal((current) =>
              current.map((item) => (item.id === id ? saved : item))
            );
          })
          .catch(console.error);
      });
      return next;
    });
  }, []);

  const addActivity = useCallback((title, description, type, meta = {}) => {
    const time = new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return postActivity({ title, description, time, type, ...meta })
      .then((created) =>
        setActivitiesLocal((prev) => [created, ...prev.slice(0, 49)])
      )
      .catch(console.error);
  }, []);

  const refreshActivities = useCallback(() => {
    fetchActivities().then(setActivitiesLocal).catch(console.error);
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
            <p className="text-white/60 text-xs mt-1 tracking-widest">KISNA ONE</p>
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
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-4" />
          <h2 className="font-bold text-white mb-2">API Unavailable</h2>
          <p className="text-sm text-white/60 mb-4">{error}</p>
          <code className="block rounded-xl p-3 text-xs text-left mb-4 text-[#C9A84C]/80" style={{ background: "rgba(0,0,0,0.3)" }}>
            cd backend{"\n"}
            python -m uvicorn app.main:app --port 8080
          </code>
          <button
            onClick={() => loadAll()}
            className="px-6 py-2.5 text-sm font-semibold rounded-xl text-white cursor-pointer transition-all hover:-translate-y-px"
            style={{ background: "linear-gradient(135deg, #172554, #253b76)", boxShadow: "0 12px 28px rgba(23,37,84,0.24)" }}
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
              orders={orders}
              orderStats={orderStats}
              ordersMeta={ordersMeta}
              orderFilters={opsOrderFilters}
              onOrderFiltersChange={setOpsOrderFilters}
              activities={activities}
              vendors={vendors}
              setOrders={setOrders}
              addActivity={addActivity}
              onRefreshActivities={refreshActivities}
              onRefreshOrders={refreshOrders}
              tab={operationsTab}
              setTab={setOperationsTab}
              onSwitchToVendorPortal={openVendorPortal}
              onOpenDemoVendorPortal={openDemoVendorPortal}
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
              orders={orders}
              ordersMeta={ordersMeta}
              orderFilters={vendorOrderFilters}
              onOrderFiltersChange={setVendorOrderFilters}
              activities={activities}
              vendors={vendors}
              selectedVendorName={selectedVendorName}
              onVendorChange={setSelectedVendorName}
              setOrders={setOrders}
              addActivity={addActivity}
              onRefreshActivities={refreshActivities}
              onRefreshOrders={refreshOrders}
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
