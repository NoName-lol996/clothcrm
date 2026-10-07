import { getCustomersWithSpending } from "@/lib/derived";
import PageHeader from "@/components/ui/PageHeader";
import CustomerTable from "@/components/customers/CustomerTable";

export default function CustomersPage() {
  const customers = getCustomersWithSpending();

  return (
    <div>
      <PageHeader
        eyebrow="客户管理"
        title="客户档案"
        subtitle="门店所有客户的资料、消费与跟进情况都集中在这里。新增客户请点右上角的按钮。"
      />
      <CustomerTable customers={customers} />
    </div>
  );
}