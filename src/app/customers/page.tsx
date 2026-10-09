"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Upload } from "lucide-react";
import { useData } from "@/lib/store";
import PageHeader from "@/components/ui/PageHeader";
import CustomerTable from "@/components/customers/CustomerTable";
import CustomerFormDialog from "@/components/customers/CustomerFormDialog";
import ImportDialog from "@/components/customers/ImportDialog";
import LoadingState from "@/components/ui/LoadingState";

export default function CustomersPage() {
  const { ready, customersWithSpending } = useData();
  const router = useRouter();

  const [newOpen, setNewOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  if (!ready) return <LoadingState />;

  return (
    <div>
      <PageHeader
        eyebrow="客户管理"
        title="客户档案"
        subtitle="门店所有客户的资料、消费与跟进情况都集中在这里。老客户也可以从表格批量导入。"
        action={
          <>
            <button
              type="button"
              className="gc-btn gc-btn-light"
              onClick={() => setImportOpen(true)}
            >
              <Upload size={15} />
              导入信息
            </button>
            <button type="button" className="gc-btn gc-btn-dark" onClick={() => setNewOpen(true)}>
              <Plus size={15} strokeWidth={2.4} />
              新增客户
            </button>
          </>
        }
      />

      <CustomerTable customers={customersWithSpending} />

      <CustomerFormDialog
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onSaved={(id) => router.push("/customers/" + id)}
      />

      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}