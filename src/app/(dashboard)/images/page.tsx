import { PageHeader } from "@/components/page-header";
import { ImageManager } from "@/components/images/image-manager";

export const metadata = {
  title: "Image Manager",
};

export default function ImagesPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <PageHeader namespace="imageManager" />
      <ImageManager />
    </div>
  );
}
