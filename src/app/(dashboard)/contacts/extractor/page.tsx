import { PageHeader } from "@/components/page-header";
import { ContactExtractor } from "@/components/contacts/contact-extractor";

export const metadata = {
  title: "Contact Extractor",
};

export default function ContactExtractorPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <PageHeader namespace="contactExtractor" />
      <ContactExtractor />
    </div>
  );
}
