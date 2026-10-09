"use client";

import Modal from "@/components/ui/Modal";

/** 通用确认弹窗：问一句"确定吗" */
export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "确定",
  cancelLabel = "取消",
  tone = "default",
  children,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
  children?: React.ReactNode;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      width={470}
      footer={
        <>
          <button type="button" className="gc-btn gc-btn-light" onClick={onClose}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={tone === "danger" ? "gc-btn" : "gc-btn gc-btn-dark"}
            style={tone === "danger" ? { backgroundColor: "#c4300c", color: "#fff" } : undefined}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      {children}
    </Modal>
  );
}