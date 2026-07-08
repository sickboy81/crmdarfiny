import { PageHeader } from "@/components/page-header";
import { BankExtractor } from "@/components/bank-extractor/bank-extractor";

export const metadata = {
  title: "Bank Extractor",
};

export default function BankExtractorPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <PageHeader namespace="bankExtractor" />
      <BankExtractor />
    </div>
  );
}
