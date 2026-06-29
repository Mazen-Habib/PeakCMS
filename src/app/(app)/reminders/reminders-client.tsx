"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { format, isPast, isToday, differenceInCalendarDays } from "date-fns";
import { Trash2, Check, Bell } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import type { Reminder } from "@/lib/types";
import {
  createReminder,
  deleteReminder,
  setReminderCompleted,
} from "./actions";

function dueLabel(due: Date, completed: boolean) {
  if (completed) return { text: "Done", variant: "muted" as const };
  if (isPast(due) && !isToday(due))
    return { text: "Overdue", variant: "danger" as const };
  if (isToday(due)) return { text: "Today", variant: "warning" as const };
  const days = differenceInCalendarDays(due, new Date());
  if (days <= 3) return { text: `In ${days}d`, variant: "warning" as const };
  return { text: `In ${days}d`, variant: "secondary" as const };
}

export function RemindersClient({ reminders }: { reminders: Reminder[] }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, msg: string) {
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

  function onAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    start(async () => {
      const res = await createReminder(fd);
      if (res.ok) {
        toast({ title: "Reminder added", variant: "success" });
        form.reset();
        router.refresh();
      } else {
        toast({ title: "Failed", description: res.error, variant: "error" });
      }
    });
  }

  const active = reminders.filter((r) => !r.completed);
  const done = reminders.filter((r) => r.completed);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
      <Card className="h-fit">
        <CardContent className="pt-6">
          <form onSubmit={onAdd} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="due_date">Due</Label>
              <Input
                id="due_date"
                name="due_date"
                type="datetime-local"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea id="notes" name="notes" rows={3} />
            </div>
            <Button type="submit" disabled={pending} className="w-full">
              Add reminder
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {active.length === 0 && done.length === 0 && (
          <p className="text-sm text-muted-foreground">No reminders yet.</p>
        )}

        {active.map((r) => {
          const due = new Date(r.due_date);
          const label = dueLabel(due, false);
          return (
            <Card
              key={r.id}
              className={cn(
                label.variant === "danger" && "border-danger/40",
                label.variant === "warning" && "border-warning/40"
              )}
            >
              <CardContent className="flex items-start justify-between gap-3 pt-6">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-muted-foreground" />
                    <p className="font-medium">{r.title}</p>
                    <Badge variant={label.variant}>{label.text}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {format(due, "EEE d MMM yyyy, HH:mm")}
                  </p>
                  {r.notes && (
                    <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                      {r.notes}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    disabled={pending}
                    title="Mark complete"
                    onClick={() =>
                      run(
                        () => setReminderCompleted(r.id, true),
                        "Marked complete"
                      )
                    }
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-danger"
                    disabled={pending}
                    onClick={() =>
                      run(() => deleteReminder(r.id), "Reminder deleted")
                    }
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {done.length > 0 && (
          <p className="pt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Completed
          </p>
        )}
        {done.map((r) => (
          <Card key={r.id} className="opacity-60">
            <CardContent className="flex items-center justify-between gap-3 pt-6">
              <div>
                <p className="font-medium line-through">{r.title}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(r.due_date), "d MMM yyyy")}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    run(
                      () => setReminderCompleted(r.id, false),
                      "Reopened"
                    )
                  }
                >
                  Reopen
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-danger"
                  disabled={pending}
                  onClick={() =>
                    run(() => deleteReminder(r.id), "Reminder deleted")
                  }
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
