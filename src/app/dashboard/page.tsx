"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { dashboardStats, dueCustomers } from "@/lib/derived";
import { useData } from "@/lib/store";
import { describeFollowUp, formatMoney, formatNumber, formatTodayLong } from "@/lib/utils";
import Avatar from "@/components/ui/Avatar";
import StatusBadge from "@/components/ui/StatusBadge";
import LoadingState from "@/components/ui/LoadingState";

export default function DashboardPage() {
  const { ready, customers, purchases } = useData();

  if (!ready) return <LoadingState />;

  const stats = dashboardStats(customers, purchases);
  const due = dueCustomers(customers, purchases);

  const metrics = [
    { label: "客户总数", value: formatNumber(stats.totalCustomers), unit: "位", hint: "累计建档客户" },
    { label: "本月新增客户", value: formatNumber(stats.newThisMonth), unit: "位", hint: "本月新建档" },
    { label: "本月成交客户", value: formatNumber(stats.dealThisMonth), unit: "位", hint: "本月有消费的客户" },
    { label: "本月销售金额", value: formatMoney(stats.revenueThisMonth), unit: "", hint: "本月消费合计" },
  ];

  const previewNames = due.slice(0, 6);

  return (
    <div>
      <div className="mb-8">
        <p className="gc-eyebrow mb-3">今天 · {formatTodayLong()}</p>
        <h1 className="gc-title-xl">门店概况</h1>
        <p className="gc-subtitle mt-3 max-w-[560px]">
          一眼看清这个月的经营情况，以及今天需要联系的客户。
        </p>
      </div>

      {/* 四个核心数字 */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((item) => (
          <div key={item.label} className="gc-card p-7">
            <p className="text-[13px] font-medium text-ink-2">{item.label}</p>
            <p className="gc-metric mt-4">
              {item.value}
              {item.unit ? (
                <span className="ml-1 text-[15px] font-medium text-ink-3">{item.unit}</span>
              ) : null}
            </p>
            <p className="mt-2 text-xs text-ink-3">{item.hint}</p>
          </div>
        ))}
      </section>

      {/* 待跟进：左边的大卡片 + 右边的名单 */}
      <section className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col justify-between rounded-[20px] bg-ink p-7 text-white lg:col-span-1">
          <div>
            <p className="text-[13px] font-medium text-white/60">待跟进客户</p>
            <p className="gc-metric mt-4">
              {formatNumber(stats.needFollowUp)}
              <span className="ml-1 text-[15px] font-medium text-white/60">位</span>
            </p>
            <p className="mt-2 text-xs text-white/50">包含今天到期与已经逾期的客户</p>

            {previewNames.length > 0 ? (
              <div className="mt-6 flex items-center gap-3">
                <div className="flex -space-x-2">
                  {previewNames.map((item) => (
                    <span
                      key={item.id}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-xs font-medium text-white ring-2 ring-[#1d1d1f]"
                    >
                      {item.name.slice(0, 1)}
                    </span>
                  ))}
                </div>
                {due.length > previewNames.length ? (
                  <span className="text-xs text-white/50">+{due.length - previewNames.length}</span>
                ) : null}
              </div>
            ) : null}
          </div>

          <Link
            href="/follow-ups"
            className="mt-8 inline-flex w-fit items-center gap-2 rounded-full bg-white/15 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/25"
          >
            去跟进
            <ArrowRight size={15} />
          </Link>
        </div>

        <div className="gc-card p-7 lg:col-span-2">
          <div className="mb-5 flex items-baseline justify-between">
            <h2 className="gc-title-md">今天要联系的客户</h2>
            <span className="text-[13px] text-ink-3">共 {due.length} 位</span>
          </div>

          {due.length === 0 ? (
            <p className="py-10 text-center text-sm text-ink-3">
              今天没有需要跟进的客户，可以放心休息一下。
            </p>
          ) : (
            <ul className="-mx-2">
              {due.slice(0, 5).map((item) => (
                <li key={item.id}>
                  <Link
                    href={"/customers/" + item.id}
                    className="flex items-center gap-4 rounded-2xl px-2 py-3 transition hover:bg-canvas-2"
                  >
                    <Avatar name={item.name} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-[15px] font-medium">{item.name}</span>
                        <StatusBadge status={item.status} />
                      </div>
                      <p className="mt-0.5 truncate text-xs text-ink-3">
                        {item.phone}
                        {item.tags.length > 0 ? " · " + item.tags.join(" / ") : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-[13px] font-medium text-[#c4300c]">
                      {describeFollowUp(item.nextFollowUpAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {due.length > 5 ? (
            <Link
              href="/follow-ups"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
            >
              查看全部 {due.length} 位
              <ArrowRight size={14} />
            </Link>
          ) : null}
        </div>
      </section>
    </div>
  );
}