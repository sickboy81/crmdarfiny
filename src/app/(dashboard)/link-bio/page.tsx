import { PageHeader } from "@/components/page-header";
import { LinkBioEditor } from "@/components/link-bio/link-bio-editor";

export const metadata = {
  title: "Link Bio",
};

export default function LinkBioPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <PageHeader namespace="linkBio" />
      <LinkBioEditor />
    </div>
  );
}
