"use client";

// 整个项目的数据仓库。
// 数据存在浏览器的 localStorage 里，刷新不会丢，关掉浏览器再打开也还在。
// 以后要换成真正的数据库，改动集中在这个文件，页面基本不用动。

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
import { todayKey } from "./utils";

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

interface DataState {
  customers: Customer[];
  followUps: FollowUp[];
  purchases: Purchase[];
}

interface StoreValue extends DataState {
  /** 数据是否已经从浏览器里读出来了 */
  ready: boolean;
  /** 客户 + 消费情况，页面里直接用它 */
  customersWithSpending: CustomerWithSpending[];
  addCustomer: (input: CustomerInput) => Customer;
  updateCustomer: (id: string, input: CustomerInput) => void;
  removeCustomer: (id: string) => void;
  addFollowUp: (input: FollowUpInput) => void;
  addPurchase: (input: PurchaseInput) => void;
  restoreDemoData: () => void;
}

const DataContext = createContext<StoreValue | null>(null);

function makeId(prefix: string): string {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/** 第一次打开时用的示例数据 */
function demoData(): DataState {
  return {
    customers: CUSTOMERS.map((item) => ({ ...item, tags: [...item.tags] })),
    followUps: FOLLOW_UPS.map((item) => ({ ...item })),
    purchases: PURCHASES.map((item) => ({ ...item })),
  };
}

const EMPTY: DataState = { customers: [], followUps: [], purchases: [] };

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DataState>(EMPTY);
  const [ready, setReady] = useState(false);

  // 打开页面时：先从浏览器里读，读不到就用示例数据
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as DataState;
        if (
          Array.isArray(parsed.customers) &&
          Array.isArray(parsed.followUps) &&
          Array.isArray(parsed.purchases)
        ) {
          setState(parsed);
          setReady(true);
          return;
        }
      }
    } catch {
      // 数据坏了就重新来一份
    }

    setState(demoData());
    setReady(true);
  }, []);

  // 数据一有变化就自动保存
  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // 存不进去（比如浏览器禁用了本地存储）就先不管
    }
  }, [state, ready]);

  const addCustomer = useCallback((input: CustomerInput) => {
    const customer: Customer = { id: makeId("c"), createdAt: todayKey(), ...input };
    setState((prev) => ({ ...prev, customers: [customer, ...prev.customers] }));
    return customer;
  }, []);

  const updateCustomer = useCallback((id: string, input: CustomerInput) => {
    setState((prev) => ({
      ...prev,
      customers: prev.customers.map((item) =>
        item.id === id ? { ...item, ...input } : item
      ),
    }));
  }, []);

  const removeCustomer = useCallback((id: string) => {
    setState((prev) => ({
      customers: prev.customers.filter((item) => item.id !== id),
      followUps: prev.followUps.filter((item) => item.customerId !== id),
      purchases: prev.purchases.filter((item) => item.customerId !== id),
    }));
  }, []);

  const addFollowUp = useCallback((input: FollowUpInput) => {
    const record: FollowUp = { id: makeId("f"), ...input };

    setState((prev) => ({
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

  const addPurchase = useCallback((input: PurchaseInput) => {
    const record: Purchase = { id: makeId("p"), ...input };

    setState((prev) => ({
      ...prev,
      purchases: [record, ...prev.purchases],
      // 有消费就说明已经成交了
      customers: prev.customers.map((item) =>
        item.id === input.customerId ? { ...item, status: "已成交" } : item
      ),
    }));
  }, []);

  const restoreDemoData = useCallback(() => {
    setState(demoData());
  }, []);

  const customersWithSpending = useMemo(
    () => withSpending(state.customers, state.purchases),
    [state.customers, state.purchases]
  );

  const value: StoreValue = {
    ...state,
    ready,
    customersWithSpending,
    addCustomer,
    updateCustomer,
    removeCustomer,
    addFollowUp,
    addPurchase,
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