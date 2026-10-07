"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { CustomerWithSpending } from "@/lib/derived";
import type { FollowUp } from "@/lib/types";
import { describeFollowUp, formatFullDate, formatMonthDay } from "@/lib/utils";
import Avatar from "@/components/ui/Avatar";
import StatusBadge from "@/components/ui/StatusBadge";

export interface FollowUpRecord extends FollowUp {
  customerName: string;
  customerStatus: string;
}

export default function FollowUpBoard({
  dueCustomers,
  records,
}: {
  dueCustomers: CustomerWithSpending[];
  records: FollowUpRecord[];
}) {
  const [tab, setTab] = useState<"due" | "all">("due");

  const tabs = [
    { key: "due" as const, label: "今天要跟进", count: dueCustomers.length },
    { key: "all" as const, label: "全部跟进记录", count: records.length },
  ];

  return (
    <div>
      <div className="mb-5 inline-flex items-center rounded-full bg-[#f0f0f2] p-1">
        {tabs.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={
              "rounded-full px-4 py-2 text-[13px] font-medium transition " +
              (tab === item.key
                ? "bg-white text-ink shadow-[0_1px_2px_rgba(0,0,0,0.08)]"
                : "text-ink-2 hover:text-ink")
            }
          >
            {item.label}
            <span className="ml-1.5 text-ink-3">{item.count}</span>
          </button>
        ))}
      </div>

      {tab === "due" ? (
        <div className="gc-card overflow-hidden">
          <div className="px-6 pb-2 pt-6">
            <h2 className="gc-title-md">今天要跟进的客户</h2>
            <p className="mt-1.5 text-[13px] text-ink-3">
              按照约定的时间排序，越靠前越紧急。
            </p>
          </div>

          {dueCustomers.length === 0 ? (
            <p className="px-6 py-16 text-center text-sm text-ink-3">
              今天没有需要跟进的客户。
            </p>
          ) : (
            <ul className="px-3 pb-4">
              {dueCustomers.map((customer) => (
                <li key={customer.id}>
                  <Link
                    href={"/customers/" + customer.id}
                    className="flex items-center gap-4 rounded-2xl px-3 py-3.5 transition hover:bg-canvas-2"
                  >
                    <Avatar name={customer.name} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-[15px] font-medium">{customer.name}</span>
                        <StatusBadge status={customer.status} />
                      </div>
                      <p className="mt-0.5 truncate text-xs text-ink-3">
                        {customer.phone}
                        {customer.tags.length > 0 ? " · " + customer.tags.join(" / ") : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-[13px] font-medium text-[#c4300c]">
                      {describeFollowUp(customer.nextFollowUpAt)}
                    </span>
                    <ChevronRight size={17} className="shrink-0 text-ink-3" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="gc-card overflow-hidden">
          <div className="px-6 pb-2 pt-6">
            <h2 className="gc-title-md">全部跟进记录</h2>
            <p className="mt-1.5 text-[13px] text-ink-3">按跟进时间从近到远排列。</p>
          </div>

          <ul className="px-3 pb-4">
            {records.map((record) => (
              <li key={record.id}>
                <Link
                  href={"/customers/" + record.customerId}
                  className="block rounded-2xl px-3 py-3.5 transition hover:bg-canvas-2"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-[86px] shrink-0 text-[13px] text-ink-3">
                      {formatMonthDay(record.followedAt)}
                    </span>
                    <span className="truncate text-[15px] font-medium">
                      {record.customerName}
                    </span>
                    <span className="ml-auto shrink-0 text-[13px] text-ink-2">
                      {record.result}
                    </span>
                  </div>
                  <p className="mt-2 pl-[98px] text-[13px] leading-relaxed text-ink-2">
                    {record.content}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}