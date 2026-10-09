"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useData } from "@/lib/store";

const NAV_ITEMS = [
  { href: "/dashboard", label: "数据概览" },
  { href: "/customers", label: "客户管理" },
  { href: "/follow-ups", label: "跟进管理" },
  { href: "/trash", label: "回收站" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { restoreDemoData, trashedCustomers } = useData();

  const [resetOpen, setResetOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const trashCount = trashedCustomers.length;

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
                className="gc-nav-link inline-flex items-center"
                data-active={isActive(item.href)}
              >
                {item.label}
                {item.href === "/trash" && trashCount > 0 ? (
                  <span className="ml-1.5 inline-flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-[#c4300c] px-1 text-[10px] font-semibold text-white">
                    {trashCount}
                  </span>
                ) : null}
              </Link>
            ))}
          </nav>
        </div>

        {/* 手机上把导航横过来，左右滑动即可 */}
        <nav className="flex items-center gap-7 overflow-x-auto px-6 pb-3 md:hidden">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="gc-nav-link inline-flex items-center"
              data-active={isActive(item.href)}
            >
              {item.label}
              {item.href === "/trash" && trashCount > 0 ? (
                <span className="ml-1.5 inline-flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-[#c4300c] px-1 text-[10px] font-semibold text-white">
                  {trashCount}
                </span>
              ) : null}
            </Link>
          ))}
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

      <ConfirmDialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirm={() => {
          restoreDemoData();
          setResetOpen(false);
          router.push("/dashboard");
        }}
        title="恢复成一开始的演示数据？"
        description="现在录入的所有客户、跟进和消费记录都会被替换掉，无法恢复。"
        confirmLabel="确认恢复"
        tone="danger"
      >
        <p className="text-[14px] leading-relaxed text-ink-2">
          如果你只是想试试各种操作、又怕把演示数据弄乱，用这个按钮一键还原就好。
        </p>
      </ConfirmDialog>
    </div>
  );
}