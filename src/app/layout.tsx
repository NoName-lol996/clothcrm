import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/components/layout/AppShell";
import { DataProvider } from "@/lib/store";

export const metadata: Metadata = {
  title: "ClothCRM · 服装门店客户管理",
  description: "面向中小型服装门店的客户管理与跟进工具",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>
        <DataProvider>
          <AppShell>{children}</AppShell>
        </DataProvider>
      </body>
    </html>
  );
}