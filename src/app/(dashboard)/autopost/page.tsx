import { PageHeader } from "@/components/page-header";
import { AutoPostFB } from "@/components/autopost/auto-post-fb";

export const metadata = {
  title: "AutoPost Facebook",
};

export default function AutoPostPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <PageHeader namespace="autoPost" />
      <AutoPostFB />
    </div>
  );
}
