"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";
import { USER_ROLES, type UserRole } from "@/lib/constants";

type ActionResult = { ok: true } | { ok: false; error: string };

/** Invite a new team member by email (sends a Supabase invite link). */
export async function inviteMember(
  formData: FormData
): Promise<ActionResult> {
  const me = await getCurrentUser();
  if (!me || me.role !== "admin") {
    return { ok: false, error: "Not authorized." };
  }

  const email = String(formData.get("email") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const role = String(formData.get("role") || "designer") as UserRole;
  if (!email) return { ok: false, error: "Email is required." };
  if (!USER_ROLES.includes(role)) {
    return { ok: false, error: "Invalid role." };
  }

  const admin = createAdminClient();
  const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`;
  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { name, role },
    redirectTo,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/team");
  return { ok: true };
}

/** Update a member's display name. */
export async function updateMemberName(
  id: string,
  name: string
): Promise<ActionResult> {
  const me = await getCurrentUser();
  if (!me || me.role !== "admin") {
    return { ok: false, error: "Not authorized." };
  }
  const admin = createAdminClient();
  const { error } = await admin
    .from("users")
    .update({ name: name.trim() })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/team");
  return { ok: true };
}

/** Change an existing member's role (updates profile row). */
export async function updateMemberRole(
  id: string,
  role: UserRole
): Promise<ActionResult> {
  const me = await getCurrentUser();
  if (!me || me.role !== "admin") {
    return { ok: false, error: "Not authorized." };
  }
  if (!USER_ROLES.includes(role)) {
    return { ok: false, error: "Invalid role." };
  }
  if (id === me.id && role !== "admin") {
    return { ok: false, error: "You cannot remove your own admin access." };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("users").update({ role }).eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/team");
  return { ok: true };
}

/** Remove a team member entirely (deletes the auth user; profile cascades). */
export async function removeMember(id: string): Promise<ActionResult> {
  const me = await getCurrentUser();
  if (!me || me.role !== "admin") {
    return { ok: false, error: "Not authorized." };
  }
  if (id === me.id) {
    return { ok: false, error: "You cannot remove yourself." };
  }

  try {
    const admin = createAdminClient();

    // Unassign orders first so the profile row can be removed cleanly.
    await admin.from("orders").update({ assigned_designer_id: null }).eq("assigned_designer_id", id);

    // Delete the profile row directly (auth cascade will clean up auth.users).
    await admin.from("users").delete().eq("id", id);

    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) {
      const msg = typeof error.message === "string" && error.message
        ? error.message
        : JSON.stringify(error);
      return { ok: false, error: msg };
    }

    revalidatePath("/team");
    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : JSON.stringify(e);
    return { ok: false, error: msg || "Unexpected error." };
  }
}
