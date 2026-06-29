"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type ToastVariant = "default" | "success" | "error";

type Toast = {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
};

type ToastInput = {
  title: string;
  description?: string;
  variant?: ToastVariant;
};

// Simple module-level pub/sub so any client component can fire a toast
// without threading a provider through every page.
let listeners: ((t: Toast) => void)[] = [];
let counter = 0;

export function toast(input: ToastInput) {
  const t: Toast = {
    id: ++counter,
    title: input.title,
    description: input.description,
    variant: input.variant ?? "default",
  };
  listeners.forEach((l) => l(t));
}

export function Toaster() {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  React.useEffect(() => {
    const listener = (t: Toast) => {
      setToasts((prev) => [...prev, t]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== t.id));
      }, 4000);
    };
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={cn(
            "rounded-md border border-border bg-popover p-4 shadow-lg",
            t.variant === "success" && "border-success/40",
            t.variant === "error" && "border-danger/40"
          )}
        >
          <p
            className={cn(
              "text-sm font-medium",
              t.variant === "success" && "text-success",
              t.variant === "error" && "text-danger"
            )}
          >
            {t.title}
          </p>
          {t.description && (
            <p className="mt-1 text-xs text-muted-foreground">
              {t.description}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
