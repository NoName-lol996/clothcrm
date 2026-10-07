import type { CustomerStatus } from "@/lib/types";

// 不同阶段用不同颜色，一眼就能看出客户走到哪一步了
const STATUS_STYLE: Record<CustomerStatus, string> = {
  "新客户": "bg-[#e8f2fd] text-[#0066cc]",
  "跟进中": "bg-[#fff4e5] text-[#a86a00]",
  "已成交": "bg-[#e6f6ec] text-[#1a7f37]",
  "已流失": "bg-[#f0f0f2] text-[#6e6e73]",
};

export default function StatusBadge({ status }: { status: CustomerStatus }) {
  return (
    <span
      className={
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium " +
        STATUS_STYLE[status]
      }
    >
      {status}
    </span>
  );
}