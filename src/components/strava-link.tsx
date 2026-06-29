import { Activity } from "lucide-react";

/**
 * Renders a Strava link as a distinct clickable button (never plain text),
 * opening in a new tab. Returns a muted dash when no link is set.
 */
export function StravaLink({ href }: { href: string | null | undefined }) {
  if (!href) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="inline-flex items-center gap-1.5 rounded-md bg-[#FC4C02]/15 px-2.5 py-1 text-xs font-medium text-[#FC4C02] transition-colors hover:bg-[#FC4C02]/25"
      title="Open Strava activity"
    >
      <Activity className="h-3.5 w-3.5" />
      Strava
    </a>
  );
}
