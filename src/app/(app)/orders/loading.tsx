import { Skeleton } from "@/components/ui/skeleton";

export default function OrdersLoading() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-9 w-28" />
      </div>
      <div className="mb-4 flex gap-3">
        <Skeleton className="h-9 w-44" />
        <Skeleton className="h-9 w-40" />
      </div>
      <Skeleton className="h-96 rounded-lg" />
    </div>
  );
}
