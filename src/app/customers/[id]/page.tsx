import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MessageSquarePlus, Receipt } from "lucide-react";
import { getCustomerById } from "@/lib/data/customers";
import { getPurchases } from "@/lib/data/purchases";
import { getFollowUpsByCustomer, getSpending } from "@/lib/derived";
import {
  describeFollowUp,
  formatFullDate,
  formatMoney,
  formatMonthDay,
} from "@/lib/utils";
import Avatar from "@/components/ui/Avatar";
import StatusBadge from "@/components/ui/StatusBadge";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customer = getCustomerById(id);

  if (!customer) {
    notFound();
  }

  const spending = getSpending(customer.id);
  const followUps = getFollowUpsByCustomer(customer.id);
  const purchases = getPurchases()
    .filter((item) => item.customerId === customer.id)
    .sort((a, b) => (a.purchasedAt < b.purchasedAt ? 1 : -1));

  const profileRows = [
    { label: "性别", value: customer.gender },
    { label: "客户来源", value: customer.source },
    { label: "建档时间", value: formatFullDate(customer.createdAt) },
    { label: "下次跟进", value: describeFollowUp(customer.nextFollowUpAt) },
    {
      label: "最近消费",
      value: spending.lastPurchaseAt ? formatFullDate(spending.lastPurchaseAt) : "暂无消费",
    },
    { label: "累计消费", value: formatMoney(spending.totalSpent) },
    { label: "消费笔数", value: spending.purchaseCount + " 笔" },
  ];

  return (
    <div>
      <Link
        href="/customers"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-ink-2 transition hover:text-ink"
      >
        <ArrowLeft size={15} />
        返回客户列表
      </Link>

      {/* 客户头部信息 */}
      <div className="gc-card p-7">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="flex items-center gap-4">
            <Avatar name={customer.name} size={56} />
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="gc-title-lg">{customer.name}</h1>
                <StatusBadge status={customer.status} />
              </div>
              <p className="mt-2 text-sm text-ink-2">
                {customer.phone}
                <span className="mx-2 text-hairline">|</span>
                {customer.source}
              </p>
              {customer.tags.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {customer.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-canvas-2 px-3 py-1 text-xs text-ink-2"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 gap-3">
            <button type="button" className="gc-btn gc-btn-light">
              <Receipt size={15} />
              记一笔消费
            </button>
            <button type="button" className="gc-btn gc-btn-dark">
              <MessageSquarePlus size={15} />
              记录跟进
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {/* 左边：基本资料与备注 */}
        <div className="space-y-4">
          <section className="gc-card p-7">
            <h2 className="gc-title-md mb-4">基本资料</h2>
            <dl>
              {profileRows.map((row) => (
                <div
                  key={row.label}
                  className="flex items-baseline justify-between gap-4 border-t border-black/[0.06] py-3 first:border-t-0 first:pt-0"
                >
                  <dt className="shrink-0 text-[13px] text-ink-3">{row.label}</dt>
                  <dd className="text-right text-[14px] font-medium">{row.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="gc-card p-7">
            <h2 className="gc-title-md mb-4">备注</h2>
            <p className="text-[14px] leading-relaxed text-ink-2">
              {customer.note || "暂无备注"}
            </p>
          </section>
        </div>

        {/* 右边：跟进记录与消费记录 */}
        <div className="space-y-4 lg:col-span-2">
          <section className="gc-card p-7">
            <div className="mb-5 flex items-baseline justify-between">
              <h2 className="gc-title-md">跟进记录</h2>
              <span className="text-[13px] text-ink-3">共 {followUps.length} 次</span>
            </div>

            {followUps.length === 0 ? (
              <p className="py-10 text-center text-sm text-ink-3">
                还没有跟进记录，点右上角「记录跟进」开始。
              </p>
            ) : (
              <ol className="relative">
                {followUps.map((item, index) => (
                  <li key={item.id} className="relative flex gap-5 pb-7 last:pb-0">
                    {/* 时间轴的竖线与圆点 */}
                    <div className="relative flex w-3 shrink-0 justify-center">
                      <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-accent" />
                      {index < followUps.length - 1 ? (
                        <span className="absolute top-4 h-full w-px bg-black/[0.08]" />
                      ) : null}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-[13px] font-medium text-ink-2">
                          {formatFullDate(item.followedAt)}
                        </span>
                        <span className="rounded-full bg-canvas-2 px-2.5 py-1 text-xs text-ink-2">
                          {item.result}
                        </span>
                      </div>
                      <p className="mt-2 text-[14px] leading-relaxed">{item.content}</p>
                      {item.nextFollowUpAt ? (
                        <p className="mt-1.5 text-xs text-ink-3">
                          下次跟进：{formatFullDate(item.nextFollowUpAt)}
                        </p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="gc-card p-7">
            <div className="mb-5 flex items-baseline justify-between">
              <h2 className="gc-title-md">消费记录</h2>
              <span className="text-[13px] text-ink-3">
                累计 {formatMoney(spending.totalSpent)}
              </span>
            </div>

            {purchases.length === 0 ? (
              <p className="py-10 text-center text-sm text-ink-3">
                还没有消费记录。
              </p>
            ) : (
              <ul>
                {purchases.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-4 border-t border-black/[0.06] py-3.5 first:border-t-0 first:pt-0"
                  >
                    <div className="min-w-0">
                      <p className="text-[14px] font-medium">{formatMonthDay(item.purchasedAt)}</p>
                      <p className="mt-0.5 truncate text-xs text-ink-3">
                        {item.note || "未填写备注"}
                      </p>
                    </div>
                    <span className="shrink-0 text-[15px] font-semibold">
                      {formatMoney(item.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}