"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Minus, Trash2, Pencil, Check, X } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toaster";
import { stockHealth, STOCK_BADGE_VARIANT } from "@/lib/stock";
import {
  INVENTORY_ITEM_LABELS,
  FILAMENT_COLORS,
  FILAMENT_COLOR_LABELS,
  HEX_UNITS_PER_WRAP,
} from "@/lib/constants";
import type { InventoryItem, FilamentRoll, HexagonWrap } from "@/lib/types";
import {
  receiveStock,
  setItemQuantity,
  adjustFilament,
  addFilamentRoll,
  deleteFilamentRoll,
  adjustWraps,
} from "./actions";

type Res = { ok: boolean; error?: string };

function useAction() {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  function run(fn: () => Promise<Res>, msg: string) {
    start(async () => {
      const res = await fn();
      if (res.ok) {
        toast({ title: msg, variant: "success" });
        router.refresh();
      } else {
        toast({ title: "Failed", description: res.error, variant: "error" });
      }
    });
  }
  return { pending, run };
}

function HealthBadge({
  current,
  threshold,
}: {
  current: number;
  threshold: number;
}) {
  const health = stockHealth(current, threshold);
  const label =
    health === "low" ? "Low" : health === "warning" ? "Approaching" : "Healthy";
  return <Badge variant={STOCK_BADGE_VARIANT[health]}>{label}</Badge>;
}

/* ----------------------------- Auto-tracked ----------------------------- */
export function AutoStockSection({ items }: { items: InventoryItem[] }) {
  const { pending, run } = useAction();
  const [amounts, setAmounts] = React.useState<Record<string, string>>({});
  const [editing, setEditing] = React.useState<Record<string, string>>({});

  function startEdit(item: InventoryItem) {
    setEditing((p) => ({ ...p, [item.id]: String(item.quantity) }));
  }

  function cancelEdit(id: string) {
    setEditing((p) => {
      const next = { ...p };
      delete next[id];
      return next;
    });
  }

  function saveEdit(item: InventoryItem) {
    const n = Number(editing[item.id]);
    if (Number.isNaN(n) || n < 0) return;
    run(() => setItemQuantity(item.item_type, n), "Quantity updated");
    cancelEdit(item.id);
  }

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">Frames · Packaging · Flyers</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        {items.map((item) => (
          <Card key={item.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  {INVENTORY_ITEM_LABELS[item.item_type]}
                </CardTitle>
                <HealthBadge
                  current={item.quantity}
                  threshold={item.low_stock_threshold}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {editing[item.id] !== undefined ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    autoFocus
                    className="h-9 w-24 text-lg font-bold tabular-nums"
                    value={editing[item.id]}
                    onChange={(e) =>
                      setEditing((p) => ({ ...p, [item.id]: e.target.value }))
                    }
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-success"
                    disabled={pending}
                    onClick={() => saveEdit(item)}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground"
                    disabled={pending}
                    onClick={() => cancelEdit(item.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-3xl font-bold tabular-nums">
                    {item.quantity}
                  </p>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground"
                    title="Edit quantity"
                    onClick={() => startEdit(item)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Low-stock threshold: {item.low_stock_threshold}
              </p>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="1"
                  placeholder="Qty"
                  className="h-8"
                  value={amounts[item.id] ?? ""}
                  onChange={(e) =>
                    setAmounts((p) => ({ ...p, [item.id]: e.target.value }))
                  }
                />
                <Button
                  size="sm"
                  disabled={pending}
                  onClick={() => {
                    const n = Number(amounts[item.id]);
                    if (!n || n <= 0) return;
                    run(
                      () => receiveStock(item.item_type, n),
                      "Stock received"
                    );
                    setAmounts((p) => ({ ...p, [item.id]: "" }));
                  }}
                >
                  Receive
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------- Filament ------------------------------- */
export function FilamentSection({ rolls }: { rolls: FilamentRoll[] }) {
  const { pending, run } = useAction();
  const router = useRouter();
  const [color, setColor] = React.useState<string>(FILAMENT_COLORS[0]);
  const [adding, startAdd] = React.useTransition();

  function onAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.set("color", color);
    startAdd(async () => {
      const res = await addFilamentRoll(fd);
      if (res.ok) {
        toast({ title: "Roll added", variant: "success" });
        form.reset();
        router.refresh();
      } else {
        toast({ title: "Failed", description: res.error, variant: "error" });
      }
    });
  }

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">Filament rolls</h2>
      <Card>
        <CardContent className="pt-6">
          <form
            onSubmit={onAdd}
            className="mb-5 flex flex-wrap items-end gap-3 border-b border-border pb-5"
          >
            <div className="space-y-1">
              <Label htmlFor="roll_number">Roll #</Label>
              <Input
                id="roll_number"
                name="roll_number"
                className="h-8 w-28"
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Color</Label>
              <Select value={color} onValueChange={setColor}>
                <SelectTrigger className="h-8 w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FILAMENT_COLORS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {FILAMENT_COLOR_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="kg_remaining">Kg</Label>
              <Input
                id="kg_remaining"
                name="kg_remaining"
                type="number"
                step="0.05"
                min="0"
                defaultValue="1"
                className="h-8 w-24"
              />
            </div>
            <Button type="submit" size="sm" disabled={adding}>
              <Plus className="h-4 w-4" /> Add roll
            </Button>
          </form>

          {rolls.length === 0 ? (
            <p className="text-sm text-muted-foreground">No rolls yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {rolls.map((roll) => (
                <li
                  key={roll.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium">#{roll.roll_number}</span>
                    <span className="text-sm text-muted-foreground">
                      {FILAMENT_COLOR_LABELS[roll.color]}
                    </span>
                    <HealthBadge
                      current={roll.kg_remaining}
                      threshold={roll.low_stock_threshold}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      disabled={pending}
                      onClick={() =>
                        run(
                          () => adjustFilament(roll.id, -0.1),
                          "Filament updated"
                        )
                      }
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-20 text-center tabular-nums">
                      {roll.kg_remaining.toFixed(2)} kg
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      disabled={pending}
                      onClick={() =>
                        run(
                          () => adjustFilament(roll.id, 0.1),
                          "Filament updated"
                        )
                      }
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-danger"
                      disabled={pending}
                      onClick={() =>
                        run(
                          () => deleteFilamentRoll(roll.id),
                          "Roll removed"
                        )
                      }
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

/* ----------------------------- Hexagon wraps ---------------------------- */
export function HexagonSection({ wrap }: { wrap: HexagonWrap | null }) {
  const { pending, run } = useAction();
  if (!wrap) {
    return (
      <section>
        <h2 className="mb-3 text-lg font-semibold">Hexagon wraps</h2>
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            No wrap stock row found.
          </CardContent>
        </Card>
      </section>
    );
  }

  const fullWraps = wrap.units_remaining / HEX_UNITS_PER_WRAP;

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">Hexagon wraps</h2>
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-3xl font-bold tabular-nums">
                {fullWraps.toFixed(1)}{" "}
                <span className="text-base font-normal text-muted-foreground">
                  wraps
                </span>
              </p>
              <p className="text-sm text-muted-foreground">
                {wrap.units_remaining} units · 1 wrap = {HEX_UNITS_PER_WRAP}{" "}
                units
              </p>
            </div>
            <HealthBadge
              current={wrap.units_remaining}
              threshold={wrap.low_stock_threshold}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() =>
                run(() => adjustWraps(wrap.id, -1), "Wraps updated")
              }
            >
              <Minus className="h-3 w-3" /> 1 unit
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => run(() => adjustWraps(wrap.id, 1), "Wraps updated")}
            >
              <Plus className="h-3 w-3" /> 1 unit
            </Button>
            <Button
              size="sm"
              disabled={pending}
              onClick={() =>
                run(
                  () => adjustWraps(wrap.id, HEX_UNITS_PER_WRAP),
                  "Wrap added"
                )
              }
            >
              <Plus className="h-3 w-3" /> Full wrap
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
