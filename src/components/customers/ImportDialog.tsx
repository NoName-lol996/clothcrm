"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, Download, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import Modal from "@/components/ui/Modal";
import {
  IMPORT_FIELDS,
  autoMatch,
  buildDraftRows,
  buildTemplateCsv,
  cellText,
  parseFile,
  type ImportFieldKey,
  type ParsedSheet,
} from "@/lib/import";
import { useData } from "@/lib/store";

type Step = "pick" | "map" | "preview" | "done";

const NONE = -1;

export default function ImportDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { customers, importCustomers } = useData();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("pick");
  const [fileName, setFileName] = useState("");
  const [sheet, setSheet] = useState<ParsedSheet | null>(null);
  const [mapping, setMapping] = useState<Partial<Record<ImportFieldKey, number>>>({});
  const [mode, setMode] = useState<"skip" | "update">("skip");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);

  const existingPhones = useMemo(
    () => new Set(customers.map((item) => item.phone)),
    [customers]
  );

  const drafts = useMemo(() => {
    if (!sheet) return [];
    return buildDraftRows(sheet, mapping, existingPhones);
  }, [sheet, mapping, existingPhones]);

  const validDrafts = drafts.filter((item) => item.problem === null);
  const problemCount = drafts.length - validDrafts.length;
  const duplicateCount = validDrafts.filter((item) => item.duplicate).length;
  const willImport = validDrafts.filter((item) => !(item.duplicate && mode === "skip")).length;

  function resetAll() {
    setStep("pick");
    setFileName("");
    setSheet(null);
    setMapping({});
    setMode("skip");
    setError("");
    setResult(null);
    setBusy(false);
  }

  // 每次打开时都回到第一步，避免上次的内容残留
  useEffect(() => {
    if (open) resetAll();
  }, [open]);

  function handleClose() {
    onClose();
  }

  async function handleFile(file: File) {
    setError("");
    setBusy(true);
    try {
      const parsed = await parseFile(file);
      if (parsed.headers.length === 0 || parsed.rows.length === 0) {
        setError("这个文件里没有读到内容。请确认第一行是表头，下面才是客户资料。");
        setBusy(false);
        return;
      }
      setSheet(parsed);
      setMapping(autoMatch(parsed.headers));
      setFileName(file.name);
      setStep("map");
    } catch (err) {
      setError(err instanceof Error ? err.message : "文件读不出来，请换一个文件试试。");
    }
    setBusy(false);
  }

  function downloadTemplate() {
    const csv = buildTemplateCsv();
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "客户导入模板.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function goPreview() {
    if (mapping.name === undefined || mapping.name === NONE) {
      setError("请指定哪一列是「姓名」");
      return;
    }
    if (mapping.phone === undefined || mapping.phone === NONE) {
      setError("请指定哪一列是「手机号」");
      return;
    }
    setError("");
    setStep("preview");
  }

  function confirmImport() {
    const rows = validDrafts
      .filter((item) => !(item.duplicate && mode === "skip"))
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

    const outcome = importCustomers(rows, mode);
    setResult(outcome);
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

  const footer =
    step === "pick" ? (
      <>
        <button type="button" className="gc-btn gc-btn-light mr-auto" onClick={downloadTemplate}>
          <Download size={15} />
          下载导入模板
        </button>
        <button type="button" className="gc-btn gc-btn-light" onClick={handleClose}>
          取消
        </button>
      </>
    ) : step === "map" ? (
      <>
        <button type="button" className="gc-btn gc-btn-light mr-auto" onClick={resetAll}>
          <ArrowLeft size={15} />
          换个文件
        </button>
        <button type="button" className="gc-btn gc-btn-light" onClick={handleClose}>
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
        <button type="button" className="gc-btn gc-btn-light" onClick={handleClose}>
          取消
        </button>
        <button
          type="button"
          className="gc-btn gc-btn-dark"
          disabled={willImport === 0}
          onClick={confirmImport}
        >
          确认导入 {willImport} 位客户
        </button>
      </>
    ) : (
      <button type="button" className="gc-btn gc-btn-dark" onClick={handleClose}>
        完成
      </button>
    );

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={
        step === "pick"
          ? "导入客户"
          : step === "map"
            ? "确认列的对应关系"
            : step === "preview"
              ? "确认要导入的内容"
              : "导入完成"
      }
      description={
        step === "pick"
          ? "支持 Excel（.xlsx）和 CSV 文件。已经在店里成交过的老客户，可以把消费金额一起带进来。"
          : step === "map"
            ? "左边是系统需要的字段，右边选它对应你表格里的哪一列。没识别对的话手动改一下。"
            : step === "preview"
              ? "确认没问题再点导入。"
              : undefined
      }
      width={760}
      footer={footer}
    >
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
            <p className="mt-1.5 text-[13px] text-ink-3">或者点下面的按钮选择文件</p>
            <button
              type="button"
              className="gc-btn gc-btn-dark mt-5"
              disabled={busy}
              onClick={() => fileInputRef.current?.click()}
            >
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
              {busy ? "正在读取…" : "选择文件"}
            </button>
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
          </div>

          <div className="mt-5 rounded-[18px] bg-canvas-2 px-5 py-4 text-[13px] leading-relaxed text-ink-2">
            <p className="font-medium text-ink">表格怎么准备？</p>
            <p className="mt-2">
              第一行写表头，比如「姓名、手机号、性别、客户来源、标签、跟进状态、累计消费金额、最近消费时间」等，
              下面一行一位客户。系统会自动猜列的对应关系，猜错了下一步可以手动改。
            </p>
            <p className="mt-2">
              把握不准就点左下角「下载导入模板」，照着填最省事。
            </p>
          </div>

          {error ? (
            <p className="mt-4 rounded-xl bg-[#fdeceb] px-4 py-3 text-[13px] text-[#c4300c]">{error}</p>
          ) : null}
        </div>
      ) : null}

      {step === "map" && sheet ? (
        <div>
          <p className="mb-4 text-[13px] text-ink-3">
            文件：{fileName} · 共 {sheet.rows.length} 行
          </p>
          <div className="space-y-2.5">
            {IMPORT_FIELDS.map((field) => {
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
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      setMapping((prev) => ({ ...prev, [field.key]: value }));
                    }}
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

      {step === "preview" ? (
        <div>
          <div className="flex flex-wrap gap-2.5">
            <span className="rounded-full bg-canvas-2 px-3.5 py-1.5 text-[13px] text-ink-2">
              共 {drafts.length} 行
            </span>
            <span className="rounded-full bg-[#e6f6ec] px-3.5 py-1.5 text-[13px] text-[#1a7f37]">
              可以导入 {validDrafts.length} 位
            </span>
            {duplicateCount > 0 ? (
              <span className="rounded-full bg-[#fff4e5] px-3.5 py-1.5 text-[13px] text-[#a86a00]">
                手机号已存在 {duplicateCount} 位
              </span>
            ) : null}
            {problemCount > 0 ? (
              <span className="rounded-full bg-[#fdeceb] px-3.5 py-1.5 text-[13px] text-[#c4300c]">
                有问题 {problemCount} 行
              </span>
            ) : null}
          </div>

          {duplicateCount > 0 ? (
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-[16px] bg-canvas-2 px-4 py-3">
              <span className="text-[13px] text-ink-2">手机号已经存在的客户：</span>
              <div className="inline-flex items-center rounded-full bg-white p-1">
                {(["skip", "update"] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setMode(item)}
                    className={
                      "rounded-full px-3.5 py-1.5 text-[13px] font-medium transition " +
                      (mode === item
                        ? "bg-ink text-white"
                        : "text-ink-2 hover:text-ink")
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
                {drafts.slice(0, 30).map((item) => (
                  <tr key={item.lineNumber}>
                    <td className="text-ink-3">{item.lineNumber}</td>
                    <td>{item.customer.name || "—"}</td>
                    <td className="text-ink-2">{item.customer.phone || "—"}</td>
                    <td className="text-ink-2">{item.customer.source}</td>
                    <td className="text-ink-2">{item.customer.status}</td>
                    <td>{item.totalSpent > 0 ? "¥" + item.totalSpent.toLocaleString("zh-CN") : "—"}</td>
                    <td className="text-right text-[12px]">
                      {item.problem ? (
                        <span className="text-[#c4300c]">{item.problem}</span>
                      ) : item.duplicate ? (
                        <span className="text-[#a86a00]">
                          {mode === "skip" ? "重复，将跳过" : "重复，将更新"}
                        </span>
                      ) : (
                        <span className="text-[#1a7f37]">可导入</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {drafts.length > 30 ? (
              <p className="px-4 py-3 text-[13px] text-ink-3">
                只预览前 30 行，导入时会处理全部 {drafts.length} 行。
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {step === "done" && result ? (
        <div className="flex flex-col items-center py-6 text-center">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#e6f6ec] text-[#1a7f37]">
            <Check size={26} />
          </span>
          <p className="gc-title-md mt-5">
            成功导入 {result.imported} 位客户
          </p>
          <p className="mt-2 text-[13px] text-ink-2">
            {result.skipped > 0 ? result.skipped + " 位因为手机号已存在被跳过。" : "没有跳过任何客户。"}
          </p>
          {problemCount > 0 ? (
            <p className="mt-1 text-[13px] text-ink-3">{problemCount} 行因为资料不全没有导入。</p>
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
}