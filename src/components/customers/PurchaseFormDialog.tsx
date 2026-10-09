"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { useData } from "@/lib/store";
import { formatMoney, todayKey } from "@/lib/utils";

interface Row {
  key: string;
  purchasedAt: string;
  amount: string;
  note: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  customerId: string;
  customerName: string;
}

function makeRow(date: string): Row {
  return {
    key: Math.random().toString(36).slice(2),
    purchasedAt: date,
    amount: "",
    note: "",
  };
}

/**
 * 外面这一层只负责"关着的时候不渲染"。
 * 这样每次打开都是一份全新的表单，不会带上一次的内容。
 */
export default function PurchaseFormDialog(props: Props) {
  if (!props.open) return null;
  return <PurchaseForm {...props} />;
}

function PurchaseForm({ onClose, customerId, customerName }: Props) {
  const { addPurchases } = useData();

  const [rows, setRows] = useState<Row[]>(() => [makeRow(todayKey())]);
  const [error, setError] = useState("");

  function updateRow(key: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function addRow() {
    setRows((prev) => {
      const lastDate = prev[prev.length - 1]?.purchasedAt || todayKey();
      return [...prev, makeRow(lastDate)];
    });
  }

  function removeRow(key: string) {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((row) => row.key !== key)));
  }

  const filledRows = rows.filter((row) => row.amount.trim() !== "" || row.note.trim() !== "");

  const total = filledRows.reduce((sum, row) => {
    const value = Number(row.amount);
    return Number.isFinite(value) && value > 0 ? sum + value : sum;
  }, 0);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (filledRows.length === 0) {
      setError("请至少填写一笔消费金额");
      return;
    }

    for (const row of filledRows) {
      const value = Number(row.amount);
      if (!row.amount.trim() || Number.isNaN(value) || value <= 0) {
        setError("每一笔都要填写大于 0 的消费金额");
        return;
      }
      if (!row.purchasedAt) {
        setError("每一笔都要有消费日期");
        return;
      }
    }

    addPurchases(
      filledRows.map((row) => ({
        customerId,
        purchasedAt: row.purchasedAt,
        amount: Math.round(Number(row.amount) * 100) / 100,
        note: row.note.trim(),
      }))
    );

    onClose();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="记消费"
      description={
        "客户：" + customerName + "。一次买了多件可以分开记，每行一笔，保存后会一起算进累计消费。"
      }
      width={720}
      onSubmit={handleSubmit}
      footer={
        <>
          {total > 0 ? (
            <span className="mr-auto text-[13px] text-ink-2">
              合计 <span className="text-[15px] font-semibold text-ink">{formatMoney(total)}</span>
            </span>
          ) : null}
          <button type="button" className="gc-btn gc-btn-light" onClick={onClose}>
            取消
          </button>
          <button type="submit" className="gc-btn gc-btn-dark">
            保存 {filledRows.length || 1} 笔消费
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="hidden gap-2 px-1 text-[12px] text-ink-3 sm:flex">
          <span className="w-[152px] shrink-0">消费日期</span>
          <span className="w-[116px] shrink-0">金额（元）</span>
          <span className="flex-1">买了什么</span>
          <span className="w-9" />
        </div>

        {rows.map((row) => (
          <div key={row.key} className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              className="gc-input w-[152px] shrink-0"
              value={row.purchasedAt}
              onChange={(event) => updateRow(row.key, { purchasedAt: event.target.value })}
            />
            <input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              className="gc-input w-[116px] shrink-0"
              placeholder="金额"
              value={row.amount}
              onChange={(event) => updateRow(row.key, { amount: event.target.value })}
            />
            <input
              className="gc-input w-full min-w-[140px] flex-1"
              placeholder="例如：秋季风衣（可不填）"
              value={row.note}
              onChange={(event) => updateRow(row.key, { note: event.target.value })}
            />
            <button
              type="button"
              aria-label="删除这一笔"
              disabled={rows.length <= 1}
              onClick={() => removeRow(row.key)}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-3 transition hover:bg-[#fdeceb] hover:text-[#c4300c] disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-ink-3"
            >
              <X size={16} />
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={addRow}
          className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-[14px] border border-dashed border-hairline py-3 text-[13px] font-medium text-ink-2 transition hover:border-ink-3 hover:text-ink"
        >
          <Plus size={15} />
          再添加一笔
        </button>

        {error ? (
          <p className="rounded-xl bg-[#fdeceb] px-4 py-3 text-[13px] text-[#c4300c]">{error}</p>
        ) : null}
      </div>
    </Modal>
  );
}