// 从 Excel / CSV 文件里读出客户资料。
// 这里只负责"把文件变成数据"，界面部分在 ImportDialog 里。

import { CUSTOMER_SOURCES, CUSTOMER_STATUSES } from "./constants";
import type { CustomerStatus, Gender } from "./types";
import { toDateKey } from "./utils";

export type CellValue = string | number | Date | boolean | null;

export interface ParsedSheet {
  headers: string[];
  rows: CellValue[][];
}

/* ------------------------------------------------------------------
   1. 读文件
   ------------------------------------------------------------------ */

/** 根据编码把文件字节翻译成文字。中文的 CSV 有时是 GBK 编码，这里会自动判断。 */
function decodeText(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);

  // 带 BOM 的 UTF-8
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return new TextDecoder("utf-8").decode(bytes.subarray(3));
  }

  const utf8 = new TextDecoder("utf-8").decode(bytes);
  if (!utf8.includes("\uFFFD")) return utf8;

  try {
    return new TextDecoder("gbk").decode(bytes);
  } catch {
    return utf8;
  }
}

/** 猜分隔符：逗号、制表符还是分号 */
function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/)[0] ?? "";
  const counts: Record<string, number> = {
    ",": (firstLine.match(/,/g) ?? []).length,
    "\t": (firstLine.match(/\t/g) ?? []).length,
    ";": (firstLine.match(/;/g) ?? []).length,
  };
  return Object.keys(counts).reduce((best, key) => (counts[key] > counts[best] ? key : best), ",");
}

/** 把 CSV 文字切成一行行一格格的 */
function parseDelimited(text: string): ParsedSheet {
  const clean = text.replace(/^\uFEFF/, "");
  const delimiter = detectDelimiter(clean);

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < clean.length; i += 1) {
    const char = clean[i];

    if (inQuotes) {
      if (char === '"') {
        if (clean[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return buildSheet(rows as CellValue[][]);
}

/** 去掉空行，第一行当表头 */
function buildSheet(raw: CellValue[][]): ParsedSheet {
  const cleaned = raw.filter(
    (row) => row.some((cell) => String(cell ?? "").trim() !== "")
  );

  if (cleaned.length === 0) return { headers: [], rows: [] };

  const headers = (cleaned[0] ?? []).map((cell) => String(cell ?? "").trim());
  const rows = cleaned.slice(1).map((row) => {
    const next: CellValue[] = [];
    for (let i = 0; i < headers.length; i += 1) {
      next.push(row[i] ?? null);
    }
    return next;
  });

  return { headers, rows };
}

/** 读文件主入口 */
export async function parseFile(file: File): Promise<ParsedSheet> {
  const lower = file.name.toLowerCase();

  if (lower.endsWith(".csv") || lower.endsWith(".txt")) {
    const buffer = await file.arrayBuffer();
    return parseDelimited(decodeText(buffer));
  }

  if (lower.endsWith(".xlsx") || lower.endsWith(".xlsm")) {
    const { readSheet } = await import("read-excel-file/browser");
    const rows = (await readSheet(file)) as CellValue[][];
    return buildSheet(rows);
  }

  throw new Error("目前支持 .xlsx 和 .csv 两种文件，请把表格另存为这两种格式之一。");
}

/* ------------------------------------------------------------------
   2. 列对应关系
   ------------------------------------------------------------------ */

export type ImportFieldKey =
  | "name"
  | "phone"
  | "gender"
  | "source"
  | "tags"
  | "status"
  | "nextFollowUpAt"
  | "note"
  | "totalSpent"
  | "lastPurchaseAt";

export interface ImportField {
  key: ImportFieldKey;
  label: string;
  required?: boolean;
  hint?: string;
  aliases: string[];
}

export const IMPORT_FIELDS: ImportField[] = [
  {
    key: "name",
    label: "姓名",
    required: true,
    aliases: ["姓名", "客户姓名", "名字", "客户名称", "name"],
  },
  {
    key: "phone",
    label: "手机号",
    required: true,
    hint: "用来避免重复导入同一个人",
    aliases: ["手机号", "手机号码", "手机", "联系电话", "联系方式", "电话", "phone", "tel", "mobile"],
  },
  { key: "gender", label: "性别", aliases: ["性别", "gender"] },
  { key: "source", label: "客户来源", aliases: ["客户来源", "来源", "渠道", "source"] },
  { key: "tags", label: "标签", hint: "多个标签用 / 或逗号隔开", aliases: ["标签", "客户标签", "tag", "tags"] },
  { key: "status", label: "跟进状态", aliases: ["跟进状态", "客户状态", "状态", "status"] },
  {
    key: "nextFollowUpAt",
    label: "下次跟进时间",
    aliases: ["下次跟进时间", "下次跟进", "下次联系时间", "回访时间"],
  },
  { key: "note", label: "备注", aliases: ["备注", "说明", "note", "remark"] },
  {
    key: "totalSpent",
    label: "累计消费金额",
    hint: "填了会自动生成一笔消费记录",
    aliases: [
      "累计消费金额",
      "累计消费",
      "累计金额",
      "消费金额",
      "消费总额",
      "总消费",
      "消费合计",
      "amount",
    ],
  },
  {
    key: "lastPurchaseAt",
    label: "最近消费时间",
    aliases: [
      "最近消费时间",
      "最近消费",
      "最后消费时间",
      "上次消费时间",
      "最近购买时间",
      "购买时间",
      "消费日期",
    ],
  },
];

/** 自动猜哪一列对应哪个字段 */
export function autoMatch(headers: string[]): Partial<Record<ImportFieldKey, number>> {
  const normalized = headers.map((item) => item.replace(/\s/g, "").toLowerCase());
  const used = new Set<number>();
  const result: Partial<Record<ImportFieldKey, number>> = {};

  for (const field of IMPORT_FIELDS) {
    for (let index = 0; index < normalized.length; index += 1) {
      if (used.has(index)) continue;
      const header = normalized[index];
      if (!header) continue;
      const hit = field.aliases.some((alias) => {
        const key = alias.toLowerCase();
        return header === key || header.includes(key);
      });
      if (hit) {
        result[field.key] = index;
        used.add(index);
        break;
      }
    }
  }

  return result;
}

/* ------------------------------------------------------------------
   3. 把单元格翻译成我们要的数据
   ------------------------------------------------------------------ */

export function cellText(value: CellValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return toDateKey(value);
  return String(value).trim();
}

/** 日期：支持 2026-10-05、2026/10/5、2026年10月5日、Excel 里的日期格式 */
export function parseDateCell(value: CellValue): string | null {
  if (value === null || value === undefined || value === "") return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : toDateKey(value);
  }

  if (typeof value === "number") {
    // Excel 内部把日期存成一个数字
    if (value > 1 && value < 80000) {
      const ms = Math.round((value - 25569) * 86400 * 1000);
      const date = new Date(ms);
      return Number.isNaN(date.getTime()) ? null : toDateKey(date);
    }
    return null;
  }

  const text = String(value).trim();
  if (!text) return null;

  const normalized = text
    .replace(/[年月]/g, "-")
    .replace(/日/g, "")
    .replace(/[./]/g, "-")
    .replace(/\s+/g, "");

  const parts = normalized.split("-").filter((item) => item !== "");
  if (parts.length < 3) return null;

  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);

  if (!year || !month || !day) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  return (
    String(year) +
    "-" +
    String(month).padStart(2, "0") +
    "-" +
    String(day).padStart(2, "0")
  );
}

/** 金额：¥1,280.5 这种也能认出来 */
export function parseAmountCell(value: CellValue): number {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  const cleaned = String(value).replace(/[¥￥,，\s元]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseGenderCell(value: CellValue): Gender {
  const text = cellText(value).toLowerCase();
  if (!text) return "未知";
  if (["女", "女性", "female", "f", "2"].includes(text)) return "女";
  if (["男", "男性", "male", "m", "1"].includes(text)) return "男";
  return "未知";
}

function parseStatusCell(value: CellValue): CustomerStatus {
  const text = cellText(value);
  if (!text) return "新客户";

  const exact = CUSTOMER_STATUSES.find((item) => item === text);
  if (exact) return exact;

  if (text.includes("成交") || text.includes("已购买") || text.includes("已买")) return "已成交";
  if (text.includes("流失") || text.includes("放弃")) return "已流失";
  if (text.includes("跟进")) return "跟进中";
  if (text.includes("新")) return "新客户";
  return "新客户";
}

function parseTagsCell(value: CellValue): string[] {
  return cellText(value)
    .split(/[,，/、|;；]/)
    .map((item) => item.trim())
    .filter((item) => item !== "");
}

/* ------------------------------------------------------------------
   4. 组装成待导入的行
   ------------------------------------------------------------------ */

export interface DraftRow {
  /** 在原文件里的行号，从 2 开始（第 1 行是表头） */
  lineNumber: number;
  customer: {
    name: string;
    phone: string;
    gender: Gender;
    source: string;
    tags: string[];
    status: CustomerStatus;
    nextFollowUpAt: string | null;
    note: string;
  };
  totalSpent: number;
  lastPurchaseAt: string | null;
  /** 有问题的地方，比如缺姓名 */
  problem: string | null;
  /** 手机号在系统里已经存在 */
  duplicate: boolean;
}

export function buildDraftRows(
  sheet: ParsedSheet,
  mapping: Partial<Record<ImportFieldKey, number>>,
  existingPhones: Set<string>
): DraftRow[] {
  const pick = (row: CellValue[], key: ImportFieldKey): CellValue => {
    const index = mapping[key];
    if (index === undefined || index === null || index < 0) return null;
    return row[index] ?? null;
  };

  return sheet.rows.map((row, position) => {
    const name = cellText(pick(row, "name"));
    const phone = cellText(pick(row, "phone")).replace(/[^0-9]/g, "");
    const totalSpent = parseAmountCell(pick(row, "totalSpent"));
    const lastPurchaseAt = parseDateCell(pick(row, "lastPurchaseAt"));

    let problem: string | null = null;
    if (!name) problem = "缺少姓名";
    else if (!phone) problem = "缺少手机号";
    else if (phone.length < 6 || phone.length > 15) problem = "手机号格式不对";

    const sourceText = cellText(pick(row, "source"));
    const source = sourceText || CUSTOMER_SOURCES[0];
    const declaredStatus = cellText(pick(row, "status"));

    return {
      lineNumber: position + 2,
      customer: {
        name,
        phone,
        gender: parseGenderCell(pick(row, "gender")),
        source,
        tags: parseTagsCell(pick(row, "tags")),
        // 没写状态时：有消费就算已成交，否则是新客户
        status: declaredStatus ? parseStatusCell(declaredStatus) : totalSpent > 0 ? "已成交" : "新客户",
        nextFollowUpAt: parseDateCell(pick(row, "nextFollowUpAt")),
        note: cellText(pick(row, "note")),
      },
      totalSpent,
      lastPurchaseAt,
      problem,
      duplicate: phone !== "" && existingPhones.has(phone),
    };
  });
}

/* ------------------------------------------------------------------
   5. 导入模板
   ------------------------------------------------------------------ */

function csvCell(text: string): string {
  if (/[",\n]/.test(text)) return '"' + text.replace(/"/g, '""') + '"';
  return text;
}

/** 生成一份可以下载的模板，用户照着填就行 */
export function buildTemplateCsv(): string {
  const headers = [
    "姓名",
    "手机号",
    "性别",
    "客户来源",
    "标签",
    "跟进状态",
    "下次跟进时间",
    "备注",
    "累计消费金额",
    "最近消费时间",
  ];

  const rows = [
    [
      "张小雨",
      "13800001111",
      "女",
      "到店自然客流",
      "高消费/喜欢新款",
      "已成交",
      "2026-10-15",
      "去年买过两件外套",
      "3200",
      "2026-09-20",
    ],
    [
      "李可",
      "13800002222",
      "女",
      "小红书",
      "价格敏感",
      "跟进中",
      "2026-10-12",
      "看中一件大衣，等折扣",
      "",
      "",
    ],
  ];

  const lines = [headers, ...rows].map((row) => row.map(csvCell).join(","));
  // 开头加 BOM，这样 Excel 打开不会乱码
  return "\uFEFF" + lines.join("\r\n");
}