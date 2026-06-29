import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import {
  AutoStockSection,
  FilamentSection,
  HexagonSection,
} from "./inventory-client";
import type { InventoryItem, FilamentRoll, HexagonWrap } from "@/lib/types";

export default async function InventoryPage() {
  await requireAdmin();
  const supabase = await createClient();

  const [invRes, filRes, hexRes] = await Promise.all([
    supabase.from("inventory_items").select("*").order("item_type"),
    supabase.from("filament_rolls").select("*").order("roll_number"),
    supabase.from("hexagon_wraps").select("*").limit(1),
  ]);

  const inventory = (invRes.data ?? []) as InventoryItem[];
  const filament = (filRes.data ?? []) as FilamentRoll[];
  const wrap = ((hexRes.data ?? [])[0] ?? null) as HexagonWrap | null;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Inventory"
        description="Frames, packaging and flyers auto-decrement when an order is printed. Filament and hexagon wraps are tracked manually."
      />

      <AutoStockSection items={inventory} />
      <FilamentSection rolls={filament} />
      <HexagonSection wrap={wrap} />
    </div>
  );
}
