import { ControlPanel } from "@/components/demo-controls/ControlPanel";
import { isPinConfigured } from "@/lib/flags/pin";

// Read per request so the "PIN not configured" state reflects the running environment.
export const dynamic = "force-dynamic";

export default function DemoControlsPage() {
  return <ControlPanel pinConfigured={isPinConfigured()} />;
}
