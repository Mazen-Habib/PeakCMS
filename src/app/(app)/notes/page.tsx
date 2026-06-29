import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { NotesClient } from "./notes-client";
import type { Note } from "@/lib/types";

export default async function NotesPage() {
  await requireAdmin();
  const supabase = await createClient();

  const [notesRes, ordersRes] = await Promise.all([
    supabase.from("notes").select("*").order("created_at", { ascending: false }),
    supabase
      .from("orders_view")
      .select("id, customer_name")
      .order("created_at", { ascending: false }),
  ]);

  const notes = (notesRes.data ?? []) as Note[];
  const orders = (ordersRes.data ?? []) as { id: string; customer_name: string }[];

  // Resolve linked order names for display.
  const orderMap = new Map(orders.map((o) => [o.id, o.customer_name]));
  const notesWithNames = notes.map((n) => ({
    ...n,
    linked_order_name: n.linked_order_id
      ? orderMap.get(n.linked_order_id) ?? null
      : null,
  }));

  return (
    <div>
      <PageHeader title="Notes" description="Freeform notes, newest first." />
      <NotesClient notes={notesWithNames} orders={orders} />
    </div>
  );
}
