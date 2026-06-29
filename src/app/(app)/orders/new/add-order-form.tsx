"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toaster";
import { ORDER_SOURCES, ORDER_SOURCE_LABELS } from "@/lib/constants";
import { createOrder } from "../actions";

const UNASSIGNED = "__unassigned__";

export function AddOrderForm({
  designers,
}: {
  designers: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [source, setSource] = React.useState<string>("whatsapp");
  const [designer, setDesigner] = React.useState<string>(UNASSIGNED);
  const [pending, startTransition] = React.useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("source", source);
    formData.set(
      "assigned_designer_id",
      designer === UNASSIGNED ? "" : designer
    );

    startTransition(async () => {
      const res = await createOrder(formData);
      if (res.ok) {
        toast({ title: "Order created", variant: "success" });
        router.push("/orders");
        router.refresh();
      } else {
        toast({
          title: "Could not create order",
          description: res.error,
          variant: "error",
        });
      }
    });
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="customer_name">Customer name *</Label>
            <Input id="customer_name" name="customer_name" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="strava_link">Strava link</Label>
            <Input
              id="strava_link"
              name="strava_link"
              type="url"
              placeholder="https://www.strava.com/activities/…"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="customer_notes">Customer details</Label>
            <Textarea
              id="customer_notes"
              name="customer_notes"
              rows={6}
              placeholder={
                "Name / title, frame color, text color, terrain color, trail line color…"
              }
            />
            <p className="text-xs text-muted-foreground">
              Line breaks are preserved exactly as entered.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount_due">Amount due (EGP)</Label>
              <Input
                id="amount_due"
                name="amount_due"
                type="number"
                min="0"
                step="0.01"
                defaultValue="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount_paid">Amount paid (EGP)</Label>
              <Input
                id="amount_paid"
                name="amount_paid"
                type="number"
                min="0"
                step="0.01"
                defaultValue="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Source</Label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ORDER_SOURCES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {ORDER_SOURCE_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Assign designer</Label>
              <Select value={designer} onValueChange={setDesigner}>
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
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.back()}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Create order"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
