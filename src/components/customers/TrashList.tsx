"use client";

import { useState } from "react";
import { RotateCcw, Trash2 } from "lucide-react";
import { useData, type TrashedCustomer } from "@/lib/store";
import { formatDateTime } from "@/lib/utils";
import Avatar from "@/components/ui/Avatar";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

export default function TrashList() {
  const { trashedCustomers, restoreCustomer, destroyCustomer, emptyTrash } = useData();

  const [pendingDestroy, setPendingDestroy] = useState<TrashedCustomer | null>(null);
  const [emptyOpen, setEmptyOpen] = useState(false);

  if (trashedCustomers.length === 0) {
    return (
      <div className="gc-card px-6 py-20 text-center">
        <p className="text-[15px] font-medium">回收站是空的</p>
        <p className="mt-2 text-[13px] text-ink-3">
          删除客户时会先放到这里，随时可以恢复。
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-ink-3">
          共 {trashedCustomers.length} 位客户。这里的客户不会出现在列表和统计里。
        </p>
        <button
          type="button"
          className="gc-danger"
          onClick={() => setEmptyOpen(true)}
        >
          <Trash2 size={15} />
          清空回收站
        </button>
      </div>

      <div className="gc-card overflow-hidden">
        <ul className="px-3 py-3">
          {trashedCustomers.map((customer) => (
            <li
              key={customer.id}
              className="flex flex-wrap items-center gap-4 rounded-2xl px-3 py-3.5 transition hover:bg-canvas-2 sm:flex-nowrap"
            >
              <Avatar name={customer.name} />

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[15px] font-medium">{customer.name}</span>
                  <span className="shrink-0 text-xs text-ink-3">{customer.phone}</span>
                </div>
                <p className="mt-0.5 text-xs text-ink-3">
                  {customer.deletedAt ? formatDateTime(customer.deletedAt) + " 删除" : "已删除"}
                  <span className="mx-1.5 text-hairline">|</span>
                  名下 {customer.followUpCount} 条跟进、{customer.purchaseCount} 笔消费
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  className="gc-btn gc-btn-sm gc-btn-light"
                  onClick={() => restoreCustomer(customer.id)}
                >
                  <RotateCcw size={14} />
                  恢复
                </button>
                <button
                  type="button"
                  className="gc-btn gc-btn-sm gc-btn-light text-[#c4300c]"
                  onClick={() => setPendingDestroy(customer)}
                >
                  彻底删除
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <ConfirmDialog
        open={pendingDestroy !== null}
        onClose={() => setPendingDestroy(null)}
        onConfirm={() => {
          if (pendingDestroy) destroyCustomer(pendingDestroy.id);
          setPendingDestroy(null);
        }}
        title="彻底删除这位客户？"
        description="删除后无法恢复。"
        confirmLabel="彻底删除"
        tone="danger"
      >
        <p className="text-[14px] leading-relaxed text-ink-2">
          {pendingDestroy?.name} 的资料，以及名下
          <span className="font-medium text-ink">
            {" "}
            {pendingDestroy?.followUpCount ?? 0} 条跟进记录和 {pendingDestroy?.purchaseCount ?? 0}{" "}
            笔消费记录
          </span>
          都会被永久删除。
        </p>
      </ConfirmDialog>

      <ConfirmDialog
        open={emptyOpen}
        onClose={() => setEmptyOpen(false)}
        onConfirm={() => {
          emptyTrash();
          setEmptyOpen(false);
        }}
        title="清空整个回收站？"
        description="回收站里的客户会被永久删除，无法恢复。"
        confirmLabel="清空回收站"
        tone="danger"
      >
        <p className="text-[14px] leading-relaxed text-ink-2">
          将会永久删除 {trashedCustomers.length} 位客户，以及他们名下的所有跟进和消费记录。
        </p>
      </ConfirmDialog>
    </div>
  );
}