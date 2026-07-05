"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import {
  FILAMENT_COLORS,
  INVENTORY_ITEM_TYPES,
  type FilamentColor,
  type InventoryItemType,
} from "@/lib/constants";

type ActionResult = { ok: true } | { ok: false; error: string };

async function assertAdmin(): Promise<ActionResult | null> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return { ok: false, error: "Not authorized." };
  }
  return null;
}

/** Add stock back to an auto-tracked item (frames/packaging/flyers). */
export async function receiveStock(
  itemType: InventoryItemType,
  amount: number
): Promise<ActionResult> {
  const denied = await assertAdmin();
  if (denied) return denied;
  if (!INVENTORY_ITEM_TYPES.includes(itemType) || amount <= 0) {
    return { ok: false, error: "Invalid input." };
  }
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("inventory_items")
    .select("id, quantity")
    .eq("item_type", itemType)
    .single();
  if (!row) return { ok: false, error: "Item not found." };

  const { error } = await supabase
    .from("inventory_items")
    .update({ quantity: row.quantity + Math.round(amount) })
    .eq("id", row.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Directly set an auto-tracked item's quantity (e.g. manual correction). */
export async function setItemQuantity(
  itemType: InventoryItemType,
  quantity: number
): Promise<ActionResult> {
  const denied = await assertAdmin();
  if (denied) return denied;
  if (!INVENTORY_ITEM_TYPES.includes(itemType) || quantity < 0) {
    return { ok: false, error: "Invalid input." };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("inventory_items")
    .update({ quantity: Math.round(quantity) })
    .eq("item_type", itemType);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Set an item's low-stock threshold. */
export async function setItemThreshold(
  id: string,
  threshold: number
): Promise<ActionResult> {
  const denied = await assertAdmin();
  if (denied) return denied;
  const supabase = await createClient();
  const { error } = await supabase
    .from("inventory_items")
    .update({ low_stock_threshold: Math.max(0, Math.round(threshold)) })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/inventory");
  return { ok: true };
}

/** Adjust a filament roll's remaining kg by a delta (manual). */
export async function adjustFilament(
  id: string,
  deltaKg: number
): Promise<ActionResult> {
  const denied = await assertAdmin();
  if (denied) return denied;
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("filament_rolls")
    .select("kg_remaining")
    .eq("id", id)
    .single();
  if (!row) return { ok: false, error: "Roll not found." };

  const next = Math.max(0, Number((row.kg_remaining + deltaKg).toFixed(3)));
  const { error } = await supabase
    .from("filament_rolls")
    .update({ kg_remaining: next })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Add a new filament roll (1kg starting value by default). */
export async function addFilamentRoll(
  formData: FormData
): Promise<ActionResult> {
  const denied = await assertAdmin();
  if (denied) return denied;
  const roll_number = String(formData.get("roll_number") || "").trim();
  const color = String(formData.get("color") || "") as FilamentColor;
  if (!roll_number) return { ok: false, error: "Roll number is required." };
  if (!FILAMENT_COLORS.includes(color)) {
    return { ok: false, error: "Invalid color." };
  }
  const kg = Number(formData.get("kg_remaining") || 1);

  const supabase = await createClient();
  const { error } = await supabase.from("filament_rolls").insert({
    roll_number,
    color,
    kg_remaining: kg,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteFilamentRoll(id: string): Promise<ActionResult> {
  const denied = await assertAdmin();
  if (denied) return denied;
  const supabase = await createClient();
  const { error } = await supabase.from("filament_rolls").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Adjust hexagon-wrap stock by a number of units (1 wrap = 3 units). */
export async function adjustWraps(
  id: string,
  deltaUnits: number
): Promise<ActionResult> {
  const denied = await assertAdmin();
  if (denied) return denied;
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("hexagon_wraps")
    .select("units_remaining")
    .eq("id", id)
    .single();
  if (!row) return { ok: false, error: "Wrap stock not found." };

  const next = Math.max(0, row.units_remaining + Math.round(deltaUnits));
  const { error } = await supabase
    .from("hexagon_wraps")
    .update({ units_remaining: next })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  return { ok: true };
}
