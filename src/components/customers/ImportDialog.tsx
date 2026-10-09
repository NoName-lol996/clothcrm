"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Download,
  FileSpreadsheet,
  Loader2,
  Receipt,
  Upload,
  Users,
} from "lucide-react";
import Modal from "@/components/ui/Modal";
import {
  CUSTOMER_FIELDS,
  PURCHASE_FIELDS,
  autoMatch,
  buildCustomerDrafts,
  buildPurchaseDrafts,
  buildPurchaseTemplateCsv,
  buildTemplateCsv,
  cellText,
  parseFile,
  type CustomerFieldKey,
  type ParsedSheet,
  type PurchaseFieldKey,
} from "@/lib/import";
import { useData } from "@/lib/store";
import { formatMoney } from "@/lib/utils";

type Kind = "customer" | "purchase";
type Step = "choose" | "pick" | "map" | "preview" | "done";

/** 以后要加新的导入类型，在这里加一条，然后在下面补上对应的解析就行 */
const KIND_CARDS: {
  key: Kind;
  title: string;
  description: string;
  icon: typeof Users;
}[] = [
  {
    key: "customer",
    title: "客户资料",
    description: "姓名、手机号、来源、标签、累计消费等等",
    icon: Users,
  },
  {
    key: "purchase",
    title: "消费记录",
    description: "给已有客户补录历史订单，一笔一行",
    icon: Receipt,
  },
];

const NONE = -1;

interface ImportResult {
  imported: number;
  skipped: number;
  problems: number;
}

export default function ImportDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { customers, purchases, importCustomers, addPurchases } = useData();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [kind, setKind] = useState<Kind | null>(null);
  const [step, setStep] = useState<Step>("choose");
  const [fileName, setFileName] = useState("");
  const [sheet, setSheet] = useState<ParsedSheet | null>(null);
  const [mapping, setMapping] = useState<Record<string, number>>({});
  const [customerMode, setCustomerMode] = useState<"skip" | "update">("skip");
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const existingPhones = useMemo(() => new Set(customers.map((item) => item.phone)), [customers]);

  const fields = kind === "purchase" ? PURCHASE_FIELDS : CUSTOMER_FIELDS;

  const customerDrafts = useMemo(() => {
    if (kind !== "customer" || !sheet) return [];
    return buildCustomerDrafts(
      sheet,
      mapping as Partial<Record<CustomerFieldKey, number>>,
      existingPhones
    );
  }, [kind, sheet, mapping, existingPhones]);

  const purchaseDrafts = useMemo(() => {
    if (kind !== "purchase" || !sheet) return [];
    return buildPurchaseDrafts(
      sheet,
      mapping as Partial<Record<PurchaseFieldKey, number>>,
      customers,
      purchases
    );
  }, [kind, sheet, mapping, customers, purchases]);

  const customerValid = customerDrafts.filter((item) => item.problem === null);
  const customerProblems = customerDrafts.length - customerValid.length;
  const customerDuplicates = customerValid.filter((item) => item.duplicate).length;
  const customerWillImport = customerValid.filter(
    (item) => !(item.duplicate && customerMode === "skip")
  ).length;

  const purchaseValid = purchaseDrafts.filter((item) => item.problem === null);
  const purchaseProblems = purchaseDrafts.length - purchaseValid.length;
  const purchaseDuplicates = purchaseValid.filter((item) => item.duplicate).length;
  const purchaseWillImport = purchaseValid.filter(
    (item) => !(item.duplicate && skipDuplicates)
  ).length;
  const purchaseTotal = purchaseValid
    .filter((item) => !(item.duplicate && skipDuplicates))
    .reduce((sum, item) => sum + item.amount, 0);

  // 每次打开都回到第一步
  useEffect(() => {
    if (!open) return;
    setKind(null);
    setStep("choose");
    setFileName("");
    setSheet(null);
    setMapping({});
    setCustomerMode("skip");
    setSkipDuplicates(true);
    setError("");
    setResult(null);
    setBusy(false);
  }, [open]);

  function chooseKind(next: Kind) {
    setKind(next);
    setStep("pick");
    setError("");
  }

  async function handleFile(file: File) {
    if (!kind) return;
    setError("");
    setBusy(true);
    try {
      const parsed = await parseFile(file);
      if (parsed.headers.length === 0 || parsed.rows.length === 0) {
        setError("这个文件里没有读到内容。请确认第一行是表头，下面才是数据。");
        setBusy(false);
        return;
      }
      setSheet(parsed);
      setMapping(autoMatch(parsed.headers, kind === "purchase" ? PURCHASE_FIELDS : CUSTOMER_FIELDS));
      setFileName(file.name);
      setStep("map");
    } catch (err) {
      setError(err instanceof Error ? err.message : "文件读不出来，请换一个文件试试。");
    }
    setBusy(false);
  }

  function downloadTemplate() {
    const csv = kind === "purchase" ? buildPurchaseTemplateCsv() : buildTemplateCsv();
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = kind === "purchase" ? "消费记录导入模板.csv" : "客户资料导入模板.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function goPreview() {
    const has = (key: string) => {
      const index = mapping[key];
      return index !== undefined && index !== NONE && index >= 0;
    };

    if (kind === "customer") {
      if (!has("name")) return setError("请指定哪一列是「姓名」");
      if (!has("phone")) return setError("请指定哪一列是「手机号」");
    } else {
      if (!has("customerPhone") && !has("customerName")) {
        return setError("请至少指定「客户手机号」或「客户姓名」，否则认不出这些消费是谁的");
      }
      if (!has("purchasedAt")) return setError("请指定哪一列是「消费日期」");
      if (!has("amount")) return setError("请指定哪一列是「消费金额」");
    }

    setError("");
    setStep("preview");
  }

  function confirmImport() {
    if (kind === "customer") {
      const rows = customerValid
        .filter((item) => !(item.duplicate && customerMode === "skip"))
        .map((item) => ({
          customer: item.customer,
          spending:
            item.totalSpent > 0
              ? {
                  amount: item.totalSpent,
                  purchasedAt: item.lastPurchaseAt ?? todayString(),
                  note: "导入客户时一并录入",
                }
              : null,
        }));

      const outcome = importCustomers(rows, customerMode);
      setResult({
        imported: outcome.imported,
        skipped: outcome.skipped,
        problems: customerProblems,
      });
    } else {
      const rows = purchaseValid
        .filter((item) => !(item.duplicate && skipDuplicates))
        .map((item) => ({
          customerId: item.customerId as string,
          purchasedAt: item.purchasedAt,
          amount: item.amount,
          note: item.note,
        }));

      addPurchases(rows);
      setResult({
        imported: rows.length,
        skipped: purchaseValid.filter((item) => item.duplicate && skipDuplicates).length,
        problems: purchaseProblems,
      });
    }

    setStep("done");
  }

  function todayString() {
    const date = new Date();
    return (
      date.getFullYear() +
      "-" +
      String(date.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(date.getDate()).padStart(2, "0")
    );
  }

  const titles: Record<Step, string> = {
    choose: "导入信息",
    pick: kind === "purchase" ? "导入消费记录" : "导入客户资料",
    map: "确认列的对应关系",
    preview: "确认要导入的内容",
    done: "导入完成",
  };

  const descriptions: Record<Step, string | undefined> = {
    choose: "想导入什么，就选哪一项。",
    pick:
      kind === "purchase"
        ? "支持 Excel（.xlsx）和 CSV。每一行是一笔消费，系统会自动找到它属于哪位客户。"
        : "支持 Excel（.xlsx）和 CSV。已经在店里成交过的老客户，可以把消费金额一起带进来。",
    map: "左边是系统需要的字段，右边选它对应你表格里的哪一列。没识别对的话手动改一下。",
    preview: "确认没问题再点导入。",
    done: undefined,
  };

  const footer =
    step === "choose" ? (
      <button type="button" className="gc-btn gc-btn-light" onClick={onClose}>
        取消
      </button>
    ) : step === "pick" ? (
      <>
        <button type="button" className="gc-btn gc-btn-light mr-auto" onClick={() => setStep("choose")}>
          <ArrowLeft size={15} />
          返回
        </button>
        <button type="button" className="gc-btn gc-btn-light mr-auto hidden" tabIndex={-1} />
        <button type="button" className="gc-btn gc-btn-dark" disabled={busy} onClick={() => fileInputRef.current?.click()}>
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
          {busy ? "正在读取…" : "选择文件"}
        </button>
      </>
    ) : step === "map" ? (
      <>
        <button type="button" className="gc-btn gc-btn-light mr-auto" onClick={() => setStep("pick")}>
          <ArrowLeft size={15} />
          换个文件
        </button>
        <button type="button" className="gc-btn gc-btn-light" onClick={onClose}>
          取消
        </button>
        <button type="button" className="gc-btn gc-btn-dark" onClick={goPreview}>
          下一步
        </button>
      </>
    ) : step === "preview" ? (
      <>
        <button type="button" className="gc-btn gc-btn-light mr-auto" onClick={() => setStep("map")}>
          <ArrowLeft size={15} />
          返回上一步
        </button>
        <button type="button" className="gc-btn gc-btn-light" onClick={onClose}>
          取消
        </button>
        <button
          type="button"
          className="gc-btn gc-btn-dark"
          disabled={(kind === "customer" ? customerWillImport : purchaseWillImport) === 0}
          onClick={confirmImport}
        >
          {kind === "customer"
            ? "确认导入 " + customerWillImport + " 位客户"
            : "确认导入 " + purchaseWillImport + " 笔消费"}
        </button>
      </>
    ) : (
      <button type="button" className="gc-btn gc-btn-dark" onClick={onClose}>
        完成
      </button>
    );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={titles[step]}
      description={descriptions[step]}
      width={760}
      footer={footer}
    >
      {/* 第一步：选导入什么 */}
      {step === "choose" ? (
        <div className="space-y-3">
          {KIND_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.key}
                type="button"
                onClick={() => chooseKind(card.key)}
                className="flex w-full items-center gap-4 rounded-[18px] border border-black/[0.06] bg-white px-5 py-5 text-left transition hover:border-ink-3 hover:bg-canvas-2"
              >
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-canvas-2 text-ink-2">
                  <Icon size={19} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-medium">{card.title}</span>
                  <span className="mt-1 block text-[13px] text-ink-3">{card.description}</span>
                </span>
                <ChevronRight size={18} className="shrink-0 text-ink-3" />
              </button>
            );
          })}
          <p className="pt-1 text-[12px] leading-relaxed text-ink-3">
            以后如果有新的信息类型（比如储值、生日），也会出现在上面这个列表里。
          </p>
        </div>
      ) : null}

      {/* 第二步：选文件 */}
      {step === "pick" ? (
        <div>
          <div
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const file = event.dataTransfer.files?.[0];
              if (file) void handleFile(file);
            }}
            className="flex flex-col items-center justify-center rounded-[18px] border border-dashed border-hairline bg-canvas-2 px-6 py-12 text-center"
          >
            <FileSpreadsheet size={30} className="text-ink-3" />
            <p className="mt-4 text-[15px] font-medium">把 Excel 或 CSV 文件拖到这里</p>
            <p className="mt-1.5 text-[13px] text-ink-3">或者点右下角的「选择文件」</p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xlsm,.csv,.txt"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleFile(file);
              event.target.value = "";
            }}
          />

          <div className="mt-5 rounded-[18px] bg-canvas-2 px-5 py-4 text-[13px] leading-relaxed text-ink-2">
            <p className="font-medium text-ink">
              {kind === "purchase" ? "消费记录的表格怎么准备？" : "客户资料的表格怎么准备？"}
            </p>
            <p className="mt-2">
              {kind === "purchase"
                ? "第一行写表头，至少要有「客户手机号、消费日期、消费金额」这三列；再加一列「买了什么」会更清楚。一位客户一天买了三件，就写三行，系统会分别记账。"
                : "第一行写表头，比如「姓名、手机号、性别、客户来源、标签、跟进状态、累计消费金额、最近消费时间」等，下面一行一位客户。"}
            </p>
            <p className="mt-2">把握不准就点左下角「下载模板」，照着填最省事。</p>
          </div>

          {error ? (
            <p className="mt-4 rounded-xl bg-[#fdeceb] px-4 py-3 text-[13px] text-[#c4300c]">{error}</p>
          ) : null}
        </div>
      ) : null}

      {/* 第三步：列对应 */}
      {step === "map" && sheet ? (
        <div>
          <p className="mb-4 text-[13px] text-ink-3">
            文件：{fileName} · 共 {sheet.rows.length} 行
          </p>
          <div className="space-y-2.5">
            {fields.map((field) => {
              const selected = mapping[field.key] ?? NONE;
              const sample = selected >= 0 ? cellText(sheet.rows[0]?.[selected] ?? null) : "";
              return (
                <div key={field.key} className="flex items-center gap-4">
                  <div className="w-[130px] shrink-0 text-[13px] font-medium text-ink-2">
                    {field.label}
                    {field.required ? <span className="ml-1 text-[#c4300c]">*</span> : null}
                  </div>
                  <select
                    className="gc-input gc-select flex-1"
                    value={selected}
                    onChange={(event) =>
                      setMapping((prev) => ({ ...prev, [field.key]: Number(event.target.value) }))
                    }
                  >
                    <option value={NONE}>不导入</option>
                    {sheet.headers.map((header, index) => (
                      <option key={index} value={index}>
                        {header || "第 " + (index + 1) + " 列"}
                      </option>
                    ))}
                  </select>
                  <div className="w-[120px] shrink-0 truncate text-[12px] text-ink-3">
                    {sample ? "例：" + sample : field.hint ?? ""}
                  </div>
                </div>
              );
            })}
          </div>
          {error ? (
            <p className="mt-4 rounded-xl bg-[#fdeceb] px-4 py-3 text-[13px] text-[#c4300c]">{error}</p>
          ) : null}
        </div>
      ) : null}

      {/* 第四步：预览 */}
      {step === "preview" && kind === "customer" ? (
        <div>
          <div className="flex flex-wrap gap-2.5">
            <span className="rounded-full bg-canvas-2 px-3.5 py-1.5 text-[13px] text-ink-2">
              共 {customerDrafts.length} 行
            </span>
            <span className="rounded-full bg-[#e6f6ec] px-3.5 py-1.5 text-[13px] text-[#1a7f37]">
              可以导入 {customerValid.length} 位
            </span>
            {customerDuplicates > 0 ? (
              <span className="rounded-full bg-[#fff4e5] px-3.5 py-1.5 text-[13px] text-[#a86a00]">
                手机号已存在 {customerDuplicates} 位
              </span>
            ) : null}
            {customerProblems > 0 ? (
              <span className="rounded-full bg-[#fdeceb] px-3.5 py-1.5 text-[13px] text-[#c4300c]">
                有问题 {customerProblems} 行
              </span>
            ) : null}
          </div>

          {customerDuplicates > 0 ? (
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-[16px] bg-canvas-2 px-4 py-3">
              <span className="text-[13px] text-ink-2">手机号已经存在的客户：</span>
              <div className="inline-flex items-center rounded-full bg-white p-1">
                {(["skip", "update"] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setCustomerMode(item)}
                    className={
                      "rounded-full px-3.5 py-1.5 text-[13px] font-medium transition " +
                      (customerMode === item ? "bg-ink text-white" : "text-ink-2 hover:text-ink")
                    }
                  >
                    {item === "skip" ? "跳过" : "更新他们的资料"}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-4 max-h-[300px] overflow-auto rounded-[16px] border border-black/[0.06]">
            <table className="gc-table min-w-[620px]">
              <thead className="sticky top-0 bg-white">
                <tr>
                  <th>行号</th>
                  <th>姓名</th>
                  <th>手机号</th>
                  <th>来源</th>
                  <th>状态</th>
                  <th>累计消费</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {customerDrafts.slice(0, 30).map((item) => (
                  <tr key={item.lineNumber}>
                    <td className="text-ink-3">{item.lineNumber}</td>
                    <td>{item.customer.name || "—"}</td>
                    <td className="text-ink-2">{item.customer.phone || "—"}</td>
                    <td className="text-ink-2">{item.customer.source}</td>
                    <td className="text-ink-2">{item.customer.status}</td>
                    <td>{item.totalSpent > 0 ? formatMoney(item.totalSpent) : "—"}</td>
                    <td className="text-right text-[12px]">
                      {item.problem ? (
                        <span className="text-[#c4300c]">{item.problem}</span>
                      ) : item.duplicate ? (
                        <span className="text-[#a86a00]">
                          {customerMode === "skip" ? "重复，将跳过" : "重复，将更新"}
                        </span>
                      ) : (
                        <span className="text-[#1a7f37]">可导入</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {customerDrafts.length > 30 ? (
            <p className="mt-3 text-[13px] text-ink-3">
              只预览前 30 行，导入时会处理全部 {customerDrafts.length} 行。
            </p>
          ) : null}
        </div>
      ) : null}

      {step === "preview" && kind === "purchase" ? (
        <div>
          <div className="flex flex-wrap gap-2.5">
            <span className="rounded-full bg-canvas-2 px-3.5 py-1.5 text-[13px] text-ink-2">
              共 {purchaseDrafts.length} 行
            </span>
            <span className="rounded-full bg-[#e6f6ec] px-3.5 py-1.5 text-[13px] text-[#1a7f37]">
              可导入 {purchaseWillImport} 笔 · {formatMoney(purchaseTotal)}
            </span>
            {purchaseDuplicates > 0 ? (
              <span className="rounded-full bg-[#fff4e5] px-3.5 py-1.5 text-[13px] text-[#a86a00]">
                疑似重复 {purchaseDuplicates} 笔
              </span>
            ) : null}
            {purchaseProblems > 0 ? (
              <span className="rounded-full bg-[#fdeceb] px-3.5 py-1.5 text-[13px] text-[#c4300c]">
                有问题 {purchaseProblems} 行
              </span>
            ) : null}
          </div>

          {purchaseDuplicates > 0 ? (
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-[16px] bg-canvas-2 px-4 py-3">
              <span className="text-[13px] text-ink-2">
                「同一位客户、同一天、同样金额」的记录：
              </span>
              <div className="inline-flex items-center rounded-full bg-white p-1">
                {[true, false].map((item) => (
                  <button
                    key={String(item)}
                    type="button"
                    onClick={() => setSkipDuplicates(item)}
                    className={
                      "rounded-full px-3.5 py-1.5 text-[13px] font-medium transition " +
                      (skipDuplicates === item ? "bg-ink text-white" : "text-ink-2 hover:text-ink")
                    }
                  >
                    {item ? "跳过" : "照样导入"}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-4 max-h-[300px] overflow-auto rounded-[16px] border border-black/[0.06]">
            <table className="gc-table min-w-[660px]">
              <thead className="sticky top-0 bg-white">
                <tr>
                  <th>行号</th>
                  <th>客户</th>
                  <th>消费日期</th>
                  <th>金额</th>
                  <th>买了什么</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {purchaseDrafts.slice(0, 30).map((item) => (
                  <tr key={item.lineNumber}>
                    <td className="text-ink-3">{item.lineNumber}</td>
                    <td>{item.customerLabel || "—"}</td>
                    <td className="text-ink-2">{item.purchasedAt || "—"}</td>
                    <td>{item.amount > 0 ? formatMoney(item.amount) : "—"}</td>
                    <td className="truncate text-ink-2">{item.note || "—"}</td>
                    <td className="text-right text-[12px]">
                      {item.problem ? (
                        <span className="text-[#c4300c]">{item.problem}</span>
                      ) : item.duplicate ? (
                        <span className="text-[#a86a00]">
                          {skipDuplicates ? "疑似重复，将跳过" : "疑似重复，照样导入"}
                        </span>
                      ) : (
                        <span className="text-[#1a7f37]">可导入</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {purchaseDrafts.length > 30 ? (
            <p className="mt-3 text-[13px] text-ink-3">
              只预览前 30 行，导入时会处理全部 {purchaseDrafts.length} 行。
            </p>
          ) : null}
        </div>
      ) : null}

      {/* 第五步：完成 */}
      {step === "done" && result ? (
        <div className="flex flex-col items-center py-6 text-center">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#e6f6ec] text-[#1a7f37]">
            <Check size={26} />
          </span>
          <p className="gc-title-md mt-5">
            {kind === "customer"
              ? "成功导入 " + result.imported + " 位客户"
              : "成功导入 " + result.imported + " 笔消费"}
          </p>
          <p className="mt-2 text-[13px] text-ink-2">
            {result.skipped > 0
              ? result.skipped + (kind === "customer" ? " 位因为手机号已存在被跳过。" : " 笔疑似重复被跳过。")
              : "没有跳过任何数据。"}
          </p>
          {result.problems > 0 ? (
            <p className="mt-1 text-[13px] text-ink-3">{result.problems} 行因为资料不全没有导入。</p>
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
}