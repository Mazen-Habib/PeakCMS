import { Box } from "lucide-react";

/**
 * Renders a model-file link as a distinct clickable button (same pattern as StravaLink).
 * Visible to everyone; set by designer or admin.
 */
export function ModelLink({ href }: { href: string | null | undefined }) {
  if (!href) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="inline-flex items-center gap-1.5 rounded-md bg-primary/15 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/25"
      title="Open 3D model file"
    >
      <Box className="h-3.5 w-3.5" />
      Model
    </a>
  );
}
