"use client";

import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Field from "@/components/ui/Field";
import { CUSTOMER_SOURCES, CUSTOMER_STATUSES, GENDERS, PRESET_TAGS } from "@/lib/constants";
import { useData } from "@/lib/store";
import type { Customer, CustomerStatus, Gender } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  customer?: Customer | null;
  onSaved?: (id: string) => void;
  onDeleted?: () => void;
}

/** 外面这一层只负责"关着的时候不渲染"，保证每次打开都是干净的表单 */
export default function CustomerFormDialog(props: Props) {
  if (!props.open) return null;
  return <CustomerForm {...props} />;
}

function CustomerForm({ onClose, customer, onSaved, onDeleted }: Props) {
  const { addCustomer, updateCustomer, trashCustomer, followUps, purchases } = useData();

  const isEdit = Boolean(customer);

  const [name, setName] = useState(customer?.name ?? "");
  const [phone, setPhone] = useState(customer?.phone ?? "");
  const [gender, setGender] = useState<Gender>(customer?.gender ?? "女");
  const [source, setSource] = useState<string>(customer?.source ?? CUSTOMER_SOURCES[0]);
  const [tags, setTags] = useState<string[]>(customer ? [...customer.tags] : []);
  const [status, setStatus] = useState<CustomerStatus>(customer?.status ?? "新客户");
  const [nextFollowUpAt, setNextFollowUpAt] = useState(customer?.nextFollowUpAt ?? "");
  const [note, setNote] = useState(customer?.note ?? "");
  const [customTag, setCustomTag] = useState("");
  const [error, setError] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const tagOptions = useMemo(() => {
    const all = [...PRESET_TAGS, ...tags];
    return Array.from(new Set(all));
  }, [tags]);

  const relatedFollowUps = customer
    ? followUps.filter((item) => item.customerId === customer.id).length
    : 0;
  const relatedPurchases = customer
    ? purchases.filter((item) => item.customerId === customer.id).length
    : 0;

  function toggleTag(tag: string) {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  function addCustomTag() {
    const value = customTag.trim();
    if (!value) return;
    if (!tags.includes(value)) setTags((prev) => [...prev, value]);
    setCustomTag("");
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const finalName = name.trim();
    const finalPhone = phone.trim();

    if (!finalName) {
      setError("请填写客户姓名");
      return;
    }
    if (!finalPhone) {
      setError("请填写手机号");
      return;
    }
    const digits = finalPhone.replace(/[^0-9]/g, "");
    if (digits.length < 6 || digits.length > 15) {
      setError("手机号看起来不太对，请检查一下");
      return;
    }

    const payload = {
      name: finalName,
      phone: finalPhone,
      gender,
      source,
      tags,
      status,
      nextFollowUpAt: nextFollowUpAt || null,
      note: note.trim(),
    };

    if (customer) {
      updateCustomer(customer.id, payload);
      onSaved?.(customer.id);
    } else {
      const created = addCustomer(payload);
      onSaved?.(created.id);
    }
    onClose();
  }

  return (
    <>
      <Modal
        open
        onClose={onClose}
        title={isEdit ? "编辑客户资料" : "新增客户"}
        description={isEdit ? undefined : "只填姓名和手机号也能先建档，其他信息以后再补。"}
        onSubmit={handleSubmit}
        footer={
          <>
            {isEdit ? (
              <button
                type="button"
                className="gc-danger mr-auto"
                onClick={() => setConfirmingDelete(true)}
              >
                <Trash2 size={15} />
                删除这位客户
              </button>
            ) : null}
            <button type="button" className="gc-btn gc-btn-light" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="gc-btn gc-btn-dark">
              {isEdit ? "保存修改" : "创建客户"}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="姓名" required>
              <input
                className="gc-input"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="例如 林小雅"
              />
            </Field>

            <Field label="手机号" required>
              <input
                className="gc-input"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="11 位手机号"
                inputMode="tel"
              />
            </Field>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="性别">
              <select
                className="gc-input gc-select"
                value={gender}
                onChange={(event) => setGender(event.target.value as Gender)}
              >
                {GENDERS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="客户来源">
              <select
                className="gc-input gc-select"
                value={source}
                onChange={(event) => setSource(event.target.value)}
              >
                {CUSTOMER_SOURCES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="标签" hint="点一下选中，再点一下取消。也可以自己加一个。">
            <div className="flex flex-wrap gap-2">
              {tagOptions.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className="gc-tag"
                  data-on={tags.includes(tag)}
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <input
                className="gc-input"
                value={customTag}
                onChange={(event) => setCustomTag(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addCustomTag();
                  }
                }}
                placeholder="自定义标签，按回车添加"
              />
              <button type="button" className="gc-btn gc-btn-light shrink-0" onClick={addCustomTag}>
                添加
              </button>
            </div>
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="跟进状态">
              <select
                className="gc-input gc-select"
                value={status}
                onChange={(event) => setStatus(event.target.value as CustomerStatus)}
              >
                {CUSTOMER_STATUSES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="下次跟进时间" hint="填了之后，到期当天会出现在首页提醒里。">
              <input
                type="date"
                className="gc-input"
                value={nextFollowUpAt}
                onChange={(event) => setNextFollowUpAt(event.target.value)}
              />
            </Field>
          </div>

          <Field label="备注">
            <textarea
              className="gc-input"
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="例如：偏爱简约通勤风，常穿 S / M 码"
            />
          </Field>

          {error ? (
            <p className="rounded-xl bg-[#fdeceb] px-4 py-3 text-[13px] text-[#c4300c]">{error}</p>
          ) : null}
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmingDelete}
        onClose={() => setConfirmingDelete(false)}
        onConfirm={() => {
          if (customer) trashCustomer(customer.id);
          setConfirmingDelete(false);
          onDeleted?.();
          onClose();
        }}
        title="把这位客户放进回收站？"
        description="放进回收站后，他不会再出现在列表和统计里，随时可以恢复。"
        confirmLabel="放进回收站"
        tone="danger"
      >
        <p className="text-[14px] leading-relaxed text-ink-2">
          {customer ? customer.name : ""} 名下还有
          <span className="font-medium text-ink">
            {" "}
            {relatedFollowUps} 条跟进记录和 {relatedPurchases} 笔消费记录
          </span>
          ，都会一起跟着进回收站。
        </p>
      </ConfirmDialog>
    </>
  );
}