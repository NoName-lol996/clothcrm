// 客户的读取入口。
// 以后接入真实数据库时，只需要改这个文件里的几行代码，页面完全不用动。

import { CUSTOMERS } from "../mock-data";
import type { Customer } from "../types";

export function getCustomers(): Customer[] {
  return CUSTOMERS;
}

export function getCustomerById(id: string): Customer | undefined {
  return CUSTOMERS.find((customer) => customer.id === id);
}