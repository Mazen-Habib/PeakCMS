import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  await requireUser();

  return (
    <div>
      <PageHeader title="Settings" description="Manage your account." />
      <SettingsClient />
    </div>
  );
}
