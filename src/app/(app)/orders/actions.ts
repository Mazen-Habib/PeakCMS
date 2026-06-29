"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import {
  ORDER_STATUSES,
  ORDER_SOURCES,
  DESIGNER_ALLOWED_STATUSES,
  type OrderStatus,
} from "@/lib/constants";

type ActionResult = { ok: true } | { ok: false; error: string };

/** Admin: create a manually-entered order (e.g. WhatsApp). */
export async function createOrder(formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return { ok: false, error: "Not authorized." };
  }

  const customer_name = String(formData.get("customer_name") || "").trim();
  if (!customer_name) return { ok: false, error: "Customer name is required." };

  const source = String(formData.get("source") || "whatsapp");
  const assigned = String(formData.get("assigned_designer_id") || "");

  const payload = {
    customer_name,
    strava_link: String(formData.get("strava_link") || "").trim() || null,
    customer_notes: String(formData.get("customer_notes") || "") || null,
    product_type: "frame" as const,
    amount_due: Number(formData.get("amount_due") || 0),
    amount_paid: Number(formData.get("amount_paid") || 0),
    source: ORDER_SOURCES.includes(source as never) ? source : "whatsapp",
    assigned_designer_id: assigned || null,
  };

  const supabase = await createClient();
  const { error } = await supabase.from("orders").insert(payload);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/orders");
  revalidatePath("/dashboard");
  return { ok: true };
}

/**
 * Update an order's status.
 * - Admin: any status.
 * - Designer: only in_progress or model_made (also enforced at DB level).
 */
export async function updateOrderStatus(
  id: string,
  status: OrderStatus
): Promise<ActionResult> {
  if (!ORDER_STATUSES.includes(status)) {
    return { ok: false, error: "Invalid status." };
  }
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated." };
  if (user.role !== "admin" && !DESIGNER_ALLOWED_STATUSES.includes(status)) {
    return { ok: false, error: "Designers can only set In Progress or Model Made." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/orders");
  revalidatePath(`/orders/${id}`);
  revalidatePath("/dashboard");
  revalidatePath("/inventory");
  return { ok: true };
}

/**
 * Admin shortcut: mark an order as delivered (fulfilled).
 */
export async function markFulfilled(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return { ok: false, error: "Not authorized." };
  }
  return updateOrderStatus(id, "delivered");
}

/** Admin: record a payment (sets total amount_paid). */
export async function logPayment(
  id: string,
  amountPaid: number
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return { ok: false, error: "Not authorized." };
  }
  if (Number.isNaN(amountPaid) || amountPaid < 0) {
    return { ok: false, error: "Invalid amount." };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("orders")
    .update({ amount_paid: amountPaid })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/orders/${id}`);
  revalidatePath("/orders");
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Admin: assign (or clear) a designer. */
export async function assignDesigner(
  id: string,
  designerId: string | null
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return { ok: false, error: "Not authorized." };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("orders")
    .update({ assigned_designer_id: designerId })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/orders/${id}`);
  revalidatePath("/orders");
  return { ok: true };
}

/**
 * Designer or admin: set/update the model file link.
 * The link is visible to everyone; any storage URL is accepted.
 */
export async function setModelLink(
  id: string,
  modelLink: string | null
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("orders")
    .update({ model_link: modelLink || null })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/orders");
  revalidatePath(`/orders/${id}`);
  return { ok: true };
}
