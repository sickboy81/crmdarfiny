"use client";

import { NextIntlClientProvider } from "next-intl";

export function I18nProvider({
  children,
  messages,
  locale,
}: {
  children: React.ReactNode;
  messages: Record<string, unknown>;
  locale?: string;
}) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
