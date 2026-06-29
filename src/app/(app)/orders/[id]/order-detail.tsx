"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft, PackageCheck } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/status-badge";
import { StravaLink } from "@/components/strava-link";
import { ModelLink } from "@/components/model-link";
import { toast } from "@/components/ui/toaster";
import { formatCurrency } from "@/lib/utils";
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  ORDER_SOURCE_LABELS,
  DESIGNER_ALLOWED_STATUSES,
} from "@/lib/constants";
import type { OrderWithDesigner } from "@/lib/types";
import {
  assignDesigner,
  logPayment,
  markFulfilled,
  setModelLink,
  updateOrderStatus,
} from "../actions";

const UNASSIGNED = "__unassigned__";

export function OrderDetail({
  order,
  isAdmin,
  designers,
}: {
  order: OrderWithDesigner;
  isAdmin: boolean;
  designers: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [paymentInput, setPaymentInput] = React.useState(
    order.amount_paid != null ? String(order.amount_paid) : "0"
  );
  const [modelLinkInput, setModelLinkInput] = React.useState(
    order.model_link ?? ""
  );

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, msg: string) {
    startTransition(async () => {
      const res = await fn();
      if (res.ok) {
        toast({ title: msg, variant: "success" });
        router.refresh();
      } else {
        toast({ title: "Failed", description: res.error, variant: "error" });
      }
    });
  }

  const availableStatuses = isAdmin ? ORDER_STATUSES : DESIGNER_ALLOWED_STATUSES;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/orders">
            <ArrowLeft className="h-4 w-4" />
            Back to orders
          </Link>
        </Button>
        <StatusBadge status={order.status} />
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {order.customer_name}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {ORDER_SOURCE_LABELS[order.source]} ·{" "}
          {format(new Date(order.created_at), "d MMM yyyy, HH:mm")}
        </p>
      </div>

      {/* Customer details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Customer details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Strava:</span>
            <StravaLink href={order.strava_link} />
          </div>
          <div>
            <p className="mb-1 text-sm text-muted-foreground">
              Notes (name, title, colors)
            </p>
            {order.customer_notes ? (
              <pre className="whitespace-pre-wrap rounded-md border border-border bg-background p-3 font-sans text-sm">
                {order.customer_notes}
              </pre>
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Financials — admin only (NULL at DB level for designers) */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Due</p>
                <p className="text-lg font-semibold tabular-nums">
                  {formatCurrency(order.amount_due)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Paid</p>
                <p className="text-lg font-semibold tabular-nums">
                  {formatCurrency(order.amount_paid)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Balance</p>
                <p
                  className={
                    "text-lg font-semibold tabular-nums " +
                    ((order.balance ?? 0) > 0 ? "text-warning" : "text-success")
                  }
                >
                  {formatCurrency(order.balance)}
                </p>
              </div>
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-1">
                <Label htmlFor="payment">Update amount paid (EGP)</Label>
                <Input
                  id="payment"
                  type="number"
                  min="0"
                  step="0.01"
                  value={paymentInput}
                  onChange={(e) => setPaymentInput(e.target.value)}
                />
              </div>
              <Button
                disabled={pending}
                onClick={() =>
                  run(
                    () => logPayment(order.id, Number(paymentInput)),
                    "Payment updated"
                  )
                }
              >
                Save
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Production */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Production</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">

          {/* Status + designer (admin) / status only (designer) */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Status</Label>
              <Select
                value={order.status}
                onValueChange={(v) =>
                  run(
                    () => updateOrderStatus(order.id, v as never),
                    "Status updated"
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableStatuses.map((s) => (
                    <SelectItem key={s} value={s}>
                      {ORDER_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isAdmin && (
              <div className="space-y-1">
                <Label>Assigned designer</Label>
                <Select
                  value={order.assigned_designer_id ?? UNASSIGNED}
                  onValueChange={(v) =>
                    run(
                      () => assignDesigner(order.id, v === UNASSIGNED ? null : v),
                      "Designer updated"
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                    {designers.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name || "Unnamed"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Model link — editable by designer & admin, visible to everyone */}
          <div className="space-y-2">
            <Label>3D model file link</Label>
            <div className="flex items-center gap-2">
              <ModelLink href={order.model_link} />
              <Input
                type="url"
                placeholder="Paste Google Drive / Dropbox / etc. URL…"
                value={modelLinkInput}
                onChange={(e) => setModelLinkInput(e.target.value)}
                className="flex-1"
              />
              <Button
                variant="outline"
                disabled={pending}
                onClick={() =>
                  run(
                    () => setModelLink(order.id, modelLinkInput.trim() || null),
                    "Model link saved"
                  )
                }
              >
                Save
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Visible to everyone. Designer pastes their storage link here.
            </p>
          </div>

          {/* Admin quick fulfil */}
          {isAdmin && order.status !== "delivered" && (
            <Button
              variant="outline"
              className="w-full gap-2 border-success/30 text-success hover:bg-success/10"
              disabled={pending}
              onClick={() => run(() => markFulfilled(order.id), "Order fulfilled")}
            >
              <PackageCheck className="h-4 w-4" />
              Mark as Delivered / Fulfilled
            </Button>
          )}

        </CardContent>
      </Card>
    </div>
  );
}
