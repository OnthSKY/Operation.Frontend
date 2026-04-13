"use client";

import { useI18n } from "@/i18n/context";
import {
  PageWhenToUseGuideContent,
  type PageWhenToUseGuideContentProps,
} from "@/shared/components/PageWhenToUseGuide";
import { Modal } from "@/shared/ui/Modal";
import { useId } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
} & Omit<PageWhenToUseGuideContentProps, "showTitle" | "title">;

export function PageHelpModal({ open, onClose, ...content }: Props) {
  const { t } = useI18n();
  const titleId = useId();

  return (
    <Modal
      open={open}
      onClose={onClose}
      titleId={titleId}
      title={t("common.pageWhenToUseTitle")}
      closeButtonLabel={t("common.close")}
      className="max-w-[min(100vw-1rem,26rem)] sm:max-w-md"
    >
      <div className="max-h-[min(70dvh,30rem)] overflow-y-auto overscroll-y-contain border-t border-zinc-100 px-4 py-4 sm:px-6 sm:py-5">
        <PageWhenToUseGuideContent {...content} showTitle={false} />
      </div>
    </Modal>
  );
}
