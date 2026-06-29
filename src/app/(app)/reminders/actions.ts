"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

type ActionResult = { ok: true } | { ok: false; error: string };

export async function createReminder(
  formData: FormData
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return { ok: false, error: "Not authorized." };
  }
  const title = String(formData.get("title") || "").trim();
  const due = String(formData.get("due_date") || "");
  if (!title) return { ok: false, error: "Title is required." };
  if (!due) return { ok: false, error: "Due date is required." };

  const supabase = await createClient();
  const { error } = await supabase.from("reminders").insert({
    title,
    due_date: new Date(due).toISOString(),
    notes: String(formData.get("notes") || "") || null,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/reminders");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function setReminderCompleted(
  id: string,
  completed: boolean
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("reminders")
    .update({ completed })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/reminders");
  return { ok: true };
}

export async function deleteReminder(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("reminders").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/reminders");
  return { ok: true };
}
