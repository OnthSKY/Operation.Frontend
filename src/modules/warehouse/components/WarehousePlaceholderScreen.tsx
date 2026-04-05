"use client";

import { useI18n } from "@/i18n/context";
import { Card } from "@/shared/components/Card";

export function WarehousePlaceholderScreen() {
  const { t } = useI18n();

  return (
    <div className="mx-auto w-full max-w-4xl p-4 lg:max-w-6xl 2xl:max-w-7xl">
      <h1 className="text-xl font-semibold text-zinc-900">
        {t("warehouse.title")}
      </h1>
      <p className="text-sm text-zinc-500">{t("warehouse.subtitle")}</p>
      <Card className="mt-4" title={t("warehouse.placeholder")}>
        <p className="text-sm text-zinc-600">
          {t("warehouse.bodyPrefix")}{" "}
          <code className="rounded bg-zinc-100 px-1">/warehouse</code>.
        </p>
      </Card>
    </div>
  );
}
