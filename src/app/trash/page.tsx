"use client";

import { useData } from "@/lib/store";
import PageHeader from "@/components/ui/PageHeader";
import TrashList from "@/components/customers/TrashList";
import LoadingState from "@/components/ui/LoadingState";

export default function TrashPage() {
  const { ready, trashedCustomers } = useData();

  if (!ready) return <LoadingState />;

  return (
    <div>
      <PageHeader
        eyebrow="回收站"
        title="已删除的客户"
        subtitle={
          trashedCustomers.length > 0
            ? "删除的客户会先放在这里，想找回来随时点恢复。"
            : undefined
        }
      />
      <TrashList />
    </div>
  );
}