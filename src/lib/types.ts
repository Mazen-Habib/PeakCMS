import type {
  OrderStatus,
  OrderSource,
  ProductType,
  InventoryItemType,
  FilamentColor,
  UserRole,
} from "./constants";

/** Application-level row shapes. Mirror the DB schema in supabase/migrations. */

export type AppUser = {
  id: string;
  name: string;
  role: UserRole;
};

export type Order = {
  id: string;
  customer_name: string;
  strava_link: string | null;
  model_link: string | null;
  customer_notes: string | null;
  product_type: ProductType;
  // Financial columns are nullable because the view NULLs them for designers.
  amount_due: number | null;
  amount_paid: number | null;
  status: OrderStatus;
  source: OrderSource;
  assigned_designer_id: string | null;
  created_at: string;
  updated_at: string;
};

/** Order joined with the assigned designer's name (from orders_view). */
export type OrderWithDesigner = Order & {
  assigned_designer_name: string | null;
  /** computed: amount_due - amount_paid (null for designers). */
  balance: number | null;
};

export type InventoryItem = {
  id: string;
  item_type: InventoryItemType;
  quantity: number;
  low_stock_threshold: number;
};

export type FilamentRoll = {
  id: string;
  roll_number: string;
  color: FilamentColor;
  kg_remaining: number;
  low_stock_threshold: number;
};

export type HexagonWrap = {
  id: string;
  units_remaining: number;
  low_stock_threshold: number;
};

export type Note = {
  id: string;
  content: string;
  linked_order_id: string | null;
  created_at: string;
};

export type NoteWithOrder = Note & {
  linked_order_name: string | null;
};

export type Reminder = {
  id: string;
  title: string;
  due_date: string;
  notes: string | null;
  notification_method: "dashboard_flag";
  completed: boolean;
};

export type StockHealth = "healthy" | "warning" | "low";
