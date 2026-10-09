// 从 Excel / CSV 文件里读出资料。
// 目前支持两类：客户资料、消费记录。以后要加新类型，照着下面加一组字段就行。

import { CUSTOMER_SOURCES, CUSTOMER_STATUSES } from "./constants";
import type { Customer, CustomerStatus, Gender, Purchase } from "./types";
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
  const cleaned = raw.filter((row) => row.some((cell) => String(cell ?? "").trim() !== ""));

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
   2. 两个导入类型各自需要哪些列
   ------------------------------------------------------------------ */

export interface ImportField<K extends string> {
  key: K;
  label: string;
  required?: boolean;
  hint?: string;
  aliases: string[];
}

export type CustomerFieldKey =
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

export type PurchaseFieldKey =
  | "customerPhone"
  | "customerName"
  | "purchasedAt"
  | "amount"
  | "note";

/** 导入客户资料时，系统需要的列 */
export const CUSTOMER_FIELDS: ImportField<CustomerFieldKey>[] = [
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
    aliases: ["累计消费金额", "累计消费", "累计金额", "消费金额", "消费总额", "总消费", "消费合计", "amount"],
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

/** 导入消费记录时，系统需要的列 */
export const PURCHASE_FIELDS: ImportField<PurchaseFieldKey>[] = [
  {
    key: "customerPhone",
    label: "客户手机号",
    required: true,
    hint: "靠它找到是哪位客户",
    aliases: [
      "客户手机号",
      "手机号",
      "手机号码",
      "手机",
      "联系电话",
      "联系方式",
      "电话",
      "phone",
      "tel",
      "mobile",
    ],
  },
  {
    key: "customerName",
    label: "客户姓名",
    hint: "没有手机号时，靠姓名匹配",
    aliases: ["客户姓名", "姓名", "客户名称", "名字", "客户", "name"],
  },
  {
    key: "purchasedAt",
    label: "消费日期",
    required: true,
    aliases: [
      "消费日期",
      "消费时间",
      "购买日期",
      "购买时间",
      "订单日期",
      "成交日期",
      "下单时间",
      "日期",
      "date",
    ],
  },
  {
    key: "amount",
    label: "消费金额",
    required: true,
    aliases: [
      "消费金额",
      "实付金额",
      "成交金额",
      "订单金额",
      "应付金额",
      "金额",
      "价格",
      "amount",
      "total",
    ],
  },
  {
    key: "note",
    label: "买了什么",
    aliases: ["买了什么", "商品名称", "商品", "货品", "款式", "备注", "说明", "item", "note", "remark"],
  },
];

/** 自动猜哪一列对应哪个字段 */
export function autoMatch<K extends string>(
  headers: string[],
  fields: ImportField<K>[]
): Partial<Record<K, number>> {
  const normalized = headers.map((item) => item.replace(/\s/g, "").toLowerCase());
  const used = new Set<number>();
  const result: Partial<Record<K, number>> = {};

  for (const field of fields) {
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

  return String(year) + "-" + String(month).padStart(2, "0") + "-" + String(day).padStart(2, "0");
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
   4. 客户资料：组装成待导入的行
   ------------------------------------------------------------------ */

export interface DraftRow {
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
  problem: string | null;
  duplicate: boolean;
}

export function buildCustomerDrafts(
  sheet: ParsedSheet,
  mapping: Partial<Record<CustomerFieldKey, number>>,
  existingPhones: Set<string>
): DraftRow[] {
  const pick = (row: CellValue[], key: CustomerFieldKey): CellValue => {
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
   5. 消费记录：组装成待导入的行
   ------------------------------------------------------------------ */

export interface PurchaseDraftRow {
  lineNumber: number;
  /** 匹配到的客户，没匹配上就是 null */
  customerId: string | null;
  customerLabel: string;
  purchasedAt: string;
  amount: number;
  note: string;
  problem: string | null;
  /** 系统里已经有"同一位客户、同一天、同样金额"的记录 */
  duplicate: boolean;
}

export function buildPurchaseDrafts(
  sheet: ParsedSheet,
  mapping: Partial<Record<PurchaseFieldKey, number>>,
  customers: Customer[],
  purchases: Purchase[]
): PurchaseDraftRow[] {
  const pick = (row: CellValue[], key: PurchaseFieldKey): CellValue => {
    const index = mapping[key];
    if (index === undefined || index === null || index < 0) return null;
    return row[index] ?? null;
  };

  const byPhone = new Map<string, Customer[]>();
  const byName = new Map<string, Customer[]>();
  for (const customer of customers) {
    byPhone.set(customer.phone, [...(byPhone.get(customer.phone) ?? []), customer]);
    byName.set(customer.name, [...(byName.get(customer.name) ?? []), customer]);
  }

  return sheet.rows.map((row, position) => {
    const rawPhone = cellText(pick(row, "customerPhone")).replace(/[^0-9]/g, "");
    const rawName = cellText(pick(row, "customerName"));
    const purchasedAt = parseDateCell(pick(row, "purchasedAt")) ?? "";
    const amount = parseAmountCell(pick(row, "amount"));
    const note = cellText(pick(row, "note"));

    let matched: Customer | null = null;
    let label = rawName || rawPhone;
    let problem: string | null = null;

    if (rawPhone) {
      const hits = byPhone.get(rawPhone) ?? [];
      if (hits.length === 0) problem = "系统里没有这个手机号的客户";
      else {
        matched = hits[0];
        label = hits[0].name;
      }
    } else if (rawName) {
      const hits = byName.get(rawName) ?? [];
      if (hits.length === 0) problem = "系统里没有叫这个名字的客户";
      else if (hits.length > 1) problem = "有 " + hits.length + " 位同名客户，请改用手机号";
      else {
        matched = hits[0];
        label = hits[0].name;
      }
    } else {
      problem = "缺少客户手机号";
    }

    if (!problem && !purchasedAt) problem = "缺少消费日期";
    else if (!problem && amount <= 0) problem = "消费金额不对";

    const duplicate =
      !problem &&
      matched !== null &&
      purchases.some(
        (item) =>
          item.customerId === matched?.id &&
          item.purchasedAt === purchasedAt &&
          Math.abs(item.amount - amount) < 0.005
      );

    return {
      lineNumber: position + 2,
      customerId: matched ? matched.id : null,
      customerLabel: label,
      purchasedAt,
      amount,
      note,
      problem,
      duplicate,
    };
  });
}

/* ------------------------------------------------------------------
   6. 导入模板
   ------------------------------------------------------------------ */

function csvCell(text: string): string {
  if (/[",\n]/.test(text)) return '"' + text.replace(/"/g, '""') + '"';
  return text;
}

/** 客户资料的模板 */
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

  return "\uFEFF" + [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
}

/** 消费记录的模板 */
export function buildPurchaseTemplateCsv(): string {
  const headers = ["客户手机号", "客户姓名", "消费日期", "消费金额", "买了什么"];

  const rows = [
    ["13800001111", "张小雨", "2026-09-20", "1280", "秋季风衣"],
    ["13800001111", "张小雨", "2026-09-20", "420", "打底衫两件"],
    ["13800002222", "李可", "2026-08-15", "860", "连衣裙"],
  ];

  return "\uFEFF" + [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
}