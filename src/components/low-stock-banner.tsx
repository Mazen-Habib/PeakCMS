import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export function LowStockBanner({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <Link
      href="/inventory"
      className="mb-6 flex items-start gap-3 rounded-lg border border-danger/40 bg-danger/10 p-4 transition-colors hover:bg-danger/15"
    >
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
      <div className="text-sm">
        <p className="font-medium text-danger">Low stock</p>
        <p className="text-muted-foreground">{items.join(" · ")}</p>
      </div>
    </Link>
  );
}
