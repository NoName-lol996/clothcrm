"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Field from "@/components/ui/Field";
import { FOLLOW_UP_RESULTS } from "@/lib/constants";
import { useData } from "@/lib/store";
import { toDateKey, todayKey } from "@/lib/utils";

/** 从今天往后数 n 天的日期 */
function dateAfter(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

const QUICK_OPTIONS = [
  { label: "明天", days: 1 },
  { label: "3 天后", days: 3 },
  { label: "1 周后", days: 7 },
  { label: "2 周后", days: 14 },
  { label: "1 个月后", days: 30 },
];

interface Props {
  open: boolean;
  onClose: () => void;
  customerId: string;
  customerName: string;
}

export default function FollowUpFormDialog(props: Props) {
  if (!props.open) return null;
  return <FollowUpForm {...props} />;
}

function FollowUpForm({ onClose, customerId, customerName }: Props) {
  const { addFollowUp } = useData();

  const [followedAt, setFollowedAt] = useState(todayKey());
  const [content, setContent] = useState("");
  const [result, setResult] = useState("");
  const [nextFollowUpAt, setNextFollowUpAt] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!content.trim()) {
      setError("请填写这次跟进的内容");
      return;
    }
    if (!result) {
      setError("请选择跟进结果");
      return;
    }

    addFollowUp({
      customerId,
      followedAt,
      content: content.trim(),
      result,
      nextFollowUpAt: nextFollowUpAt || null,
    });
    onClose();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="记录一次跟进"
      description={"客户：" + customerName}
      onSubmit={handleSubmit}
      footer={
        <>
          <button type="button" className="gc-btn gc-btn-light" onClick={onClose}>
            取消
          </button>
          <button type="submit" className="gc-btn gc-btn-dark">
            保存这条记录
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="跟进时间" required>
            <input
              type="date"
              className="gc-input"
              value={followedAt}
              onChange={(event) => setFollowedAt(event.target.value)}
            />
          </Field>

          <Field label="跟进结果" required>
            <select
              className="gc-input gc-select"
              value={result}
              onChange={(event) => setResult(event.target.value)}
            >
              <option value="">请选择跟进结果</option>
              {FOLLOW_UP_RESULTS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="跟进内容" required hint="记清楚聊了什么，下次接手时不用重新回忆。">
          <textarea
            className="gc-input"
            rows={4}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="例如：微信发送了秋季新款的实拍图，客户说周末来看看"
          />
        </Field>

        <Field label="下次跟进时间" hint="留空表示暂时不用跟进。">
          <div className="flex flex-wrap gap-2 pb-1">
            {QUICK_OPTIONS.map((item) => (
              <button
                key={item.label}
                type="button"
                className="gc-tag"
                data-on={nextFollowUpAt === dateAfter(item.days)}
                onClick={() => setNextFollowUpAt(dateAfter(item.days))}
              >
                {item.label}
              </button>
            ))}
            <button
              type="button"
              className="gc-tag"
              data-on={nextFollowUpAt === ""}
              onClick={() => setNextFollowUpAt("")}
            >
              不安排
            </button>
          </div>
          <input
            type="date"
            className="gc-input"
            value={nextFollowUpAt}
            onChange={(event) => setNextFollowUpAt(event.target.value)}
          />
        </Field>

        {error ? (
          <p className="rounded-xl bg-[#fdeceb] px-4 py-3 text-[13px] text-[#c4300c]">{error}</p>
        ) : null}
      </div>
    </Modal>
  );
}