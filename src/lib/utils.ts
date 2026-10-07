// 通用小工具：日期、金额的显示格式

/** 把 Date 转成 2026-10-07 这种格式 */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return y + "-" + m + "-" + d;
}

/** 今天的日期字符串 */
export function todayKey(): string {
  return toDateKey(new Date());
}

/** 把 2026-10-07 显示成 10月7日 */
export function formatMonthDay(dateKey: string): string {
  const parts = dateKey.split("-");
  if (parts.length !== 3) return dateKey;
  return Number(parts[1]) + "月" + Number(parts[2]) + "日";
}

/** 把 2026-10-07 显示成 2026年10月7日 */
export function formatFullDate(dateKey: string): string {
  const parts = dateKey.split("-");
  if (parts.length !== 3) return dateKey;
  return parts[0] + "年" + Number(parts[1]) + "月" + Number(parts[2]) + "日";
}

/** 距今天还有几天：负数表示已经过期，0 表示今天，正数表示未来 */
export function daysFromToday(dateKey: string | null): number | null {
  if (!dateKey) return null;
  const target = new Date(dateKey + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

/** 把跟进的紧迫程度翻译成一句人话 */
export function describeFollowUp(dateKey: string | null): string {
  if (!dateKey) return "未安排";
  const days = daysFromToday(dateKey);
  if (days === null) return "未安排";
  if (days < 0) return "已逾期 " + Math.abs(days) + " 天";
  if (days === 0) return "今天要跟进";
  if (days === 1) return "明天跟进";
  if (days <= 7) return days + " 天后跟进";
  return formatMonthDay(dateKey);
}

/** 金额显示：1280 -> ¥1,280 */
export function formatMoney(amount: number): string {
  return "¥" + amount.toLocaleString("zh-CN");
}

/** 金额显示（不带符号）：1280 -> 1,280 */
export function formatNumber(amount: number): string {
  return amount.toLocaleString("zh-CN");
}

/** 判断某个日期是否落在本月 */
export function isThisMonth(dateKey: string): boolean {
  const now = new Date();
  const prefix = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
  return dateKey.startsWith(prefix);
}

/** 取本月的第一天，格式 2026-10-01 */
export function firstDayOfThisMonth(): string {
  const now = new Date();
  return now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-01";
}

/** 今天显示成「10月7日 星期三」 */
export function formatTodayLong(): string {
  const now = new Date();
  const weekdays = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
  return (now.getMonth() + 1) + "月" + now.getDate() + "日 " + weekdays[now.getDay()];
}