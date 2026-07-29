import { describe, expect, it } from "vitest";
import {
  defineLocalStorageItem,
  readLocalStorageItem,
  removeLocalStorageItem,
  writeLocalStorageItem,
} from "@/domain/site/local-storage";

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

const preferencesStorage = defineLocalStorageItem<string[]>({
  createDefault: () => [],
  isValid: (value): value is string[] => (
    Array.isArray(value)
    && value.every((entry) => typeof entry === "string")
  ),
  name: "test-preferences",
  version: 2,
});

describe("local-storage service", () => {
  it("uses a stable versioned key and returns fresh defaults", () => {
    const firstRead = readLocalStorageItem(preferencesStorage, new MemoryStorage());
    const secondRead = readLocalStorageItem(preferencesStorage, new MemoryStorage());

    expect(preferencesStorage.key).toBe("lamentis:test-preferences:v2");
    expect(firstRead).toEqual({ status: "empty", value: [] });
    expect(secondRead).toEqual({ status: "empty", value: [] });
    expect(firstRead.value).not.toBe(secondRead.value);
  });

  it("round-trips validated values and removes only its own key", () => {
    const storage = new MemoryStorage();
    storage.setItem("unrelated", "keep");

    expect(
      writeLocalStorageItem(preferencesStorage, ["compact"], storage),
    ).toBe("stored");
    expect(readLocalStorageItem(preferencesStorage, storage)).toEqual({
      status: "stored",
      value: ["compact"],
    });
    expect(removeLocalStorageItem(preferencesStorage, storage)).toBe(true);
    expect(storage.getItem(preferencesStorage.key)).toBeNull();
    expect(storage.getItem("unrelated")).toBe("keep");
  });

  it("falls back safely for corrupt JSON and schema-invalid data", () => {
    const storage = new MemoryStorage();
    storage.setItem(preferencesStorage.key, "{broken");
    expect(readLocalStorageItem(preferencesStorage, storage)).toEqual({
      status: "invalid",
      value: [],
    });

    storage.setItem(preferencesStorage.key, JSON.stringify([1, 2]));
    expect(readLocalStorageItem(preferencesStorage, storage)).toEqual({
      status: "invalid",
      value: [],
    });
    expect(
      writeLocalStorageItem(
        preferencesStorage,
        [1] as unknown as string[],
        storage,
      ),
    ).toBe("invalid");
  });

  it("contains unavailable and throwing browser storage failures", () => {
    const failingStorage = new MemoryStorage();
    failingStorage.getItem = () => {
      throw new Error("Storage blocked");
    };
    failingStorage.setItem = () => {
      throw new Error("Quota exceeded");
    };
    failingStorage.removeItem = () => {
      throw new Error("Storage blocked");
    };

    expect(readLocalStorageItem(preferencesStorage, null)).toEqual({
      status: "unavailable",
      value: [],
    });
    expect(writeLocalStorageItem(preferencesStorage, [], null)).toBe(
      "unavailable",
    );
    expect(readLocalStorageItem(preferencesStorage, failingStorage)).toEqual({
      status: "unavailable",
      value: [],
    });
    expect(
      writeLocalStorageItem(preferencesStorage, [], failingStorage),
    ).toBe("failed");
    expect(removeLocalStorageItem(preferencesStorage, failingStorage)).toBe(
      false,
    );
  });

  it("rejects unstable names and versions at definition time", () => {
    expect(() => defineLocalStorageItem({
      createDefault: () => null,
      isValid: (value): value is null => value === null,
      name: "Not Stable",
      version: 0,
    })).toThrow("stable name and version");
  });
});
