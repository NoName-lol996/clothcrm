// 消费记录的读取入口

import { PURCHASES } from "../mock-data";
import type { Purchase } from "../types";

export function getPurchases(): Purchase[] {
  return PURCHASES;
}