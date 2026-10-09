"use client";

// 整个项目的数据仓库。
// 数据存在浏览器的 localStorage 里，刷新不会丢，关掉浏览器再打开也还在。
// 删除客户是"先放进回收站"，所以数据其实还在，随时可以恢复。

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Customer, CustomerStatus, FollowUp, Purchase } from "./types";
import { CUSTOMERS, FOLLOW_UPS, PURCHASES } from "./mock-data";
import { statusAfterFollowUp, withSpending, type CustomerWithSpending } from "./derived";
import { nowStamp, todayKey } from "./utils";

/** 存储用的名字，改这个名字等于清空所有数据重新开始 */
const STORAGE_KEY = "clothcrm.data.v1";

/** 表单提交上来的客户资料 */
export interface CustomerInput {
  name: string;
  phone: string;
  gender: Customer["gender"];
  source: string;
  tags: string[];
  status: CustomerStatus;
  nextFollowUpAt: string | null;
  note: string;
}

export interface FollowUpInput {
  customerId: string;
  followedAt: string;
  content: string;
  result: string;
  nextFollowUpAt: string | null;
}

export interface PurchaseInput {
  customerId: string;
  purchasedAt: string;
  amount: number;
  note: string;
}

/** 从外部文件导入的一行客户 */
export interface ImportRow {
  customer: CustomerInput;
  /** 如果这位客户过去已经有消费，可以顺带补一笔消费记录 */
  spending?: {
    amount: number;
    purchasedAt: string;
    note: string;
  } | null;
}

/** 回收站里的客户（比普通客户多两个统计数字） */
export interface TrashedCustomer extends Customer {
  followUpCount: number;
  purchaseCount: number;
}

interface RawState {
  customers: Customer[];
  followUps: FollowUp[];
  purchases: Purchase[];
}

interface StoreValue {
  ready: boolean;
  /** 正常的客户（不含回收站里的） */
  customers: Customer[];
  followUps: FollowUp[];
  purchases: Purchase[];
  customersWithSpending: CustomerWithSpending[];
  /** 回收站里的客户 */
  trashedCustomers: TrashedCustomer[];
  addCustomer: (input: CustomerInput) => Customer;
  updateCustomer: (id: string, input: CustomerInput) => void;
  /** 删除 = 放进回收站 */
  trashCustomer: (id: string) => void;
  /** 从回收站恢复 */
  restoreCustomer: (id: string) => void;
  /** 彻底删除，不可恢复 */
  destroyCustomer: (id: string) => void;
  /** 清空回收站 */
  emptyTrash: () => void;
  addFollowUp: (input: FollowUpInput) => void;
  addPurchases: (inputs: PurchaseInput[]) => void;
  /** 批量导入客户 */
  importCustomers: (rows: ImportRow[], mode: "skip" | "update") => { imported: number; skipped: number };
  restoreDemoData: () => void;
}

const DataContext = createContext<StoreValue | null>(null);

function makeId(prefix: string): string {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/** 第一次打开时用的示例数据 */
function demoData(): RawState {
  return {
    customers: CUSTOMERS.map((item) => ({ ...item, tags: [...item.tags], deletedAt: null })),
    followUps: FOLLOW_UPS.map((item) => ({ ...item })),
    purchases: PURCHASES.map((item) => ({ ...item })),
  };
}

const EMPTY: RawState = { customers: [], followUps: [], purchases: [] };

/**
 * 把读进来的数据整理成规范的样子。
 * 这样即使以后加了新字段，旧数据也不会出问题。
 */
function normalize(data: Partial<RawState> | null): RawState {
  if (!data) return EMPTY;

  const customers = Array.isArray(data.customers) ? data.customers : [];
  const followUps = Array.isArray(data.followUps) ? data.followUps : [];
  const purchases = Array.isArray(data.purchases) ? data.purchases : [];

  return {
    customers: customers.map((item) => ({
      ...item,
      tags: Array.isArray(item.tags) ? item.tags : [],
      note: typeof item.note === "string" ? item.note : "",
      nextFollowUpAt: item.nextFollowUpAt ?? null,
      deletedAt: item.deletedAt ?? null,
    })),
    followUps,
    purchases,
  };
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [raw, setRaw] = useState<RawState>(EMPTY);
  const [ready, setReady] = useState(false);

  // 打开页面时：先从浏览器里读，读不到就用示例数据
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<RawState>;
        if (Array.isArray(parsed.customers)) {
          setRaw(normalize(parsed));
          setReady(true);
          return;
        }
      }
    } catch {
      // 数据坏了就重新来一份
    }

    setRaw(demoData());
    setReady(true);
  }, []);

  // 数据一有变化就自动保存
  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(raw));
    } catch {
      // 存不进去（比如浏览器禁用了本地存储）就先不管
    }
  }, [raw, ready]);

  // 正常客户 / 回收站客户
  const activeCustomers = useMemo(
    () => raw.customers.filter((item) => item.deletedAt === null),
    [raw.customers]
  );

  const activeIds = useMemo(
    () => new Set(activeCustomers.map((item) => item.id)),
    [activeCustomers]
  );

  // 跟进和消费只保留"客户还在"的那些，删掉的客户不会影响任何统计
  const followUps = useMemo(
    () => raw.followUps.filter((item) => activeIds.has(item.customerId)),
    [raw.followUps, activeIds]
  );

  const purchases = useMemo(
    () => raw.purchases.filter((item) => activeIds.has(item.customerId)),
    [raw.purchases, activeIds]
  );

  const customersWithSpending = useMemo(
    () => withSpending(activeCustomers, purchases),
    [activeCustomers, purchases]
  );

  const trashedCustomers = useMemo<TrashedCustomer[]>(
    () =>
      raw.customers
        .filter((item) => item.deletedAt !== null)
        .map((item) => ({
          ...item,
          followUpCount: raw.followUps.filter((f) => f.customerId === item.id).length,
          purchaseCount: raw.purchases.filter((p) => p.customerId === item.id).length,
        }))
        .sort((a, b) => ((a.deletedAt ?? "") < (b.deletedAt ?? "") ? 1 : -1)),
    [raw]
  );

  const addCustomer = useCallback((input: CustomerInput) => {
    const customer: Customer = {
      id: makeId("c"),
      createdAt: todayKey(),
      deletedAt: null,
      ...input,
    };
    setRaw((prev) => ({ ...prev, customers: [customer, ...prev.customers] }));
    return customer;
  }, []);

  const updateCustomer = useCallback((id: string, input: CustomerInput) => {
    setRaw((prev) => ({
      ...prev,
      customers: prev.customers.map((item) =>
        item.id === id ? { ...item, ...input } : item
      ),
    }));
  }, []);

  // 删除 = 放进回收站，数据还在
  const trashCustomer = useCallback((id: string) => {
    const stamp = nowStamp();
    setRaw((prev) => ({
      ...prev,
      customers: prev.customers.map((item) =>
        item.id === id ? { ...item, deletedAt: stamp } : item
      ),
    }));
  }, []);

  const restoreCustomer = useCallback((id: string) => {
    setRaw((prev) => ({
      ...prev,
      customers: prev.customers.map((item) =>
        item.id === id ? { ...item, deletedAt: null } : item
      ),
    }));
  }, []);

  // 彻底删除：连跟进和消费一起清掉
  const destroyCustomer = useCallback((id: string) => {
    setRaw((prev) => ({
      customers: prev.customers.filter((item) => item.id !== id),
      followUps: prev.followUps.filter((item) => item.customerId !== id),
      purchases: prev.purchases.filter((item) => item.customerId !== id),
    }));
  }, []);

  const emptyTrash = useCallback(() => {
    setRaw((prev) => {
      const trashedIds = new Set(
        prev.customers.filter((item) => item.deletedAt !== null).map((item) => item.id)
      );
      return {
        customers: prev.customers.filter((item) => item.deletedAt === null),
        followUps: prev.followUps.filter((item) => !trashedIds.has(item.customerId)),
        purchases: prev.purchases.filter((item) => !trashedIds.has(item.customerId)),
      };
    });
  }, []);

  const addFollowUp = useCallback((input: FollowUpInput) => {
    const record: FollowUp = { id: makeId("f"), ...input };

    setRaw((prev) => ({
      ...prev,
      followUps: [record, ...prev.followUps],
      // 记完跟进，客户的下次跟进时间和阶段会自动跟着变
      customers: prev.customers.map((item) =>
        item.id === input.customerId
          ? {
              ...item,
              nextFollowUpAt: input.nextFollowUpAt,
              status: statusAfterFollowUp(item.status, input.result),
            }
          : item
      ),
    }));
  }, []);

  /** 一次可以存多笔消费：同一位客户一次买了好几件，可以分开记账 */
  const addPurchases = useCallback((inputs: PurchaseInput[]) => {
    if (inputs.length === 0) return;

    const records: Purchase[] = inputs.map((input) => ({ id: makeId("p"), ...input }));
    const owners = new Set(inputs.map((input) => input.customerId));

    setRaw((prev) => ({
      ...prev,
      purchases: [...records, ...prev.purchases],
      // 有消费就说明已经成交了
      customers: prev.customers.map((item) =>
        owners.has(item.id) ? { ...item, status: "已成交" } : item
      ),
    }));
  }, []);

  const importCustomers = useCallback(
    (rows: ImportRow[], mode: "skip" | "update") => {
      const working = [...raw.customers];
      const byPhone = new Map(
        working.filter((item) => item.deletedAt === null).map((item) => [item.phone, item])
      );
      const addedPurchases: Purchase[] = [];

      let imported = 0;
      let skipped = 0;

      for (const row of rows) {
        const phone = row.customer.phone;
        const found = byPhone.get(phone);
        let targetId: string;

        if (found) {
          if (mode === "skip") {
            skipped += 1;
            continue;
          }
          const index = working.findIndex((item) => item.id === found.id);
          const merged: Customer = { ...found, ...row.customer };
          working[index] = merged;
          byPhone.set(phone, merged);
          targetId = found.id;
        } else {
          const created: Customer = {
            id: makeId("c"),
            createdAt: todayKey(),
            deletedAt: null,
            ...row.customer,
          };
          working.unshift(created);
          byPhone.set(phone, created);
          targetId = created.id;
        }

        imported += 1;

        if (row.spending && row.spending.amount > 0) {
          addedPurchases.push({
            id: makeId("p"),
            customerId: targetId,
            purchasedAt: row.spending.purchasedAt,
            amount: row.spending.amount,
            note: row.spending.note,
          });
        }
      }

      setRaw((prev) => ({
        customers: working,
        followUps: prev.followUps,
        purchases: [...addedPurchases, ...prev.purchases],
      }));

      return { imported, skipped };
    },
    [raw.customers]
  );

  const restoreDemoData = useCallback(() => {
    setRaw(demoData());
  }, []);

  const value: StoreValue = {
    ready,
    customers: activeCustomers,
    followUps,
    purchases,
    customersWithSpending,
    trashedCustomers,
    addCustomer,
    updateCustomer,
    trashCustomer,
    restoreCustomer,
    destroyCustomer,
    emptyTrash,
    addFollowUp,
    addPurchases,
    importCustomers,
    restoreDemoData,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

/** 页面里用这个来取数据 */
export function useData(): StoreValue {
  const value = useContext(DataContext);
  if (!value) {
    throw new Error("useData 必须在 DataProvider 内部使用");
  }
  return value;
}