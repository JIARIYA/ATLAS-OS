import { Sparkles } from "lucide-react";
import { CaptureWorkbench } from "@/components/CaptureWorkbench";
import { PageHeader } from "@/components/ui";
import { getFormOptions } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function CapturePage() {
  const { domains } = await getFormOptions();
  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={Sparkles}
        title="Capture"
        subtitle="Dump anything in plain language. Atlas breaks it into tasks, schedules the dated ones, and files them by category."
      />
      <CaptureWorkbench domains={domains.map((d) => ({ key: d.key, name: d.name, color: d.color }))} />
    </div>
  );
}
