import { PageHeader } from "@/components/page-header";
import { PropertyCatalog } from "@/components/properties/property-catalog";

export const metadata = {
  title: "Property Catalog",
};

export default function PropertiesPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <PageHeader namespace="properties" />
      <PropertyCatalog />
    </div>
  );
}
