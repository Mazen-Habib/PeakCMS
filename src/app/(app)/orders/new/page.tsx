import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { AddOrderForm } from "./add-order-form";

export default async function NewOrderPage() {
  await requireAdmin();

  const supabase = await createClient();
  const { data: designers } = await supabase
    .from("users")
    .select("id, name")
    .eq("role", "designer")
    .order("name");

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Add Order"
        description="Manually log an order (e.g. received via WhatsApp)."
      />
      <AddOrderForm designers={designers ?? []} />
    </div>
  );
}
