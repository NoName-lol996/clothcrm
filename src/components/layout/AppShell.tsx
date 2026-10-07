"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import CustomerFormDialog from "@/components/customers/CustomerFormDialog";
import Modal from "@/components/ui/Modal";
import { useData } from "@/lib/store";

const NAV_ITEMS = [
  { href: "/dashboard", label: "数据概览" },
  { href: "/customers", label: "客户管理" },
  { href: "/follow-ups", label: "跟进管理" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { restoreDemoData } = useData();

  const [newCustomerOpen, setNewCustomerOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 gc-nav">
        <div className="mx-auto flex h-12 w-full max-w-[1120px] items-center gap-10 px-6">
          <Link href="/dashboard" className="gc-brand">
            ClothCRM
          </Link>

          <nav className="hidden flex-1 items-center gap-9 md:flex">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="gc-nav-link"
                data-active={isActive(item.href)}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <button
              type="button"
              onClick={() => setNewCustomerOpen(true)}
              className="gc-btn gc-btn-dark hidden md:inline-flex"
            >
              <Plus size={15} strokeWidth={2.4} />
              新增客户
            </button>
          </div>
        </div>

        {/* 手机上把导航横过来，左右滑动即可 */}
        <nav className="flex items-center gap-7 overflow-x-auto px-6 pb-3 md:hidden">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="gc-nav-link"
              data-active={isActive(item.href)}
            >
              {item.label}
            </Link>
          ))}
          <button
            type="button"
            onClick={() => setNewCustomerOpen(true)}
            className="gc-nav-link shrink-0 font-medium text-accent"
          >
            + 新增客户
          </button>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-[1120px] flex-1 px-6 py-10 md:py-14">
        {children}
      </main>

      <footer className="mx-auto w-full max-w-[1120px] px-6 pb-10 pt-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-black/[0.08] pt-5 text-xs leading-relaxed text-ink-3">
          <span>ClothCRM · 服装门店客户管理与跟进工具</span>
          <span className="text-hairline">|</span>
          <span>数据保存在这台电脑的浏览器里</span>
          <span className="text-hairline">|</span>
          <button
            type="button"
            onClick={() => setResetOpen(true)}
            className="text-ink-3 underline decoration-dotted underline-offset-2 transition hover:text-ink"
          >
            恢复演示数据
          </button>
        </div>
      </footer>

      <CustomerFormDialog
        open={newCustomerOpen}
        onClose={() => setNewCustomerOpen(false)}
        onSaved={(id) => router.push("/customers/" + id)}
      />

      <Modal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="恢复成一开始的演示数据？"
        description="现在录入的所有客户、跟进和消费记录都会被替换掉，无法恢复。"
        width={460}
        footer={
          <>
            <button type="button" className="gc-btn gc-btn-light" onClick={() => setResetOpen(false)}>
              取消
            </button>
            <button
              type="button"
              className="gc-btn"
              style={{ backgroundColor: "#c4300c", color: "#fff" }}
              onClick={() => {
                restoreDemoData();
                setResetOpen(false);
                router.push("/dashboard");
              }}
            >
              确认恢复
            </button>
          </>
        }
      >
        <p className="text-[14px] leading-relaxed text-ink-2">
          如果你只是想试试各种操作、又怕把演示数据弄乱，用这个按钮一键还原就好。
        </p>
      </Modal>
    </div>
  );
}