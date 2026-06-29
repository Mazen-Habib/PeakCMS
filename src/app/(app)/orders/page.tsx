import Link from "next/link";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { OrdersTable } from "./orders-table";
import type { OrderWithDesigner } from "@/lib/types";

export default async function OrdersPage() {
  const user = await requireUser();
  const isAdmin = user.role === "admin";

  const supabase = await createClient();
  const { data } = await supabase
    .from("orders_view")
    .select("*")
    .order("created_at", { ascending: false });

  const orders = (data ?? []) as OrderWithDesigner[];

  return (
    <div>
      <PageHeader
        title="Orders"
        description={
          isAdmin
            ? "All orders across WhatsApp and Shopify."
            : "All orders — update status and upload model links."
        }
      >
        {isAdmin && (
          <Button asChild>
            <Link href="/orders/new">
              <Plus className="h-4 w-4" />
              Add Order
            </Link>
          </Button>
        )}
      </PageHeader>

      <OrdersTable orders={orders} isAdmin={isAdmin} />
    </div>
  );
}
