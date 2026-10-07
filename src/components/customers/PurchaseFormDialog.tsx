"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import Field from "@/components/ui/Field";
import { useData } from "@/lib/store";
import { todayKey } from "@/lib/utils";

export default function PurchaseFormDialog({
  open,
  onClose,
  customerId,
  customerName,
}: {
  open: boolean;
  onClose: () => void;
  customerId: string;
  customerName: string;
}) {
  const { addPurchase } = useData();

  const [purchasedAt, setPurchasedAt] = useState(todayKey());
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setPurchasedAt(todayKey());
    setAmount("");
    setNote("");
    setError("");
  }, [open]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const value = Number(amount);
    if (!amount.trim() || Number.isNaN(value)) {
      setError("请填写消费金额");
      return;
    }
    if (value <= 0) {
      setError("消费金额要大于 0");
      return;
    }

    addPurchase({
      customerId,
      purchasedAt,
      amount: Math.round(value * 100) / 100,
      note: note.trim(),
    });
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="记一笔消费"
      description={"客户：" + customerName + "。保存后，累计消费和本月销售额会自动更新。"}
      width={480}
      onSubmit={handleSubmit}
      footer={
        <>
          <button type="button" className="gc-btn gc-btn-light" onClick={onClose}>
            取消
          </button>
          <button type="submit" className="gc-btn gc-btn-dark">
            保存这笔消费
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="消费日期" required>
            <input
              type="date"
              className="gc-input"
              value={purchasedAt}
              onChange={(event) => setPurchasedAt(event.target.value)}
            />
          </Field>

          <Field label="消费金额（元）" required>
            <input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              className="gc-input"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="例如 1280"
            />
          </Field>
        </div>

        <Field label="买了什么" hint="可以不填，填了以后回看记录更方便。">
          <input
            className="gc-input"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="例如：秋季风衣 + 打底衫"
          />
        </Field>

        {error ? (
          <p className="rounded-xl bg-[#fdeceb] px-4 py-3 text-[13px] text-[#c4300c]">{error}</p>
        ) : null}
      </div>
    </Modal>
  );
}