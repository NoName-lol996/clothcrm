"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

const STORAGE_KEY = "clothcrm.welcome.dismissed";

/**
 * 第一次打开时的一句说明。
 * 点过「知道了」之后就不再出现。
 */
export default function WelcomeCard() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_KEY) !== "1") setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  function dismiss() {
    setVisible(false);
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // 存不进去也没关系，下次再显示一次而已
    }
  }

  if (!visible) return null;

  return (
    <div className="relative mb-6 rounded-[20px] bg-[#eef5ff] p-6 pr-14 md:p-7 md:pr-16">
      <button
        type="button"
        onClick={dismiss}
        aria-label="关闭说明"
        className="absolute right-5 top-5 inline-flex h-8 w-8 items-center justify-center rounded-full text-[#4a5f7a] transition hover:bg-white/70"
      >
        <X size={17} />
      </button>

      <p className="text-[15px] font-semibold text-[#123a5f]">
        这是 ClothCRM 的演示版
      </p>

      <p className="mt-2 max-w-[680px] text-[13px] leading-relaxed text-[#33506e]">
        一个给服装门店用的客户管理与跟进工具。你可以随便点、随便改——所有改动只保存在你自己的浏览器里，
        不会影响别人，也不会丢。
      </p>

      <p className="mt-2 max-w-[680px] text-[13px] leading-relaxed text-[#33506e]">
        不知道从哪开始的话，先看首页的「今天要联系的客户」，随便点开一位，
        试试给他记一次跟进——数字会跟着一起变。
      </p>

      <button
        type="button"
        onClick={dismiss}
        className="gc-btn gc-btn-sm mt-4 bg-[#123a5f] text-white transition hover:bg-[#1b4d7a]"
      >
        知道了
      </button>
    </div>
  );
}