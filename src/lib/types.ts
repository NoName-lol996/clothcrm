// 整个项目的数据结构定义。
// 如果以后想加字段（比如客户生日），只需要改这里，其他地方会有提示。

/** 性别 */
export type Gender = "女" | "男" | "未知";

/** 客户所处阶段 */
export type CustomerStatus = "新客户" | "跟进中" | "已成交" | "已流失";

/** 一位客户 */
export interface Customer {
  id: string;
  /** 姓名 */
  name: string;
  /** 手机号 */
  phone: string;
  gender: Gender;
  /** 客户来源，例如「小红书」「老客转介绍」 */
  source: string;
  /** 标签，例如「高消费」「喜欢新款」 */
  tags: string[];
  status: CustomerStatus;
  /** 下次跟进时间，格式 2026-10-07；没有计划时为 null */
  nextFollowUpAt: string | null;
  /** 备注 */
  note: string;
  /** 建档时间 */
  createdAt: string;
}

/** 一次跟进记录 */
export interface FollowUp {
  id: string;
  customerId: string;
  /** 跟进日期 */
  followedAt: string;
  /** 跟进内容 */
  content: string;
  /** 跟进结果 */
  result: string;
  /** 本次跟进后约定的下次联系时间 */
  nextFollowUpAt: string | null;
}

/** 一笔消费记录 */
export interface Purchase {
  id: string;
  customerId: string;
  /** 消费日期 */
  purchasedAt: string;
  /** 消费金额（元） */
  amount: number;
  /** 备注，例如「秋季风衣 + 打底衫」 */
  note: string;
}

/** 客户的消费情况汇总（由消费记录自动算出，不需要手工填写） */
export interface CustomerSpending {
  /** 最近一次消费时间 */
  lastPurchaseAt: string | null;
  /** 累计消费金额 */
  totalSpent: number;
  /** 消费笔数 */
  purchaseCount: number;
}