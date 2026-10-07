"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "数据概览" },
  { href: "/customers", label: "客户管理" },
  { href: "/follow-ups", label: "跟进管理" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

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
            <Link href="/customers?new=1" className="gc-btn gc-btn-dark hidden md:inline-flex">
              <Plus size={15} strokeWidth={2.4} />
              新增客户
            </Link>
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
        </nav>
      </header>

      <main className="mx-auto w-full max-w-[1120px] flex-1 px-6 py-10 md:py-14">
        {children}
      </main>

      <footer className="mx-auto w-full max-w-[1120px] px-6 pb-10 pt-4">
        <div className="border-t border-black/[0.08] pt-5 text-xs leading-relaxed text-ink-3">
          ClothCRM · 服装门店客户管理与跟进工具
          <span className="mx-2 text-hairline">|</span>
          当前为演示数据，可自由试用
        </div>
      </footer>
    </div>
  );
}