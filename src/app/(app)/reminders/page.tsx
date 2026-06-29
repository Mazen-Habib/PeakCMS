import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { RemindersClient } from "./reminders-client";
import type { Reminder } from "@/lib/types";

export default async function RemindersPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase
    .from("reminders")
    .select("*")
    .order("due_date", { ascending: true });

  return (
    <div>
      <PageHeader
        title="Reminders"
        description="Sorted by due date. Upcoming items are highlighted."
      />
      <RemindersClient reminders={(data ?? []) as Reminder[]} />
    </div>
  );
}
