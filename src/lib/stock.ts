import type { StockHealth } from "./types";

/**
 * Classify a stock level relative to its threshold.
 *  - low:     at or below threshold
 *  - warning: within 25% above threshold (approaching)
 *  - healthy: comfortably above
 */
export function stockHealth(
  current: number,
  threshold: number
): StockHealth {
  if (current <= threshold) return "low";
  if (current <= threshold * 1.25) return "warning";
  return "healthy";
}

export const STOCK_BADGE_VARIANT: Record<
  StockHealth,
  "success" | "warning" | "danger"
> = {
  healthy: "success",
  warning: "warning",
  low: "danger",
};
