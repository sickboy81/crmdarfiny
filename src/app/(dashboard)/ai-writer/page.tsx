import { PageHeader } from "@/components/page-header";
import { AiWriter } from "@/components/ai-writer/ai-writer";

export const metadata = {
  title: "AI Writer",
};

export default function AiWriterPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <PageHeader namespace="aiWriter" />
      <AiWriter />
    </div>
  );
}
