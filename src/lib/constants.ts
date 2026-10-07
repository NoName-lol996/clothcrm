// 项目里用到的固定选项，集中放在这里，方便以后统一修改。

import type { CustomerStatus, Gender } from "./types";

/** 客户来源 */
export const CUSTOMER_SOURCES = [
  "到店自然客流",
  "老客转介绍",
  "微信",
  "小红书",
  "抖音",
  "朋友圈",
  "线下活动",
  "其他",
] as const;

/** 性别选项 */
export const GENDERS: Gender[] = ["女", "男", "未知"];

/** 客户阶段 */
export const CUSTOMER_STATUSES: CustomerStatus[] = [
  "新客户",
  "跟进中",
  "已成交",
  "已流失",
];

/** 跟进结果（可自由填写，这里给几个常用选项） */
export const FOLLOW_UP_RESULTS = [
  "已加微信",
  "有兴趣，待考虑",
  "已邀约到店",
  "已成交",
  "暂时不需要",
  "联系不上",
] as const;

/** 常用标签 */
export const PRESET_TAGS = [
  "高消费",
  "价格敏感",
  "喜欢新款",
  "回头客",
  "职场女性",
  "宝妈",
  "学生",
] as const;

/** 门店名称，用于页面标题 */
export const STORE_NAME = "ClothCRM";