import { useState } from "react";
import { ArrowRight, RotateCcw } from "lucide-react";

const INSIGHTS = [
  {
    id: 1,
    alert: "CASH BLOCK",
    severity: "Critical",
    finding:
      "₹10+ Cr worth of 1,389 pieces are Ready for Dispatch — held only by pending payment confirmation.",
    action: "Call all overdue accounts today.",
    icon: "account_balance",
    featured: true,
  },
  {
    id: 2,
    alert: "VENDOR OVERLOAD",
    severity: "High",
    finding:
      "433 orders Pending from Vendor with Shree Gems at 95% capacity — delay risk is live right now.",
    action: "Redistribute new assignments to Raj Diamonds immediately.",
    icon: "precision_manufacturing",
  },
  {
    id: 3,
    alert: "SINGLE-ACCOUNT RISK",
    severity: "High",
    finding:
      "NYSA Jorhat alone = 65% of all Assam orders (187 of 286) — one franchise failure collapses the state.",
    action: "Open 2 new Assam franchises in Guwahati/Dibrugarh.",
    icon: "hub",
  },
  {
    id: 4,
    alert: "PUSH OPPORTUNITY",
    severity: "Growth",
    finding:
      "AP/Vizag orders average 19.8 gm/piece vs fleet average of 7.9 gm — highest-value market, only 128 orders.",
    action: "Aggressively push Kanakam collection into AP.",
    icon: "trending_up",
  },
  {
    id: 5,
    alert: "REVENUE LEAK",
    severity: "Margin",
    finding:
      "394 express 12-day orders carry zero pricing premium over standard 20-day orders.",
    action: "Introduce 2–3% express handling charge on 12-day tier.",
    icon: "price_change",
  },
];

const SEVERITY_STYLES = {
  Critical: {
    badge: "bg-[#B89090]/20 text-[#8B6060] border-[#E8D4D4]",
    iconBg: "bg-[#B89090]/15 text-[#8B6060]",
    ring: "ring-[#B89090]/25",
  },
  High: {
    badge: "bg-[#C9A84C]/15 text-[#755B00] border-[#C9A84C]/30",
    iconBg: "bg-[#C9A84C]/15 text-[#A07830]",
    ring: "ring-[#C9A84C]/20",
  },
  Growth: {
    badge: "bg-[#0D1B3E]/8 text-[#0D1B3E] border-[#C9A84C]/25",
    iconBg: "bg-[#0D1B3E]/8 text-[#0D1B3E]",
    ring: "ring-[#0D1B3E]/10",
  },
  Margin: {
    badge: "bg-[#0D1B3E]/8 text-[#0D1B3E] border-[#C6C6CF]/40",
    iconBg: "bg-[#0D1B3E]/8 text-[#0D1B3E]",
    ring: "ring-[#0D1B3E]/10",
  },
};

function InsightCard({ insight, featured = false }) {
  const style = SEVERITY_STYLES[insight.severity] || SEVERITY_STYLES.Margin;

  if (featured) {
    return (
      <article
        className="relative overflow-hidden rounded-2xl border border-[#C9A84C]/25 p-6 md:p-7"
        style={{
          background: "linear-gradient(135deg, #0D1B3E 0%, #1A1250 55%, #0D1B3E 100%)",
        }}
      >
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #C9A84C 0%, transparent 70%)" }}
        />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-start md:gap-6">
          <div className={`shrink-0 p-3 rounded-xl ${style.iconBg}`}>
            <span className="material-symbols-outlined text-[22px] text-[#C9A84C]">{insight.icon}</span>
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-mono text-[#C9A84C]/70">SIGNAL 0{insight.id}</span>
              <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${style.badge}`}>
                {insight.severity}
              </span>
            </div>
            <h4 className="text-lg font-bold text-white tracking-wide">{insight.alert}</h4>
            <p className="text-sm text-white/75 leading-relaxed max-w-3xl">{insight.finding}</p>
            <div className="flex items-start gap-3 rounded-xl bg-white/8 border border-[#C9A84C]/20 px-4 py-3 mt-2">
              <span className="text-[9px] font-bold uppercase tracking-widest text-[#C9A84C] shrink-0 pt-0.5">
                Action
              </span>
              <p className="text-sm font-medium text-white leading-snug flex-1">{insight.action}</p>
              <ArrowRight className="w-4 h-4 text-[#C9A84C] shrink-0 mt-0.5" />
            </div>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article
      className={`group flex flex-col h-full rounded-2xl border border-[#E2E8F4] bg-white p-5 ring-1 ${style.ring} hover:border-[#C9A84C]/30 hover:shadow-md transition-all duration-200`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className={`p-2 rounded-lg ${style.iconBg}`}>
          <span className="material-symbols-outlined text-[18px]">{insight.icon}</span>
        </div>
        <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${style.badge}`}>
          {insight.severity}
        </span>
      </div>
      <p className="text-[10px] font-mono text-[#94a3b8] mb-1">0{insight.id}</p>
      <h4 className="text-sm font-bold text-[#0D1B3E] tracking-wide mb-2">{insight.alert}</h4>
      <p className="text-[13px] text-[#45464E] leading-relaxed flex-1">{insight.finding}</p>
      <div className="mt-4 pt-3 border-t border-[#F1F5F9] flex items-start gap-2">
        <span className="text-[9px] font-bold uppercase tracking-widest text-[#C9A84C] shrink-0 pt-1">
          Do
        </span>
        <p className="text-[12px] font-semibold text-[#0D1B3E] leading-snug flex-1">{insight.action}</p>
        <ArrowRight className="w-3.5 h-3.5 text-[#C9A84C] opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
      </div>
    </article>
  );
}

export default function AiOperationsIntelligence({ onResetDemoData }) {
  const [featured, ...rest] = INSIGHTS;
  const [resetting, setResetting] = useState(false);

  const handleReset = async () => {
    setResetting(true);
    try {
      await onResetDemoData?.();
    } finally {
      setResetting(false);
    }
  };

  return (
    <section className="rounded-2xl border border-[#C6C6CF]/30 bg-gradient-to-b from-white to-[#F8F9FB] p-6 md:p-7">
      <header className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-[#0D1B3E] rounded-xl shrink-0">
            <span className="material-symbols-outlined text-[18px] text-[#C9A84C]">psychology</span>
          </div>
          <div>
            <h3 className="font-bold text-base text-[#0D1B3E]">AI Operations Intelligence</h3>
            <p className="text-xs text-[#76767F] mt-0.5">
              {INSIGHTS.length} operational signals ranked by business impact
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-[#0D1B3E] bg-[#0D1B3E]/5 border border-[#C9A84C]/25 px-3 py-1.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-[#C9A84C] animate-pulse" />
          Live analysis
        </div>
      </header>

      <div className="space-y-4">
        <InsightCard insight={featured} featured />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {rest.map((insight) => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </div>
      </div>

      {onResetDemoData && (
        <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-xl border border-[#E2E8F4] bg-white px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-[#0D1B3E]">Workflow demo data</p>
            <p className="text-xs text-[#76767F] mt-0.5">
              Orders, QC, payment, and vendor portal use sample data. Reset after testing to restore the default scenario.
            </p>
          </div>
          <button
            type="button"
            onClick={handleReset}
            disabled={resetting}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0D1B3E] hover:bg-[#1A1250] text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-60 shrink-0"
          >
            <RotateCcw className={`w-3.5 h-3.5 text-[#C9A84C] ${resetting ? "animate-spin" : ""}`} />
            {resetting ? "Resetting…" : "Reset Demo Data"}
          </button>
        </div>
      )}
    </section>
  );
}
