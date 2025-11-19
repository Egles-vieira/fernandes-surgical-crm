import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

interface ColumnVisibility {
  [key: string]: boolean;
}

export function useColumnVisibility(storageKey: string, defaultColumns: ColumnVisibility) {
  const { user } = useAuth();
  const userStorageKey = user ? `${storageKey}_${user.id}` : storageKey;

  const [visibleColumns, setVisibleColumns] = useState<ColumnVisibility>(() => {
    if (typeof window === "undefined") return defaultColumns;
    
    const stored = localStorage.getItem(userStorageKey);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return defaultColumns;
      }
    }
    return defaultColumns;
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(userStorageKey, JSON.stringify(visibleColumns));
    }
  }, [visibleColumns, userStorageKey]);

  const toggleColumn = (columnKey: string) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [columnKey]: !prev[columnKey],
    }));
  };

  const resetColumns = () => {
    setVisibleColumns(defaultColumns);
  };

  return {
    visibleColumns,
    toggleColumn,
    resetColumns,
  };
}
