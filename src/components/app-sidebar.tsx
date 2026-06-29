"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Boxes,
  StickyNote,
  Bell,
  Users,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import type { UserRole } from "@/lib/constants";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
};

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, adminOnly: true },
  { href: "/orders", label: "Orders", icon: Package },
  { href: "/inventory", label: "Inventory", icon: Boxes, adminOnly: true },
  { href: "/notes", label: "Notes", icon: StickyNote, adminOnly: true },
  { href: "/reminders", label: "Reminders", icon: Bell, adminOnly: true },
  { href: "/team", label: "Team", icon: Users, adminOnly: true },
];

export function AppSidebar({
  role,
  name,
}: {
  role: UserRole;
  name: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  const items = NAV.filter((i) => !i.adminOnly || role === "admin");

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      {/* Mobile top bar */}
      <div className="flex items-center justify-between border-b border-border bg-card px-4 py-3 md:hidden">
        <span className="font-bold">
          PEAK <span className="text-primary">Ops</span>
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle navigation"
        >
          {open ? <X /> : <Menu />}
        </Button>
      </div>

      <aside
        className={cn(
          "z-40 w-60 shrink-0 flex-col border-r border-border bg-card md:flex",
          "fixed inset-y-0 left-0 md:static",
          open ? "flex" : "hidden"
        )}
      >
        <div className="hidden items-center gap-2 px-5 py-5 md:flex">
          <span className="text-lg font-bold">
            PEAK <span className="text-primary">Ops</span>
          </span>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-3">
          {items.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border p-3">
          <div className="mb-2 px-2 text-xs text-muted-foreground">
            <p className="truncate font-medium text-foreground">{name}</p>
            <p className="capitalize">{role}</p>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>
    </>
  );
}
