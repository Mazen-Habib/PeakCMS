import {
  startOfMonth,
  startOfWeek,
  subWeeks,
  subMonths,
  format,
  isAfter,
} from "date-fns";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { LowStockBanner } from "@/components/low-stock-banner";
import {
  OrdersPerWeekChart,
  RevenueChart,
  StatusBreakdownChart,
} from "./dashboard-charts";
import { formatCurrency } from "@/lib/utils";
import { stockHealth } from "@/lib/stock";
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  INVENTORY_ITEM_LABELS,
  FILAMENT_COLOR_LABELS,
  HEX_UNITS_PER_WRAP,
} from "@/lib/constants";
import type {
  OrderWithDesigner,
  InventoryItem,
  FilamentRoll,
  HexagonWrap,
} from "@/lib/types";
import { StatusBadge } from "@/components/status-badge";

export default async function DashboardPage() {
  const user = await requireUser();
  const supabase = await createClient();

  if (user.role !== "admin") {
    return <DesignerDashboard supabase={supabase} name={user.name} />;
  }

  return <AdminDashboard supabase={supabase} />;
}

// ---------------------------------------------------------------------------
// Designer dashboard
// ---------------------------------------------------------------------------
async function DesignerDashboard({ supabase, name }: { supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>; name: string }) {
  const { data } = await supabase
    .from("orders_view")
    .select("id, customer_name, status, assigned_designer_name, created_at")
    .order("created_at", { ascending: false });

  const orders = (data ?? []) as OrderWithDesigner[];

  const pending     = orders.filter((o) => o.status === "pending").length;
  const inProgress  = orders.filter((o) => o.status === "in_progress").length;
  const modelMade   = orders.filter((o) => o.status === "model_made").length;
  const needsRevise = orders.filter((o) => o.status === "revise").length;

  const actionable = orders.filter((o) =>
    ["pending", "in_progress", "revise"].includes(o.status)
  );

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div>
      <PageHeader
        title={`${greeting}, ${name || "Designer"}`}
        description={format(new Date(), "EEEE, MMMM d")}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Pending" value={String(pending)} />
        <StatCard label="In Progress" value={String(inProgress)} />
        <StatCard label="Model Made" value={String(modelMade)} />
        <StatCard
          label="Needs Revision"
          value={String(needsRevise)}
          highlight={needsRevise > 0}
        />
      </div>

      {actionable.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 text-sm font-semibold text-foreground">
            Needs attention
          </h2>
          <div className="rounded-lg border border-border bg-card divide-y divide-border">
            {actionable.map((o) => (
              <a
                key={o.id}
                href={`/orders/${o.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors"
              >
                <span className="text-sm font-medium">{o.customer_name}</span>
                <StatusBadge status={o.status} />
              </a>
            ))}
          </div>
        </div>
      )}

      {actionable.length === 0 && (
        <p className="mt-10 text-center text-sm text-muted-foreground">
          All caught up — no orders need attention right now.
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Admin dashboard
// ---------------------------------------------------------------------------
async function AdminDashboard({ supabase }: { supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>> }) {
  const [ordersRes, invRes, filRes, hexRes] = await Promise.all([
    supabase.from("orders_view").select("*"),
    supabase.from("inventory_items").select("*"),
    supabase.from("filament_rolls").select("*"),
    supabase.from("hexagon_wraps").select("*"),
  ]);

  const orders = (ordersRes.data ?? []) as OrderWithDesigner[];
  const inventory = (invRes.data ?? []) as InventoryItem[];
  const filament = (filRes.data ?? []) as FilamentRoll[];
  const wraps = (hexRes.data ?? []) as HexagonWrap[];

  const monthStart = startOfMonth(new Date());
  const thisMonth = orders.filter((o) =>
    isAfter(new Date(o.created_at), monthStart)
  );

  const revenueThisMonth = thisMonth.reduce(
    (sum, o) => sum + (o.amount_paid ?? 0),
    0
  );
  const pendingCount = orders.filter((o) => o.status === "pending").length;
  const deliveredThisMonth = thisMonth.filter(
    (o) => o.status === "delivered"
  ).length;

  const lowStock: string[] = [];
  for (const item of inventory) {
    if (stockHealth(item.quantity, item.low_stock_threshold) === "low") {
      lowStock.push(`${INVENTORY_ITEM_LABELS[item.item_type]} (${item.quantity})`);
    }
  }
  for (const roll of filament) {
    if (stockHealth(roll.kg_remaining, roll.low_stock_threshold) === "low") {
      lowStock.push(
        `${FILAMENT_COLOR_LABELS[roll.color]} filament #${roll.roll_number} (${roll.kg_remaining}kg)`
      );
    }
  }
  for (const w of wraps) {
    if (stockHealth(w.units_remaining, w.low_stock_threshold) === "low") {
      const fullWraps = (w.units_remaining / HEX_UNITS_PER_WRAP).toFixed(1);
      lowStock.push(`Hexagon wraps (${fullWraps} wraps)`);
    }
  }

  const weekBuckets: { week: string; orders: number; start: Date }[] = [];
  for (let i = 7; i >= 0; i--) {
    const start = startOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 });
    weekBuckets.push({ week: format(start, "d MMM"), orders: 0, start });
  }
  for (const o of orders) {
    const d = new Date(o.created_at);
    for (let i = 0; i < weekBuckets.length; i++) {
      const next = weekBuckets[i + 1]?.start;
      if (
        !isAfter(weekBuckets[i].start, d) &&
        (!next || isAfter(next, d))
      ) {
        weekBuckets[i].orders += 1;
        break;
      }
    }
  }

  const monthBuckets: { month: string; revenue: number; start: Date }[] = [];
  for (let i = 5; i >= 0; i--) {
    const start = startOfMonth(subMonths(new Date(), i));
    monthBuckets.push({ month: format(start, "MMM"), revenue: 0, start });
  }
  for (const o of orders) {
    const d = new Date(o.created_at);
    for (let i = 0; i < monthBuckets.length; i++) {
      const next = monthBuckets[i + 1]?.start;
      if (
        !isAfter(monthBuckets[i].start, d) &&
        (!next || isAfter(next, d))
      ) {
        monthBuckets[i].revenue += o.amount_paid ?? 0;
        break;
      }
    }
  }

  const statusData = ORDER_STATUSES.map((s) => ({
    name: ORDER_STATUS_LABELS[s],
    value: orders.filter((o) => o.status === s).length,
  }));

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={format(new Date(), "MMMM yyyy")}
      />

      <LowStockBanner items={lowStock} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Revenue this month"
          value={formatCurrency(revenueThisMonth)}
        />
        <StatCard label="Total orders" value={String(orders.length)} />
        <StatCard label="Pending" value={String(pendingCount)} />
        <StatCard
          label="Delivered this month"
          value={String(deliveredThisMonth)}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <OrdersPerWeekChart data={weekBuckets.map(({ week, orders }) => ({ week, orders }))} />
        <RevenueChart
          data={monthBuckets.map(({ month, revenue }) => ({ month, revenue }))}
        />
        <div className="lg:col-span-2">
          <StatusBreakdownChart data={statusData} />
        </div>
      </div>
    </div>
  );
}
