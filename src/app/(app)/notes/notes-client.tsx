"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Trash2, Link2 } from "lucide-react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toaster";
import type { NoteWithOrder } from "@/lib/types";
import { createNote, deleteNote } from "./actions";

const NONE = "__none__";

export function NotesClient({
  notes,
  orders,
}: {
  notes: NoteWithOrder[];
  orders: { id: string; customer_name: string }[];
}) {
  const router = useRouter();
  const [linked, setLinked] = React.useState<string>(NONE);
  const [pending, start] = React.useTransition();

  function onAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.set("linked_order_id", linked === NONE ? "" : linked);
    start(async () => {
      const res = await createNote(fd);
      if (res.ok) {
        toast({ title: "Note added", variant: "success" });
        form.reset();
        setLinked(NONE);
        router.refresh();
      } else {
        toast({ title: "Failed", description: res.error, variant: "error" });
      }
    });
  }

  function onDelete(id: string) {
    start(async () => {
      const res = await deleteNote(id);
      if (res.ok) {
        toast({ title: "Note deleted", variant: "success" });
        router.refresh();
      } else {
        toast({ title: "Failed", description: res.error, variant: "error" });
      }
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
      <Card className="h-fit">
        <CardContent className="pt-6">
          <form onSubmit={onAdd} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="content">New note</Label>
              <Textarea id="content" name="content" rows={4} required />
            </div>
            <div className="space-y-2">
              <Label>Link to order (optional)</Label>
              <Select value={linked} onValueChange={setLinked}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>No link</SelectItem>
                  {orders.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.customer_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={pending} className="w-full">
              Add note
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {notes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No notes yet.</p>
        ) : (
          notes.map((note) => (
            <Card key={note.id}>
              <CardContent className="flex items-start justify-between gap-3 pt-6">
                <div className="min-w-0 flex-1">
                  <p className="whitespace-pre-wrap text-sm">{note.content}</p>
                  <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                    <span>
                      {format(new Date(note.created_at), "d MMM yyyy, HH:mm")}
                    </span>
                    {note.linked_order_id && note.linked_order_name && (
                      <Link
                        href={`/orders/${note.linked_order_id}`}
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        <Link2 className="h-3 w-3" />
                        {note.linked_order_name}
                      </Link>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-danger"
                  disabled={pending}
                  onClick={() => onDelete(note.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
