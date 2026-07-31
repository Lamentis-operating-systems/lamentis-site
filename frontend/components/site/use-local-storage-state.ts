"use client";

import { useSyncExternalStore, type SetStateAction } from "react";
import {
  readLocalStorageItem,
  writeLocalStorageItem,
  type LocalStorageItem,
  type LocalStorageReadResult,
  type LocalStorageWriteStatus,
} from "@/domain/site/local-storage";

export type LocalStorageStateStatus =
  | LocalStorageReadResult<unknown>["status"]
  | "volatile";

type LocalStorageStateSnapshot<T> = {
  status: LocalStorageStateStatus;
  value: T;
};

type SetLocalStorageState<T> = (
  nextValue: SetStateAction<T>,
) => LocalStorageWriteStatus;

type LocalStorageStateTransition<T, Result> = (
  currentValue: T,
) => {
  result: Result;
  value: T;
};

type LocalStorageTransactionStatus =
  | LocalStorageWriteStatus
  | "unchanged";

type TransactLocalStorageState<T> = <Result>(
  transition: LocalStorageStateTransition<T, Result>,
) => {
  result: Result;
  writeStatus: LocalStorageTransactionStatus;
};

type LocalStorageStateStore<T> = {
  getServerSnapshot: () => LocalStorageStateSnapshot<T>;
  getSnapshot: () => LocalStorageStateSnapshot<T>;
  setValue: SetLocalStorageState<T>;
  subscribe: (listener: () => void) => () => void;
  transact: TransactLocalStorageState<T>;
};

const localStorageStateStores = new WeakMap<
  LocalStorageItem<never>,
  LocalStorageStateStore<never>
>();

function createLocalStorageStateStore<T>(
  item: LocalStorageItem<T>,
): LocalStorageStateStore<T> {
  const serverSnapshot: LocalStorageStateSnapshot<T> = {
    status: "empty",
    value: item.createDefault(),
  };
  const listeners = new Set<() => void>();
  let initialized = false;
  let snapshot = serverSnapshot;

  function emitChange() {
    for (const listener of listeners) listener();
  }

  function getSnapshot() {
    if (!initialized) {
      snapshot = readLocalStorageItem(item);
      initialized = true;
    }
    return snapshot;
  }

  function synchronizeFromStorage(event: StorageEvent) {
    if (event.key !== null && event.key !== item.key) return;
    if (snapshot.status === "volatile") return;

    snapshot = readLocalStorageItem(item);
    initialized = true;
    emitChange();
  }

  function commitValue(value: T): LocalStorageWriteStatus {
    if (!item.isValid(value)) return "invalid";

    const writeStatus = writeLocalStorageItem(item, value);
    snapshot = {
      status: writeStatus === "stored" ? "stored" : "volatile",
      value,
    };
    initialized = true;
    emitChange();
    return writeStatus;
  }

  return {
    getServerSnapshot: () => serverSnapshot,
    getSnapshot,
    setValue(nextValue) {
      const resolvedValue = typeof nextValue === "function"
        ? (nextValue as (currentValue: T) => T)(getSnapshot().value)
        : nextValue;

      return commitValue(resolvedValue);
    },
    subscribe(listener) {
      const firstSubscriber = listeners.size === 0;
      listeners.add(listener);

      if (firstSubscriber) {
        if (!initialized || snapshot.status !== "volatile") {
          snapshot = readLocalStorageItem(item);
          initialized = true;
        }
        window.addEventListener("storage", synchronizeFromStorage);
      }

      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
          window.removeEventListener("storage", synchronizeFromStorage);
        }
      };
    },
    transact(transition) {
      const currentValue = getSnapshot().value;
      const { result, value } = transition(currentValue);
      if (Object.is(value, currentValue)) {
        return { result, writeStatus: "unchanged" };
      }

      return {
        result,
        writeStatus: commitValue(value),
      };
    },
  };
}

function localStorageStateStore<T>(
  item: LocalStorageItem<T>,
): LocalStorageStateStore<T> {
  const itemKey = item as LocalStorageItem<never>;
  const existingStore = localStorageStateStores.get(itemKey);
  if (existingStore) {
    return existingStore as unknown as LocalStorageStateStore<T>;
  }

  const store = createLocalStorageStateStore(item);
  localStorageStateStores.set(
    itemKey,
    store as unknown as LocalStorageStateStore<never>,
  );
  return store;
}

export function useLocalStorageState<T>(
  item: LocalStorageItem<T>,
): [
  T,
  SetLocalStorageState<T>,
  LocalStorageStateStatus,
  TransactLocalStorageState<T>,
] {
  const store = localStorageStateStore(item);
  const snapshot = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );

  return [
    snapshot.value,
    store.setValue,
    snapshot.status,
    store.transact,
  ];
}
