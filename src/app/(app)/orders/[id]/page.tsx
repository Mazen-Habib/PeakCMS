import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { OrderDetail } from "./order-detail";
import type { OrderWithDesigner } from "@/lib/types";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const isAdmin = user.role === "admin";

  const supabase = await createClient();
  const { data: order } = await supabase
    .from("orders_view")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!order) notFound();

  let designers: { id: string; name: string }[] = [];
  if (isAdmin) {
    const { data } = await supabase
      .from("users")
      .select("id, name")
      .eq("role", "designer")
      .order("name");
    designers = data ?? [];
  }

  return (
    <OrderDetail
      order={order as OrderWithDesigner}
      isAdmin={isAdmin}
      designers={designers}
    />
  );
}
