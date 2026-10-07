// 这里是「算出来的数据」。
// 累计消费、最近消费时间、本月销售额这些都不需要手工填，全部由这里自动计算。

import { getCustomers } from "./data/customers";
import { getFollowUps } from "./data/follow-ups";
import { getPurchases } from "./data/purchases";
import type { Customer, CustomerSpending, FollowUp } from "./types";
import { daysFromToday, isThisMonth } from "./utils";

/** 客户 + 他的消费情况 */
export interface CustomerWithSpending extends Customer {
  spending: CustomerSpending;
}

/** 算某一位客户的消费情况 */
export function getSpending(customerId: string): CustomerSpending {
  const purchases = getPurchases().filter((p) => p.customerId === customerId);

  const sorted = [...purchases].sort((a, b) =>
    a.purchasedAt < b.purchasedAt ? 1 : -1
  );

  return {
    lastPurchaseAt: sorted.length > 0 ? sorted[0].purchasedAt : null,
    totalSpent: purchases.reduce((sum, p) => sum + p.amount, 0),
    purchaseCount: purchases.length,
  };
}

/** 所有客户，附带消费情况 */
export function getCustomersWithSpending(): CustomerWithSpending[] {
  return getCustomers().map((customer) => ({
    ...customer,
    spending: getSpending(customer.id),
  }));
}

/** 判断一位客户今天是否需要跟进 */
export function needsFollowUp(customer: Customer): boolean {
  if (customer.status === "已流失") return false;
  const days = daysFromToday(customer.nextFollowUpAt);
  return days !== null && days <= 0;
}

/** 今天该跟进的客户，最紧急的排在最前面 */
export function getDueCustomers(): CustomerWithSpending[] {
  return getCustomersWithSpending()
    .filter((customer) => needsFollowUp(customer))
    .sort((a, b) => {
      const left = a.nextFollowUpAt ?? "";
      const right = b.nextFollowUpAt ?? "";
      return left < right ? -1 : 1;
    });
}

/** 某位客户的跟进记录，最新的在最上面 */
export function getFollowUpsByCustomer(customerId: string): FollowUp[] {
  return getFollowUps()
    .filter((item) => item.customerId === customerId)
    .sort((a, b) => (a.followedAt < b.followedAt ? 1 : -1));
}

/** 首页上的 5 个核心数字 */
export interface DashboardStats {
  totalCustomers: number;
  newThisMonth: number;
  dealThisMonth: number;
  revenueThisMonth: number;
  needFollowUp: number;
}

export function getDashboardStats(): DashboardStats {
  const customers = getCustomers();
  const monthPurchases = getPurchases().filter((p) => isThisMonth(p.purchasedAt));

  return {
    totalCustomers: customers.length,
    newThisMonth: customers.filter((c) => isThisMonth(c.createdAt)).length,
    dealThisMonth: new Set(monthPurchases.map((p) => p.customerId)).size,
    revenueThisMonth: monthPurchases.reduce((sum, p) => sum + p.amount, 0),
    needFollowUp: customers.filter(needsFollowUp).length,
  };
}