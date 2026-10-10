"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Search,
  Trash2,
} from "lucide-react";
import type { CustomerWithSpending } from "@/lib/derived";
import { CUSTOMER_SOURCES, CUSTOMER_STATUSES } from "@/lib/constants";
import { useData } from "@/lib/store";
import { describeFollowUp, formatMoney, formatMonthDay } from "@/lib/utils";
import Avatar from "@/components/ui/Avatar";
import StatusBadge from "@/components/ui/StatusBadge";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

const ALL = "全部";
/** 一页显示多少位客户 */
const PAGE_SIZE = 20;

type SortKey = "recent" | "total";
type SortDir = "asc" | "desc";

/** 表头上的小排序符号：未排序时是浅灰的上下箭头 */
function SortIcon({ state }: { state: SortDir | null }) {
  if (state === "asc") return <ArrowUp size={13} className="text-ink" />;
  if (state === "desc") return <ArrowDown size={13} className="text-ink" />;
  return <ArrowUpDown size={13} className="text-ink-3 opacity-45" />;
}

/** 页码按钮该显示哪些：页数多的时候中间用省略号 */
function pageItems(current: number, total: number): (number | "gap")[] {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);

  const items: (number | "gap")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  if (start > 2) items.push("gap");
  for (let i = start; i <= end; i += 1) items.push(i);
  if (end < total - 1) items.push("gap");
  items.push(total);

  return items;
}

export default function CustomerTable({
  customers,
}: {
  customers: CustomerWithSpending[];
}) {
  const { trashCustomer } = useData();

  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<string>(ALL);
  const [source, setSource] = useState<string>(ALL);
  const [pendingTrash, setPendingTrash] = useState<CustomerWithSpending | null>(null);
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir } | null>(null);
  const [page, setPage] = useState(1);
  const [jumpValue, setJumpValue] = useState("");

  /** 点一下升序，再点一下降序，第三下恢复默认 */
  function toggleSort(key: SortKey) {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
    setPage(1);
  }

  const filtered = useMemo(() => {
    const text = keyword.trim();
    return customers.filter((customer) => {
      if (text && !customer.name.includes(text) && !customer.phone.includes(text)) return false;
      if (status !== ALL && customer.status !== status) return false;
      if (source !== ALL && customer.source !== source) return false;
      return true;
    });
  }, [customers, keyword, status, source]);

  /** 排序作用在全部筛选结果上，然后再分页——不是只排当前这一页 */
  const sorted = useMemo(() => {
    if (!sort) return filtered;

    const valueOf = (customer: CustomerWithSpending): number | null => {
      if (sort.key === "total") {
        return customer.spending.totalSpent > 0 ? customer.spending.totalSpent : null;
      }
      const date = customer.spending.lastPurchaseAt;
      if (!date) return null;
      // 2026-08-15 → 20260815，直接比大小就行
      return Number(date.replace(/-/g, ""));
    };

    const withData = filtered.filter((customer) => valueOf(customer) !== null);
    const withoutData = filtered.filter((customer) => valueOf(customer) === null);
    const factor = sort.dir === "asc" ? 1 : -1;

    withData.sort((a, b) => ((valueOf(a) as number) - (valueOf(b) as number)) * factor);

    // 没有消费记录的（表格里显示为「—」）永远排在最后
    return [...withData, ...withoutData];
  }, [filtered, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const from = sorted.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const to = Math.min(currentPage * PAGE_SIZE, sorted.length);

  function applyJump() {
    const text = jumpValue.trim();
    if (!text) return;
    const value = Number(text);
    if (Number.isNaN(value)) {
      setJumpValue("");
      return;
    }
    setPage(Math.min(Math.max(Math.round(value), 1), totalPages));
    setJumpValue("");
  }

  const statusOptions = [ALL, ...CUSTOMER_STATUSES];

  return (
    <div>
      {/* 搜索与筛选 */}
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <div className="relative sm:w-[300px]">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-3" />
            <input
              className="gc-input pl-10"
              placeholder="搜索姓名或手机号"
              value={keyword}
              onChange={(event) => {
                setKeyword(event.target.value);
                setPage(1);
              }}
            />
          </div>

          <select
            className="gc-input gc-select sm:w-[170px]"
            value={source}
            onChange={(event) => {
              setSource(event.target.value);
              setPage(1);
            }}
          >
            <option value={ALL}>全部来源</option>
            {CUSTOMER_SOURCES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        {/* 状态切换：类似苹果设置里的分段控件 */}
        <div className="inline-flex w-fit shrink-0 items-center rounded-full bg-[#f0f0f2] p-1">
          {statusOptions.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setStatus(item);
                setPage(1);
              }}
              className={
                "rounded-full px-3.5 py-1.5 text-[13px] font-medium transition " +
                (status === item
                  ? "bg-white text-ink shadow-[0_1px_2px_rgba(0,0,0,0.08)]"
                  : "text-ink-2 hover:text-ink")
              }
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="gc-card overflow-hidden">
        <div className="flex items-baseline justify-between px-6 pb-2 pt-6">
          <h2 className="gc-title-md">客户列表</h2>
          <span className="text-[13px] text-ink-3">共 {sorted.length} 位</span>
        </div>

        <div className="overflow-x-auto px-3 pb-2">
          <table className="gc-table min-w-[880px]">
            <thead>
              <tr>
                <th>客户</th>
                <th>手机号</th>
                <th>来源</th>
                <th>
                  <button
                    type="button"
                    onClick={() => toggleSort("recent")}
                    title="点击排序"
                    className="inline-flex cursor-pointer items-center gap-1 transition hover:text-ink"
                  >
                    最近消费
                    <SortIcon state={sort?.key === "recent" ? sort.dir : null} />
                  </button>
                </th>
                <th>
                  <button
                    type="button"
                    onClick={() => toggleSort("total")}
                    title="点击排序"
                    className="inline-flex cursor-pointer items-center gap-1 transition hover:text-ink"
                  >
                    累计消费
                    <SortIcon state={sort?.key === "total" ? sort.dir : null} />
                  </button>
                </th>
                <th>状态</th>
                <th>下次跟进</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-sm text-ink-3">
                    没有符合条件的客户，换个关键词试试。
                  </td>
                </tr>
              ) : (
                pageRows.map((customer) => (
                  <tr key={customer.id}>
                    <td data-label="客户">
                      <Link href={"/customers/" + customer.id} className="flex items-center gap-3">
                        <Avatar name={customer.name} size={34} />
                        <span>
                          <span className="block text-[15px] font-medium leading-tight">
                            {customer.name}
                          </span>
                          {customer.tags.length > 0 ? (
                            <span className="mt-1 block text-xs text-ink-3">
                              {customer.tags.join(" · ")}
                            </span>
                          ) : null}
                        </span>
                      </Link>
                    </td>
                    <td data-label="手机号" className="text-ink-2">
                      {customer.phone}
                    </td>
                    <td data-label="来源" className="text-ink-2">
                      {customer.source}
                    </td>
                    <td data-label="最近消费" className="text-ink-2">
                      {customer.spending.lastPurchaseAt
                        ? formatMonthDay(customer.spending.lastPurchaseAt)
                        : "—"}
                    </td>
                    <td data-label="累计消费" className="font-medium">
                      {customer.spending.totalSpent > 0
                        ? formatMoney(customer.spending.totalSpent)
                        : "—"}
                    </td>
                    <td data-label="状态">
                      <StatusBadge status={customer.status} />
                    </td>
                    <td data-label="下次跟进" className="text-ink-2">
                      {describeFollowUp(customer.nextFollowUpAt)}
                    </td>
                    <td data-label="操作" className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          aria-label="删除客户"
                          title="删除（会移入回收站）"
                          onClick={() => setPendingTrash(customer)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-ink-3 transition hover:bg-[#fdeceb] hover:text-[#c4300c]"
                        >
                          <Trash2 size={16} />
                        </button>
                        <Link
                          href={"/customers/" + customer.id}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-ink-3 transition hover:text-ink"
                          aria-label="查看客户详情"
                        >
                          <ChevronRight size={17} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 分页 */}
        {sorted.length > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-black/[0.06] px-6 py-4">
            <p className="text-[13px] text-ink-3">
              共 {sorted.length} 位 · 第 {from}–{to} 位
            </p>

            {totalPages > 1 ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="上一页"
                  disabled={currentPage === 1}
                  onClick={() => setPage(currentPage - 1)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-ink-2 transition hover:bg-canvas-2 disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <ChevronLeft size={16} />
                </button>

                {pageItems(currentPage, totalPages).map((item, index) =>
                  item === "gap" ? (
                    <span key={"gap-" + index} className="px-1 text-[13px] text-ink-3">
                      …
                    </span>
                  ) : (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setPage(item)}
                      className={
                        "inline-flex h-8 min-w-8 cursor-pointer items-center justify-center rounded-full px-2 text-[13px] font-medium transition " +
                        (currentPage === item
                          ? "bg-ink text-white"
                          : "text-ink-2 hover:bg-canvas-2")
                      }
                    >
                      {item}
                    </button>
                  )
                )}

                <button
                  type="button"
                  aria-label="下一页"
                  disabled={currentPage === totalPages}
                  onClick={() => setPage(currentPage + 1)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-ink-2 transition hover:bg-canvas-2 disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            ) : null}

            {totalPages > 1 ? (
              <div className="flex items-center gap-2 text-[13px] text-ink-3">
                <span>跳至</span>
                <input
                  className="gc-input w-[56px] px-2 py-1 text-center text-[13px]"
                  inputMode="numeric"
                  placeholder={String(currentPage)}
                  value={jumpValue}
                  onChange={(event) => setJumpValue(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      applyJump();
                    }
                  }}
                  onBlur={applyJump}
                />
                <span>页 · 共 {totalPages} 页</span>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <ConfirmDialog
        open={pendingTrash !== null}
        onClose={() => setPendingTrash(null)}
        onConfirm={() => {
          if (pendingTrash) trashCustomer(pendingTrash.id);
          setPendingTrash(null);
        }}
        title="把这位客户放进回收站？"
        description="放进回收站后，他不会再出现在列表和统计里。想找回来随时可以去回收站恢复。"
        confirmLabel="放进回收站"
        tone="danger"
      >
        <p className="text-[14px] leading-relaxed text-ink-2">
          {pendingTrash?.name} 名下还有
          <span className="font-medium text-ink">
            {" "}
            {pendingTrash?.spending.purchaseCount ?? 0} 笔消费记录
          </span>
          ，都会一起跟着进回收站。
        </p>
      </ConfirmDialog>
    </div>
  );
}