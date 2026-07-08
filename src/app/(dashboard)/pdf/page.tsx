import { PageHeader } from "@/components/page-header";
import { UniPDF } from "@/components/unipdf/uni-pdf";

export const metadata = {
  title: "UniPDF",
};

export default function PdfPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <PageHeader namespace="pdf" />
      <UniPDF />
    </div>
  );
}
