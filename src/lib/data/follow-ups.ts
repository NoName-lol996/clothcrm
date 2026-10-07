// 跟进记录的读取入口

import { FOLLOW_UPS } from "../mock-data";
import type { FollowUp } from "../types";

export function getFollowUps(): FollowUp[] {
  return FOLLOW_UPS;
}