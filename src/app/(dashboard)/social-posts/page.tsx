import { PageHeader } from "@/components/page-header";
import { SocialPost } from "@/components/social-posts/social-post";

export const metadata = {
  title: "Social Posts",
};

export default function SocialPostsPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <PageHeader namespace="socialPosts" />
      <SocialPost />
    </div>
  );
}
