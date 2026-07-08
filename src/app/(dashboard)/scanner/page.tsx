import { DocumentScanner } from '@/components/scanner/document-scanner';
import { PageHeader } from '@/components/page-header';

export default function ScannerPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <PageHeader namespace="scanner" />
      <DocumentScanner />
    </div>
  );
}
