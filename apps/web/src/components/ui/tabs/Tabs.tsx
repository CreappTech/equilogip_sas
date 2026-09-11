"use client";

import React, { useState } from "react";
import { twMerge } from "tailwind-merge";

export interface TabItem {
  key: string;
  label: React.ReactNode;
  content?: React.ReactNode;
  disabled?: boolean;
}

interface TabsProps {
  items: TabItem[];
  activeKey?: string;
  defaultActiveKey?: string;
  onChange?: (key: string) => void;
  className?: string;
}

const Tabs: React.FC<TabsProps> = ({
  items,
  activeKey,
  defaultActiveKey,
  onChange,
  className,
}) => {
  const [internalKey, setInternalKey] = useState<string | undefined>(
    defaultActiveKey ?? items[0]?.key
  );
  const current = activeKey !== undefined ? activeKey : internalKey;

  function handleSelect(key: string) {
    if (activeKey === undefined) {
      setInternalKey(key);
    }
    onChange?.(key);
  }

  const activeContent = items.find((item) => item.key === current)?.content;

  return (
    <div className={className}>
      <div
        className="flex w-full items-center gap-1 overflow-x-auto border-b border-gray-200 dark:border-gray-800"
        role="tablist"
      >
        {items.map((item) => {
          const isActive = item.key === current;
          return (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              disabled={item.disabled}
              onClick={() => handleSelect(item.key)}
              className={twMerge(
                "-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "border-brand-500 text-brand-500"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:hover:border-gray-700 dark:hover:text-gray-300",
                item.disabled && "cursor-not-allowed opacity-50"
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {activeContent !== undefined && (
        <div className="pt-5">{activeContent}</div>
      )}
    </div>
  );
};

export default Tabs;