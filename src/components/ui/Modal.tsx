"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

/**
 * 通用弹窗。所有"新增/编辑"这类操作都用它，风格保持一致。
 */
export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  onSubmit,
  width = 560,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onSubmit?: (event: React.FormEvent<HTMLFormElement>) => void;
  width?: number;
}) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    if (onSubmit) {
      onSubmit(event);
    } else {
      event.preventDefault();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 py-8 sm:py-14">
      <div className="gc-overlay fixed inset-0 bg-black/25 backdrop-blur-[2px]" onClick={onClose} />

      <form
        onSubmit={handleSubmit}
        className="gc-panel relative z-10 flex max-h-full w-full flex-col overflow-hidden rounded-[22px] bg-white shadow-[0_28px_70px_-24px_rgba(0,0,0,0.4)]"
        style={{ maxWidth: width }}
      >
        <header className="flex items-start justify-between gap-6 px-7 pb-1 pt-7">
          <div>
            <h2 className="gc-title-md">{title}</h2>
            {description ? (
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink-3">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            className="-mr-1 -mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-3 transition hover:bg-canvas-2 hover:text-ink"
          >
            <X size={18} />
          </button>
        </header>

        <div className="overflow-y-auto px-7 py-6">{children}</div>

        {footer ? (
          <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-black/[0.06] bg-[#fafafa] px-7 py-4">
            {footer}
          </footer>
        ) : null}
      </form>
    </div>
  );
}