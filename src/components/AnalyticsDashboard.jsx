import { useEffect, useState } from "react";
import { fetchAnalytics } from "../services/api.js";
import { RefreshCw } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LabelList,
} from "recharts";

function fmtNum(n) {
  return Number(n || 0).toLocaleString("en-IN");
}

function fmtCurrencyCr(val) {
  const cr = val / 1e7;
  return cr >= 1 ? `INR ${cr.toFixed(1)} Cr` : `INR ${(val / 1e5).toFixed(1)} L`;
}

function shortLabel(value, max = 24) {
  const text = String(value || "");
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
}

function MetricCard({ label, value, sub }) {
  return (
    <div className="bg-white border border-[#E2E8F4] rounded-2xl p-5 flex flex-col gap-1 shadow-sm">
      <p className="text-[10px] font-medium uppercase tracking-widest text-[#94a3b8]">{label}</p>
      <p className="text-3xl md:text-4xl font-semibold text-[#1e293b] leading-tight">{value}</p>
      {sub && <p className="text-xs text-[#94a3b8] font-normal">{sub}</p>}
    </div>
  );
}

function SectionCard({ title, children }) {
  return (
    <div className="bg-white border border-[#E2E8F4] rounded-2xl p-6 shadow-sm">
      <p className="text-[10px] font-medium uppercase tracking-widest text-[#94a3b8] mb-5">{title}</p>
      {children}
    </div>
  );
}

/* ── Cohesive muted palette ── */
const STATUS_COLORS = {
  "Ready For Dispatch":   "#4E7BB5",
  "Pending from Vendor":  "#C9A84C",
  "God WIP":              "#C47A6E",
  "GOD WIP":              "#C47A6E",
  "Inter Store Transfer": "#8BA3BE",
};

const KT_COLOR_MAP = {
  "22KT": "#C9A84C",
  "18KT": "#4E7BB5",
  "14KT": "#5BAFA8",
  "09KT": "#9B8EC4",
  STL:    "#8BA3BE",
};

const CHART_PALETTE = [
  "#4E7BB5",
  "#5BAFA8",
  "#8FC49B",
  "#C9A84C",
  "#9B8EC4",
  "#7CA8BF",
  "#C4896E",
  "#7DB8A5",
  "#B8A84E",
  "#A0A8C9",
];

const TICK = { fontSize: 11, fill: "#94a3b8", fontWeight: 400 };
const TICK_DARK = { fontSize: 11, fill: "#475569", fontWeight: 400 };

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#E2E8F4] rounded-xl shadow-lg p-3 text-xs">
      {label && <p className="font-medium text-[#1e293b] mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.fill || p.color || "#475569" }} className="font-normal">
          {p.name}: {fmtNum(p.value)}
        </p>
      ))}
    </div>
  );
};

const PieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#E2E8F4] rounded-xl shadow-lg p-3 text-xs">
      <p className="font-medium text-[#1e293b]">{payload[0].name}</p>
      <p className="font-normal text-[#94a3b8]">Qty: {fmtNum(payload[0].value)}</p>
      <p className="font-normal text-[#94a3b8]">{payload[0].payload.percent}%</p>
    </div>
  );
};

const CustomerAxisTick = ({ x, y, payload }) => (
  <text
    x={x - 10}
    y={y}
    textAnchor="end"
    dominantBaseline="middle"
    fill="#475569"
    fontSize={11}
    fontWeight={400}
  >
    {shortLabel(payload?.value, 22)}
  </text>
);

export default function AnalyticsDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAnalytics()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <RefreshCw className="w-6 h-6 animate-spin text-[#C9A84C]" />
        <span className="ml-3 text-sm font-normal text-[#94a3b8]">Loading analytics…</span>
      </div>
    );
  }

  if (error || !data || data.totalOrders === 0) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
        <p className="font-medium text-amber-800 mb-1">Excel analytics collection is empty</p>
        <p className="text-sm font-normal text-amber-700 mb-3">
          Analytics data is loaded from the MongoDB excel_orders collection. Restart the API or use Reset Demo to re-seed demo data.
        </p>
      </div>
    );
  }

  const {
    totalOrders, totalQty, totalGoldWeight, totalDpRate, totalDpRateWithGst,
    uniqueCustomers, uniqueStates, statusCounts, karatage, topStates,
    topCustomers, collections, deliveryPriority, orderTypes,
  } = data;

  const totalStatusQty = statusCounts.reduce((s, x) => s + x.qty, 0);

  const donutData = statusCounts.map((s) => ({
    name: s.status,
    value: s.qty,
    percent: totalStatusQty > 0 ? ((s.qty / totalStatusQty) * 100).toFixed(1) : "0",
    color: STATUS_COLORS[s.status] || "#A0A8C9",
  }));

  const karatageData = karatage.map((k) => ({
    name: k.kt,
    value: k.count,
    fill: KT_COLOR_MAP[k.kt] || "#7CA8BF",
  }));

  const topStatesData = [...topStates].reverse().map((s) => ({
    name: s.state,
    value: s.count,
  }));

  const topCustomersData = [...topCustomers].reverse().map((c) => ({
    name: c.customer.length > 20 ? c.customer.slice(0, 20) + "…" : c.customer,
    value: c.qty,
  }));

  const collectionsData = collections.map((c) => ({
    name: c.collection.length > 14 ? c.collection.slice(0, 14) + "…" : c.collection,
    value: c.count,
  }));

  const deliveryData = deliveryPriority.map((d) => ({
    name: d.priority ? `${d.priority}d` : "Unset",
    value: d.count,
  }));

  const goldByStatusData = statusCounts.map((s) => ({
    name: s.status.length > 16 ? s.status.slice(0, 16) + "…" : s.status,
    value: Math.round(s.goldWt || 0),
    fill: STATUS_COLORS[s.status] || "#A0A8C9",
  }));

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Total Orders" value={fmtNum(totalOrders)} sub={`${fmtNum(totalQty)} total qty`} />
        <MetricCard
          label="Gold Weight"
          value={`${fmtNum(Math.round(totalGoldWeight))} gm`}
          sub={`avg ${(totalGoldWeight / (totalOrders || 1)).toFixed(2)} gm/order`}
        />
        <MetricCard label="DP Rate Total" value={fmtCurrencyCr(totalDpRate)} sub={`${fmtCurrencyCr(totalDpRateWithGst)} with GST`} />
        <MetricCard label="Unique Customers" value={fmtNum(uniqueCustomers)} sub={`across ${uniqueStates} states`} />
      </div>

      {/* Order Status Donut + Karatage Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SectionCard title="Order Status (Qty)">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={donutData}
                cx="50%"
                cy="50%"
                innerRadius={68}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                strokeWidth={0}
                animationBegin={0}
                animationDuration={800}
              >
                {donutData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
                formatter={(value) => (
                  <span style={{ color: "#475569", fontWeight: 400 }}>{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Karatage Mix">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={karatageData} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="name" tick={TICK_DARK} axisLine={false} tickLine={false} />
              <YAxis tick={TICK} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "#F8FAFC" }} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} name="Orders" animationDuration={800}>
                {karatageData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
                <LabelList dataKey="value" position="top" style={{ fontSize: 11, fill: "#94a3b8", fontWeight: 400 }} formatter={fmtNum} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
      </div>

      {/* Top States + Top Customers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SectionCard title="Top States by Orders">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={topStatesData} layout="vertical" margin={{ top: 0, right: 48, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
              <XAxis type="number" tick={TICK} axisLine={false} tickLine={false} />
              <YAxis dataKey="name" type="category" width={110} tick={TICK_DARK} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "#F8FAFC" }} />
              <Bar dataKey="value" fill="#4E7BB5" radius={[0, 4, 4, 0]} name="Orders" animationDuration={800}>
                <LabelList dataKey="value" position="right" style={{ fontSize: 11, fill: "#94a3b8", fontWeight: 400 }} formatter={fmtNum} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Top Customers by Qty">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={topCustomersData} layout="vertical" margin={{ top: 0, right: 48, bottom: 0, left: 12 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
              <XAxis type="number" tick={TICK} axisLine={false} tickLine={false} />
              <YAxis
                dataKey="name"
                type="category"
                width={168}
                tick={<CustomerAxisTick />}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "#F8FAFC" }} />
              <Bar dataKey="value" fill="#5BAFA8" radius={[0, 4, 4, 0]} name="Qty" animationDuration={800}>
                <LabelList dataKey="value" position="right" style={{ fontSize: 11, fill: "#94a3b8", fontWeight: 400 }} formatter={fmtNum} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
      </div>

      {/* Collection Mix + Delivery Priority */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SectionCard title="Collection Mix">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={collectionsData} margin={{ top: 8, right: 16, bottom: 32, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ ...TICK_DARK, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                angle={-30}
                textAnchor="end"
                interval={0}
              />
              <YAxis tick={TICK} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "#F8FAFC" }} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} name="Orders" animationDuration={800}>
                {collectionsData.map((_, i) => (
                  <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Delivery Priority Split">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={deliveryData} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="name" tick={TICK_DARK} axisLine={false} tickLine={false} />
              <YAxis tick={TICK} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "#F8FAFC" }} />
              <Bar dataKey="value" fill="#9B8EC4" radius={[4, 4, 0, 0]} name="Orders" animationDuration={800}>
                <LabelList dataKey="value" position="top" style={{ fontSize: 11, fill: "#94a3b8", fontWeight: 400 }} formatter={fmtNum} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
      </div>

      {/* Order Type + Gold Weight by Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SectionCard title="Order Type Breakdown">
          <div className="grid grid-cols-2 gap-3">
            {orderTypes.map((t, i) => (
              <div
                key={t.type}
                className="rounded-xl p-4 border border-[#E2E8F4]"
                style={{ background: CHART_PALETTE[i % CHART_PALETTE.length] + "14" }}
              >
                <p className="text-[10px] font-medium uppercase tracking-wider text-[#94a3b8]">{t.type}</p>
                <p className="text-2xl font-semibold text-[#1e293b] mt-1">{fmtNum(t.count)}</p>
                <p className="text-[10px] font-normal text-[#94a3b8] mt-0.5">{((t.count / totalOrders) * 100).toFixed(1)}% of total</p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Gold Weight by Status (gm)">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={goldByStatusData} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="name" tick={{ ...TICK, fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis tick={TICK} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "#F8FAFC" }} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} name="Gold (gm)" animationDuration={800}>
                {goldByStatusData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="border-t border-[#F1F5F9] mt-3 pt-3 grid grid-cols-3 gap-2">
            {[
              { label: "Total", val: `${fmtNum(Math.round(totalGoldWeight))} gm` },
              { label: "Avg/Order", val: `${(totalGoldWeight / (totalOrders || 1)).toFixed(2)} gm` },
              { label: "Orders", val: fmtNum(totalOrders) },
            ].map((m) => (
              <div key={m.label} className="bg-[#F8FAFC] rounded-lg p-2 text-center">
                <p className="text-[10px] font-normal text-[#94a3b8]">{m.label}</p>
                <p className="text-sm font-medium text-[#1e293b]">{m.val}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
