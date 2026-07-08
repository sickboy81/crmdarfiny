import { PageHeader } from "@/components/page-header";
import { EmailManager } from "@/components/email/email-manager";

export const metadata = {
  title: "Email Manager",
};

export default function EmailPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <PageHeader namespace="email" />
      <EmailManager />
    </div>
  );
}
