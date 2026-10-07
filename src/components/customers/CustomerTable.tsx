"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";
import type { CustomerWithSpending } from "@/lib/derived";
import { CUSTOMER_SOURCES, CUSTOMER_STATUSES } from "@/lib/constants";
import { describeFollowUp, formatMoney, formatMonthDay } from "@/lib/utils";
import Avatar from "@/components/ui/Avatar";
import StatusBadge from "@/components/ui/StatusBadge";

const ALL = "全部";

export default function CustomerTable({
  customers,
}: {
  customers: CustomerWithSpending[];
}) {
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<string>(ALL);
  const [source, setSource] = useState<string>(ALL);

  const filtered = useMemo(() => {
    const key = keyword.trim();
    return customers.filter((customer) => {
      if (key && !customer.name.includes(key) && !customer.phone.includes(key)) return false;
      if (status !== ALL && customer.status !== status) return false;
      if (source !== ALL && customer.source !== source) return false;
      return true;
    });
  }, [customers, keyword, status, source]);

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
              onChange={(event) => setKeyword(event.target.value)}
            />
          </div>

          <select
            className="gc-input sm:w-[170px]"
            value={source}
            onChange={(event) => setSource(event.target.value)}
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
              onClick={() => setStatus(item)}
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
          <span className="text-[13px] text-ink-3">共 {filtered.length} 位</span>
        </div>

        <div className="overflow-x-auto px-3 pb-4">
          <table className="gc-table min-w-[860px]">
            <thead>
              <tr>
                <th>客户</th>
                <th>手机号</th>
                <th>来源</th>
                <th>最近消费</th>
                <th>累计消费</th>
                <th>状态</th>
                <th>下次跟进</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-sm text-ink-3">
                    没有符合条件的客户，换个关键词试试。
                  </td>
                </tr>
              ) : (
                filtered.map((customer) => (
                  <tr key={customer.id}>
                    <td>
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
                    <td className="text-ink-2">{customer.phone}</td>
                    <td className="text-ink-2">{customer.source}</td>
                    <td className="text-ink-2">
                      {customer.spending.lastPurchaseAt
                        ? formatMonthDay(customer.spending.lastPurchaseAt)
                        : "—"}
                    </td>
                    <td className="font-medium">
                      {customer.spending.totalSpent > 0
                        ? formatMoney(customer.spending.totalSpent)
                        : "—"}
                    </td>
                    <td>
                      <StatusBadge status={customer.status} />
                    </td>
                    <td className="text-ink-2">{describeFollowUp(customer.nextFollowUpAt)}</td>
                    <td className="text-right">
                      <Link
                        href={"/customers/" + customer.id}
                        className="inline-flex text-ink-3 transition hover:text-ink"
                        aria-label="查看客户详情"
                      >
                        <ChevronRight size={17} />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}