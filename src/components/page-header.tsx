"use client";

import { useTranslations } from "next-intl";

export function PageHeader({
  namespace,
  className = "",
}: {
  namespace: string;
  className?: string;
}) {
  const t = useTranslations(namespace);

  return (
    <div className={className}>
      <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
    </div>
  );
}
