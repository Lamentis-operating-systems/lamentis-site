export type LocalStorageItem<T> = Readonly<{
  createDefault: () => T;
  isValid: (value: unknown) => value is T;
  key: string;
}>;

export type LocalStorageReadResult<T> =
  | { status: "empty"; value: T }
  | { status: "invalid"; value: T }
  | { status: "stored"; value: T }
  | { status: "unavailable"; value: T };

export type LocalStorageWriteStatus =
  | "failed"
  | "invalid"
  | "stored"
  | "unavailable";

type LocalStorageItemDefinition<T> = {
  createDefault: () => T;
  isValid: (value: unknown) => value is T;
  name: string;
  version: number;
};

function browserLocalStorage(): Storage | null {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function defineLocalStorageItem<T>({
  createDefault,
  isValid,
  name,
  version,
}: LocalStorageItemDefinition<T>): LocalStorageItem<T> {
  if (
    !/^[a-z0-9-]+$/.test(name)
    || !Number.isSafeInteger(version)
    || version < 1
  ) {
    throw new Error("Local-storage items require a stable name and version.");
  }

  return Object.freeze({
    createDefault,
    isValid,
    key: `lamentis:${name}:v${version}`,
  });
}

export function readLocalStorageItem<T>(
  item: LocalStorageItem<T>,
  storage: Storage | null = browserLocalStorage(),
): LocalStorageReadResult<T> {
  const fallback = item.createDefault();

  if (!storage) return { status: "unavailable", value: fallback };

  let serializedValue: string | null;
  try {
    serializedValue = storage.getItem(item.key);
  } catch {
    return { status: "unavailable", value: fallback };
  }

  if (serializedValue === null) return { status: "empty", value: fallback };

  try {
    const parsedValue: unknown = JSON.parse(serializedValue);
    return item.isValid(parsedValue)
      ? { status: "stored", value: parsedValue }
      : { status: "invalid", value: fallback };
  } catch {
    return { status: "invalid", value: fallback };
  }
}

export function writeLocalStorageItem<T>(
  item: LocalStorageItem<T>,
  value: T,
  storage: Storage | null = browserLocalStorage(),
): LocalStorageWriteStatus {
  if (!storage) return "unavailable";
  if (!item.isValid(value)) return "invalid";

  try {
    const serializedValue = JSON.stringify(value);
    if (serializedValue === undefined) return "failed";
    storage.setItem(item.key, serializedValue);
    return "stored";
  } catch {
    return "failed";
  }
}

export function removeLocalStorageItem<T>(
  item: LocalStorageItem<T>,
  storage: Storage | null = browserLocalStorage(),
): boolean {
  if (!storage) return false;

  try {
    storage.removeItem(item.key);
    return true;
  } catch {
    return false;
  }
}
