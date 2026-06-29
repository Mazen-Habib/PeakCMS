"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { PackageCheck } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { StravaLink } from "@/components/strava-link";
import { ModelLink } from "@/components/model-link";
import { toast } from "@/components/ui/toaster";
import { formatCurrency } from "@/lib/utils";
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  ORDER_SOURCES,
  ORDER_SOURCE_LABELS,
  DESIGNER_ALLOWED_STATUSES,
  type OrderStatus,
} from "@/lib/constants";
import type { OrderWithDesigner } from "@/lib/types";
import { updateOrderStatus, markFulfilled } from "./actions";

export function OrdersTable({
  orders,
  isAdmin,
}: {
  orders: OrderWithDesigner[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [sourceFilter, setSourceFilter] = React.useState<string>("all");
  const [pending, startTransition] = React.useTransition();

  const filtered = orders.filter((o) => {
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    if (sourceFilter !== "all" && o.source !== sourceFilter) return false;
    return true;
  });

  function handleStatusChange(id: string, status: OrderStatus) {
    startTransition(async () => {
      const res = await updateOrderStatus(id, status);
      if (res.ok) {
        toast({ title: "Status updated", variant: "success" });
        router.refresh();
      } else {
        toast({ title: "Failed", description: res.error, variant: "error" });
      }
    });
  }

  function handleFulfilled(id: string) {
    startTransition(async () => {
      const res = await markFulfilled(id);
      if (res.ok) {
        toast({ title: "Order marked as delivered", variant: "success" });
        router.refresh();
      } else {
        toast({ title: "Failed", description: res.error, variant: "error" });
      }
    });
  }

  // Which statuses show in the dropdown depends on role.
  const availableStatuses = isAdmin
    ? ORDER_STATUSES
    : DESIGNER_ALLOWED_STATUSES;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="w-44">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {ORDER_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {ORDER_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {isAdmin && (
          <div className="w-40">
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sources</SelectItem>
                {ORDER_SOURCES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {ORDER_SOURCE_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Strava</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Status</TableHead>
              {isAdmin && <TableHead className="text-right">Due</TableHead>}
              {isAdmin && <TableHead className="text-right">Paid</TableHead>}
              {isAdmin && <TableHead className="text-right">Balance</TableHead>}
              {isAdmin && <TableHead>Designer</TableHead>}
              {isAdmin && <TableHead></TableHead>}
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={isAdmin ? 10 : 5}
                  className="py-10 text-center text-muted-foreground"
                >
                  No orders match these filters.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((o) => (
                <TableRow
                  key={o.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/orders/${o.id}`)}
                >
                  <TableCell className="font-medium">
                    {o.customer_name}
                  </TableCell>

                  <TableCell>
                    <StravaLink href={o.strava_link} />
                  </TableCell>

                  {/* Model link — visible to all */}
                  <TableCell>
                    <ModelLink href={o.model_link} />
                  </TableCell>

                  {/* Status — inline editable dropdown */}
                  <TableCell>
                    <Select
                      value={o.status}
                      onValueChange={(v) =>
                        handleStatusChange(o.id, v as OrderStatus)
                      }
                      disabled={pending}
                    >
                      <SelectTrigger
                        className="h-7 w-36 border-0 bg-transparent p-0 text-xs focus:ring-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <SelectValue>
                          <StatusBadge status={o.status} />
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent onClick={(e) => e.stopPropagation()}>
                        {availableStatuses.map((s) => (
                          <SelectItem key={s} value={s}>
                            {ORDER_STATUS_LABELS[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>

                  {isAdmin && (
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(o.amount_due)}
                    </TableCell>
                  )}
                  {isAdmin && (
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(o.amount_paid)}
                    </TableCell>
                  )}
                  {isAdmin && (
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(o.balance)}
                    </TableCell>
                  )}

                  {isAdmin && (
                    <TableCell className="text-muted-foreground">
                      {o.assigned_designer_name ?? "—"}
                    </TableCell>
                  )}

                  {/* Quick "Mark Fulfilled" for admin — only shows when not yet delivered */}
                  {isAdmin && (
                    <TableCell>
                      {o.status !== "delivered" ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-success"
                          disabled={pending}
                          title="Mark as delivered"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFulfilled(o.id);
                          }}
                        >
                          <PackageCheck className="h-3.5 w-3.5" />
                          Fulfill
                        </Button>
                      ) : (
                        <span className="text-xs text-success">✓ Fulfilled</span>
                      )}
                    </TableCell>
                  )}

                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {format(new Date(o.created_at), "d MMM yyyy")}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
