import {
  computeOrderStats,
  filterWorkflowOrders,
  getInitialWorkflowState,
  resetWorkflowState,
  isMockWorkflowOrder,
} from "../mocks/workflowData.js";

export { DEMO_VENDOR_NAME, DEMO_VENDOR_ID, isMockWorkflowOrder } from "../mocks/workflowData.js";
export { filterWorkflowOrders, computeOrderStats, resetWorkflowState };

/** Workflow tabs must never show live MongoDB orders — mock IDs only. */
export function getSanitizedWorkflowOrders(orders) {
  if (!Array.isArray(orders)) return getInitialWorkflowState().orders;
  const mockOnly = orders.filter(isMockWorkflowOrder);
  if (mockOnly.length > 0) return mockOnly;
  return getInitialWorkflowState().orders;
}

export function createWorkflowStore() {
  return getInitialWorkflowState();
}

export function applyWorkflowOrderFilters(orders, filters) {
  return filterWorkflowOrders(orders, filters);
}

export function patchWorkflowOrder(orders, id, updates) {
  return orders.map((o) => (o.id === id ? { ...o, ...updates } : o));
}

export function prependWorkflowActivity(activities, entry) {
  const item = {
    id: entry.id || `local-${Date.now()}`,
    ...entry,
  };
  return [item, ...activities].slice(0, 50);
}

export function recomputeWorkflowStats(orders) {
  return computeOrderStats(orders);
}
