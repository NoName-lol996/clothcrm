// 这里是「算出来的数据」。
// 全是纯函数：给它数据，它给你结果，不关心数据存在哪里。
// 累计消费、最近消费时间、本月销售额都由这里自动计算，不需要手工填。

import type { Customer, CustomerSpending, CustomerStatus, FollowUp, Purchase } from "./types";
import { daysFromToday, isThisMonth } from "./utils";

/** 客户 + 他的消费情况 */
export interface CustomerWithSpending extends Customer {
  spending: CustomerSpending;
}

/** 算某一位客户的消费情况 */
export function computeSpending(purchases: Purchase[], customerId: string): CustomerSpending {
  const list = purchases.filter((item) => item.customerId === customerId);
  const sorted = [...list].sort((a, b) => (a.purchasedAt < b.purchasedAt ? 1 : -1));

  return {
    lastPurchaseAt: sorted.length > 0 ? sorted[0].purchasedAt : null,
    totalSpent: list.reduce((sum, item) => sum + item.amount, 0),
    purchaseCount: list.length,
  };
}

/** 给所有客户补上消费情况 */
export function withSpending(
  customers: Customer[],
  purchases: Purchase[]
): CustomerWithSpending[] {
  return customers.map((customer) => ({
    ...customer,
    spending: computeSpending(purchases, customer.id),
  }));
}

/** 判断一位客户今天是否需要跟进 */
export function needsFollowUp(customer: Customer): boolean {
  if (customer.status === "已流失") return false;
  const days = daysFromToday(customer.nextFollowUpAt);
  return days !== null && days <= 0;
}

/** 今天该跟进的客户，最紧急的排在最前面 */
export function dueCustomers(
  customers: Customer[],
  purchases: Purchase[]
): CustomerWithSpending[] {
  return withSpending(customers, purchases)
    .filter((customer) => needsFollowUp(customer))
    .sort((a, b) => {
      const left = a.nextFollowUpAt ?? "";
      const right = b.nextFollowUpAt ?? "";
      return left < right ? -1 : 1;
    });
}

/** 某位客户的跟进记录，最新的在最上面 */
export function followUpsOf(followUps: FollowUp[], customerId: string): FollowUp[] {
  return followUps
    .filter((item) => item.customerId === customerId)
    .sort((a, b) => (a.followedAt < b.followedAt ? 1 : -1));
}

/** 某位客户的消费记录，最新的在最上面 */
export function purchasesOf(purchases: Purchase[], customerId: string): Purchase[] {
  return purchases
    .filter((item) => item.customerId === customerId)
    .sort((a, b) => (a.purchasedAt < b.purchasedAt ? 1 : -1));
}

/** 首页上的 5 个核心数字 */
export interface DashboardStats {
  totalCustomers: number;
  newThisMonth: number;
  dealThisMonth: number;
  revenueThisMonth: number;
  needFollowUp: number;
}

export function dashboardStats(
  customers: Customer[],
  purchases: Purchase[]
): DashboardStats {
  const monthPurchases = purchases.filter((item) => isThisMonth(item.purchasedAt));

  return {
    totalCustomers: customers.length,
    newThisMonth: customers.filter((item) => isThisMonth(item.createdAt)).length,
    dealThisMonth: new Set(monthPurchases.map((item) => item.customerId)).size,
    revenueThisMonth: monthPurchases.reduce((sum, item) => sum + item.amount, 0),
    needFollowUp: customers.filter(needsFollowUp).length,
  };
}

/** 记完跟进后，这位客户应该变成什么状态 */
export function statusAfterFollowUp(
  current: CustomerStatus,
  result: string
): CustomerStatus {
  if (result === "已成交") return "已成交";
  if (current === "新客户") return "跟进中";
  return current;
}