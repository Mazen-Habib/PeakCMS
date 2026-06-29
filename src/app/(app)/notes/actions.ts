"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

type ActionResult = { ok: true } | { ok: false; error: string };

export async function createNote(formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return { ok: false, error: "Not authorized." };
  }
  const content = String(formData.get("content") || "").trim();
  if (!content) return { ok: false, error: "Note content is required." };
  const linked = String(formData.get("linked_order_id") || "");

  const supabase = await createClient();
  const { error } = await supabase.from("notes").insert({
    content,
    linked_order_id: linked || null,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/notes");
  return { ok: true };
}

export async function deleteNote(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("notes").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/notes");
  return { ok: true };
}
