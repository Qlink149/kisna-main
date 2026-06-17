import React, { useMemo, useState } from "react";
import { Bell, X, ShieldCheck, CreditCard, UserCheck, Truck, AlertTriangle, Info } from "lucide-react";

const CATEGORY_META = {
  QC: { label: "QC", icon: ShieldCheck, cls: "bg-[#0D1B3E]/5 text-[#0D1B3E] border-[#0D1B3E]/10" },
  Payment: { label: "Payment", icon: CreditCard, cls: "bg-[#C9A84C]/10 text-[#0D1B3E] border-[#C9A84C]/20" },
  Assignment: { label: "Assignment", icon: UserCheck, cls: "bg-[#FDF8EC] text-[#0D1B3E] border-[#C9A84C]/15" },
  Dispatch: { label: "Dispatch", icon: Truck, cls: "bg-[#0D1B3E]/5 text-[#0D1B3E] border-[#C9A84C]/15" },
  Production: { label: "Production", icon: Info, cls: "bg-[#F8F9FB] text-[#0D1B3E] border-[#C6C6CF]/30" },
  Alert: { label: "Alert", icon: AlertTriangle, cls: "bg-[#F5EDED] text-[#8B6060] border-[#E8D4D4]" },
  Operations: { label: "Ops", icon: Bell, cls: "bg-[#EFF4FF] text-[#0D1B3E] border-[#C9A84C]/15" },
};

export function categorizeNotification(item) {
  if (item.category) return item.category;
  const text = `${item.title || ""} ${item.description || ""}`.toLowerCase();
  if (text.includes("qc") || text.includes("quality") || text.includes("audit") || text.includes("ready for dispatch") || text.includes("ready for qc") || text.includes("submitted order")) {
    return "QC";
  }
  if (text.includes("payment") || text.includes("invoice") || text.includes("clearance")) {
    return "Payment";
  }
  if (text.includes("dispatch") || text.includes("bluedart") || text.includes("tracking") || text.includes("shipment")) {
    return "Dispatch";
  }
  if (text.includes("assign") || text.includes("accepted") || text.includes("reject") || text.includes("vendor") || text.includes("supplier") || text.includes("submitted order")) {
    return "Assignment";
  }
  if (text.includes("production") || text.includes("wip") || text.includes("fabrication") || text.includes("finishing") || text.includes("vendor accepted") || text.includes("vendor updated")) {
    return "Production";
  }
  if (text.includes("fail") || text.includes("overdue") || text.includes("restock")) {
    return "Alert";
  }
  return "Operations";
}

export default function NotificationPanel({
  open,
  onClose,
  items = [],
  onSelect,
  title = "Notifications",
  emptyMessage = "No alerts right now.",
}) {
  const [filter, setFilter] = useState("All");

  const enriched = useMemo(
    () =>
      items.map((item, index) => ({
        ...item,
        category: categorizeNotification(item),
        key: item.id || `${item.title}-${index}`,
      })),
    [items]
  );

  const filtered =
    filter === "All" ? enriched : enriched.filter((item) => item.category === filter);

  const categories = ["All", ...new Set(enriched.map((item) => item.category))];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60]" onClick={onClose}>
      <div
        className="absolute right-6 top-16 w-full max-w-md bg-white border border-[#C6C6CF]/40 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-[#EFF4FF] flex items-center justify-between bg-[#F8F9FF]">
          <div>
            <h3 className="font-bold text-sm text-[#0D1B3E]">{title}</h3>
            <p className="text-[10px] text-[#76767F] mt-0.5">{enriched.length} alert{enriched.length === 1 ? "" : "s"}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white text-[#76767F]"
            aria-label="Close notifications"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 py-3 border-b border-[#EFF4FF] flex flex-wrap gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilter(cat)}
              className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border transition-colors ${
                filter === cat
                  ? "bg-[#0D1B3E] text-[#C9A84C] border-[#0D1B3E]"
                  : "bg-white text-[#76767F] border-[#C6C6CF]/40 hover:border-[#C9A84C]/40"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="max-h-[min(60vh,420px)] overflow-y-auto custom-scrollbar divide-y divide-gray-50">
          {filtered.length === 0 ? (
            <p className="p-8 text-center text-sm text-[#76767F]">{emptyMessage}</p>
          ) : (
            filtered.map((item) => {
              const meta = CATEGORY_META[item.category] || CATEGORY_META.Operations;
              const Icon = meta.icon;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onSelect?.(item)}
                  className="w-full text-left px-5 py-4 hover:bg-[#F8F9FF] transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <span className={`shrink-0 p-1.5 rounded-lg border ${meta.cls}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${meta.cls}`}>
                          {meta.label}
                        </span>
                        {item.time && (
                          <span className="text-[9px] text-[#76767F] font-mono ml-auto">{item.time}</span>
                        )}
                      </div>
                      <p className="text-xs font-bold text-[#0D1B3E] leading-snug">{item.title}</p>
                      {item.description && (
                        <p className="text-[10px] text-[#76767F] mt-1 leading-relaxed">{item.description}</p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export function NotificationBell({ count, onClick, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`p-2 relative hover:bg-[#F8F9FF] rounded-full transition-colors ${className}`}
      aria-label={`${count} notifications`}
    >
      <Bell className="w-4 h-4 text-[#76767F]" />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-[#B89090] text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}
