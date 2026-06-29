/**
 * Domain constants for PEAK Operations.
 * Enums here mirror the Postgres enums defined in supabase/migrations.
 */

export const ORDER_STATUSES = [
  "pending",
  "in_progress",
  "model_made",
  "revise",
  "printed",
  "shipped",
  "delivered",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  model_made: "Model Made",
  revise: "Revise",
  printed: "Printed",
  shipped: "Shipped",
  delivered: "Delivered",
};

/** Statuses a designer is allowed to set on their assigned orders. */
export const DESIGNER_ALLOWED_STATUSES: OrderStatus[] = ["in_progress", "model_made"];

/**
 * Trigger point for auto-decrementing frame/packaging/flyer stock.
 * Decided during build: stock is consumed when an order is marked `printed`,
 * which is the closest status to physical consumption of materials.
 * Changing this value also requires updating the DB trigger in
 * supabase/migrations (function `decrement_inventory_on_print`).
 */
export const STOCK_DEDUCTION_STATUS: OrderStatus = "printed";

export const ORDER_SOURCES = ["whatsapp", "shopify"] as const;
export type OrderSource = (typeof ORDER_SOURCES)[number];

export const ORDER_SOURCE_LABELS: Record<OrderSource, string> = {
  whatsapp: "WhatsApp",
  shopify: "Shopify",
};

export const PRODUCT_TYPES = ["frame"] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];

export const INVENTORY_ITEM_TYPES = ["frame", "packaging", "flyer"] as const;
export type InventoryItemType = (typeof INVENTORY_ITEM_TYPES)[number];

export const INVENTORY_ITEM_LABELS: Record<InventoryItemType, string> = {
  frame: "Frames",
  packaging: "Packaging",
  flyer: "Flyers",
};

export const FILAMENT_COLORS = [
  "black",
  "white",
  "grey",
  "army_green",
  "red",
  "yellow",
] as const;
export type FilamentColor = (typeof FILAMENT_COLORS)[number];

export const FILAMENT_COLOR_LABELS: Record<FilamentColor, string> = {
  black: "Black",
  white: "White",
  grey: "Grey",
  army_green: "Army Green",
  red: "Red",
  yellow: "Yellow",
};

export const USER_ROLES = ["admin", "designer"] as const;
export type UserRole = (typeof USER_ROLES)[number];

/** 1 physical hexagon wrap = 3 internal units. */
export const HEX_UNITS_PER_WRAP = 3;
