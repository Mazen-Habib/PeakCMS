"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Trash2, Pencil, Check, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { USER_ROLES, type UserRole } from "@/lib/constants";
import type { TeamMember } from "./page";
import {
  inviteMember,
  removeMember,
  updateMemberName,
  updateMemberRole,
} from "./actions";

/** Inline editable name cell — click the pencil to edit, Enter/✓ to save, Esc/✗ to cancel. */
function EditableName({
  id,
  name,
  isYou,
  disabled,
}: {
  id: string;
  name: string;
  isYou: boolean;
  disabled: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = React.useState(false);
  const [value, setValue] = React.useState(name);
  const [saving, startSave] = React.useTransition();
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function save() {
    if (value.trim() === name) { setEditing(false); return; }
    startSave(async () => {
      const res = await updateMemberName(id, value.trim());
      if (res.ok) {
        toast({ title: "Name updated", variant: "success" });
        router.refresh();
      } else {
        toast({ title: "Failed", description: res.error, variant: "error" });
      }
      setEditing(false);
    });
  }

  function cancel() {
    setValue(name);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-7 w-36 text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") cancel();
          }}
          disabled={saving}
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-success"
          onClick={save}
          disabled={saving}
        >
          <Check className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground"
          onClick={cancel}
          disabled={saving}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="group flex items-center gap-2">
      <span className="font-medium">{name || <span className="text-muted-foreground">—</span>}</span>
      {isYou && (
        <span className="text-xs text-muted-foreground">(you)</span>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
        onClick={() => setEditing(true)}
        disabled={disabled}
        title="Edit name"
      >
        <Pencil className="h-3 w-3" />
      </Button>
    </div>
  );
}

export function TeamClient({
  members,
  currentUserId,
}: {
  members: TeamMember[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [role, setRole] = React.useState<string>("designer");
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

  function onInvite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.set("role", role);
    start(async () => {
      const res = await inviteMember(fd);
      if (res.ok) {
        toast({ title: "Invite sent", variant: "success" });
        form.reset();
        setRole("designer");
        router.refresh();
      } else {
        toast({ title: "Failed", description: res.error, variant: "error" });
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={onInvite} className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" className="w-40" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                className="w-56"
              />
            </div>
            <div className="space-y-1">
              <Label>Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {USER_ROLES.map((r) => (
                    <SelectItem key={r} value={r} className="capitalize">
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={pending}>
              <UserPlus className="h-4 w-4" /> Invite
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((m) => (
              <TableRow key={m.id}>
                <TableCell>
                  <EditableName
                    id={m.id}
                    name={m.name}
                    isYou={m.id === currentUserId}
                    disabled={pending}
                  />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {m.email}
                </TableCell>
                <TableCell>
                  <Select
                    value={m.role}
                    onValueChange={(v) =>
                      run(
                        () => updateMemberRole(m.id, v as UserRole),
                        "Role updated"
                      )
                    }
                  >
                    <SelectTrigger className="h-8 w-32 capitalize">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {USER_ROLES.map((r) => (
                        <SelectItem key={r} value={r} className="capitalize">
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  {m.pending ? (
                    <Badge variant="warning">Invited</Badge>
                  ) : (
                    <Badge variant="success">Active</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {m.id !== currentUserId && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-danger"
                      disabled={pending}
                      onClick={() =>
                        run(() => removeMember(m.id), "Member removed")
                      }
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
