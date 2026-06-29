import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/page-header";
import { TeamClient } from "./team-client";
import type { UserRole } from "@/lib/constants";

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  pending: boolean;
};

export default async function TeamPage() {
  const me = await requireAdmin();
  const admin = createAdminClient();

  const [{ data: profiles }, { data: authList }] = await Promise.all([
    admin.from("users").select("id, name, role"),
    admin.auth.admin.listUsers(),
  ]);

  const roleMap = new Map(
    (profiles ?? []).map((p) => [p.id, p as { id: string; name: string; role: UserRole }])
  );

  const members: TeamMember[] = (authList?.users ?? []).map((u) => {
    const profile = roleMap.get(u.id);
    return {
      id: u.id,
      name: profile?.name || (u.user_metadata?.name as string) || "",
      email: u.email ?? "",
      role: profile?.role ?? "designer",
      // Invited but not yet accepted (no confirmed sign-in).
      pending: !u.last_sign_in_at,
    };
  });

  return (
    <div>
      <PageHeader
        title="Team"
        description="Invite and manage who can access PEAK Operations."
      />
      <TeamClient members={members} currentUserId={me.id} />
    </div>
  );
}
