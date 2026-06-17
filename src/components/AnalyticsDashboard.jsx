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

const NAVY = "#0D1B3E";
const NAVY_MID = "#1A1250";
const GOLD = "#C9A84C";
const GOLD_LIGHT = "#E8D4A8";
const MUTED = "#94a3b8";

function fmtNum(n) {
  return Number(n || 0).toLocaleString("en-IN");
}

function fmtCurrencyCr(val) {
  const cr = val / 1e7;
  return cr >= 1 ? `INR ${cr.toFixed(1)} Cr` : `INR ${(val / 1e5).toFixed(1)} L`;
}

function RankedQtyList({ items, barColor = GOLD }) {
  if (!items.length) {
    return <p className="text-sm text-[#94a3b8] py-8 text-center">No customer data</p>;
  }
  const maxVal = Math.max(...items.map((i) => i.value), 1);

  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <div key={`${item.name}-${index}`}>
          <div className="flex items-start gap-3 mb-1.5">
            <span className="text-[10px] font-mono font-semibold text-[#C9A84C] w-5 shrink-0 pt-0.5">
              {String(index + 1).padStart(2, "0")}
            </span>
            <p
              className="flex-1 text-[13px] font-medium text-[#0D1B3E] leading-snug break-words"
              title={item.name}
            >
              {item.name}
            </p>
            <span className="text-sm font-semibold text-[#0D1B3E] tabular-nums shrink-0 pt-px">
              {fmtNum(item.value)}
            </span>
          </div>
          <div className="ml-8 h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${Math.max(4, (item.value / maxVal) * 100)}%`,
                background: `linear-gradient(90deg, ${barColor} 0%, ${GOLD_LIGHT} 100%)`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function MetricCard({ label, value, sub }) {
  return (
    <div className="bg-white border border-[#E2E8F4] rounded-2xl p-5 flex flex-col gap-1 shadow-sm">
      <p className="text-[10px] font-medium uppercase tracking-widest text-[#94a3b8]">{label}</p>
      <p className="text-3xl md:text-4xl font-semibold text-[#0D1B3E] leading-tight">{value}</p>
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

const STATUS_COLORS = {
  "Ready For Dispatch": NAVY_MID,
  "Pending from Vendor": GOLD,
  "God WIP": NAVY,
  "GOD WIP": NAVY,
  "Inter Store Transfer": GOLD_LIGHT,
};

const CHART_PALETTE = [NAVY, NAVY_MID, GOLD, GOLD_LIGHT, "#3D4F6E", "#6B5A3E", "#2A3A5C", "#A89050"];

const KT_COLOR_MAP = {
  "22KT": GOLD,
  "18KT": NAVY,
  "14KT": NAVY_MID,
  "09KT": GOLD_LIGHT,
  STL: "#3D4F6E",
};

const TICK = { fontSize: 11, fill: MUTED, fontWeight: 400 };
const TICK_DARK = { fontSize: 11, fill: "#475569", fontWeight: 400 };

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#E2E8F4] rounded-xl shadow-lg p-3 text-xs">
      {label && <p className="font-medium text-[#0D1B3E] mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.fill || p.color || NAVY }} className="font-normal">
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
      <p className="font-medium text-[#0D1B3E]">{payload[0].name}</p>
      <p className="font-normal text-[#94a3b8]">Qty: {fmtNum(payload[0].value)}</p>
      <p className="font-normal text-[#94a3b8]">{payload[0].payload.percent}%</p>
    </div>
  );
};

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
      <div className="bg-[#FDF8EC] border border-[#C9A84C]/25 rounded-2xl p-6 text-center">
        <p className="font-medium text-[#0D1B3E] mb-1">Analytics data unavailable</p>
        <p className="text-sm font-normal text-[#76767F] mb-3">
          Home dashboard reads live data from MongoDB. Restart the API if the collection is empty.
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
    color: STATUS_COLORS[s.status] || NAVY_MID,
  }));

  const karatageData = karatage.map((k) => ({
    name: k.kt,
    value: k.count,
    fill: KT_COLOR_MAP[k.kt] || NAVY,
  }));

  const topStatesData = [...topStates].reverse().map((s) => ({
    name: s.state,
    value: s.count,
  }));

  const topCustomersData = topCustomers.map((c) => ({
    name: c.customer,
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
    fill: STATUS_COLORS[s.status] || NAVY_MID,
  }));

  return (
    <div className="space-y-6">
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
                <LabelList dataKey="value" position="top" style={{ fontSize: 11, fill: MUTED, fontWeight: 400 }} formatter={fmtNum} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SectionCard title="Top States by Orders">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={topStatesData} layout="vertical" margin={{ top: 0, right: 48, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
              <XAxis type="number" tick={TICK} axisLine={false} tickLine={false} />
              <YAxis dataKey="name" type="category" width={110} tick={TICK_DARK} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "#F8FAFC" }} />
              <Bar dataKey="value" fill={NAVY} radius={[0, 4, 4, 0]} name="Orders" animationDuration={800}>
                <LabelList dataKey="value" position="right" style={{ fontSize: 11, fill: MUTED, fontWeight: 400 }} formatter={fmtNum} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Top Customers by Qty">
          <RankedQtyList items={topCustomersData} barColor={GOLD} />
        </SectionCard>
      </div>

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
              <Bar dataKey="value" fill={NAVY_MID} radius={[4, 4, 0, 0]} name="Orders" animationDuration={800}>
                <LabelList dataKey="value" position="top" style={{ fontSize: 11, fill: MUTED, fontWeight: 400 }} formatter={fmtNum} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
      </div>

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
                <p className="text-2xl font-semibold text-[#0D1B3E] mt-1">{fmtNum(t.count)}</p>
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
                <p className="text-sm font-medium text-[#0D1B3E]">{m.val}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
