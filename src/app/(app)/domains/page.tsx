import { Scale } from "lucide-react";
import { DomainsWorkspace } from "@/components/DomainsWorkspace";
import { PageHeader } from "@/components/ui";
import { getDomainsBoard, getFormOptions } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function DomainsPage() {
  const [domains, options] = await Promise.all([getDomainsBoard(), getFormOptions()]);
  return (
    <div>
      <PageHeader icon={Scale} title="Life Balance" subtitle="Add or remove aspects of your life, and manage what you're doing for each." />
      <DomainsWorkspace domains={domains} options={{ members: options.members, projects: options.projects }} />
    </div>
  );
}
