import { Skeleton } from "@/components/ui/skeleton";

export default function TeamLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-20 rounded-lg" />
      <Skeleton className="h-64 rounded-lg" />
    </div>
  );
}
