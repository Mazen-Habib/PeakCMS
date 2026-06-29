import { Badge } from "@/components/ui/badge";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/constants";
import { cn } from "@/lib/utils";

// Colour progression along the pipeline.
const STATUS_CLASS: Record<OrderStatus, string> = {
  pending:    "bg-muted text-muted-foreground",
  in_progress:"bg-primary/15 text-primary",
  model_made: "bg-primary/25 text-primary",
  revise:     "bg-warning/20 text-warning",
  printed:    "bg-sky-500/15 text-sky-400",
  shipped:    "bg-sky-500/25 text-sky-300",
  delivered:  "bg-success/20 text-success",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        STATUS_CLASS[status]
      )}
    >
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}

export { Badge };
