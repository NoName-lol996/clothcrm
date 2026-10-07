import { getCustomersWithSpending, getDueCustomers } from "@/lib/derived";
import { getFollowUps } from "@/lib/data/follow-ups";
import PageHeader from "@/components/ui/PageHeader";
import FollowUpBoard, { type FollowUpRecord } from "@/components/follow-ups/FollowUpBoard";

export default function FollowUpsPage() {
  const dueCustomers = getDueCustomers();

  const nameById = new Map(
    getCustomersWithSpending().map((customer) => [customer.id, customer])
  );

  const records: FollowUpRecord[] = getFollowUps()
    .slice()
    .sort((a, b) => (a.followedAt < b.followedAt ? 1 : -1))
    .map((item) => ({
      ...item,
      customerName: nameById.get(item.customerId)?.name ?? "未知客户",
      customerStatus: nameById.get(item.customerId)?.status ?? "",
    }));

  return (
    <div>
      <PageHeader
        eyebrow="跟进管理"
        title="跟进任务"
        subtitle="把客户的每一次联系都记下来，下次该找谁系统会提醒你。"
      />
      <FollowUpBoard dueCustomers={dueCustomers} records={records} />
    </div>
  );
}