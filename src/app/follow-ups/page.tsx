"use client";

import { useMemo } from "react";
import { dueCustomers } from "@/lib/derived";
import { useData } from "@/lib/store";
import PageHeader from "@/components/ui/PageHeader";
import FollowUpBoard, { type FollowUpRecord } from "@/components/follow-ups/FollowUpBoard";
import LoadingState from "@/components/ui/LoadingState";

export default function FollowUpsPage() {
  const { ready, customers, purchases, followUps } = useData();

  const due = useMemo(
    () => dueCustomers(customers, purchases),
    [customers, purchases]
  );

  const records = useMemo(() => {
    const byId = new Map(customers.map((item) => [item.id, item]));
    return followUps
      .slice()
      .sort((a, b) => (a.followedAt < b.followedAt ? 1 : -1))
      .map<FollowUpRecord>((item) => ({
        ...item,
        customerName: byId.get(item.customerId)?.name ?? "已删除的客户",
        customerStatus: byId.get(item.customerId)?.status ?? "",
      }));
  }, [customers, followUps]);

  if (!ready) return <LoadingState />;

  return (
    <div>
      <PageHeader
        eyebrow="跟进管理"
        title="跟进任务"
        subtitle="把客户的每一次联系都记下来，下次该找谁系统会提醒你。"
      />
      <FollowUpBoard dueCustomers={due} records={records} />
    </div>
  );
}