"use client";

import React, { useMemo, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";

export interface ComboboxOption {
  value: string;
  label: string;
}

interface ComboboxProps {
  id?: string;
  name?: string;
  options: ComboboxOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  className?: string;
}

const Combobox: React.FC<ComboboxProps> = ({
  id,
  name,
  options,
  value,
  onChange,
  placeholder = "Selecciona una opción...",
  disabled = false,
  error = false,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const listboxId = id ? `${id}-listbox` : undefined;

  const selected = options.find((option) => option.value === value);
  const inputValue = isOpen ? query : selected?.label ?? "";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((option) =>
      option.label.toLowerCase().includes(q)
    );
  }, [options, query]);

  function handleSelect(option: ComboboxOption) {
    onChange(option.value);
    setQuery("");
    setIsOpen(false);
  }

  function handleBlur() {
    window.setTimeout(() => {
      setIsOpen(false);
      setQuery("");
    }, 150);
  }

  return (
    <div ref={rootRef} className={twMerge("relative", className)}>
      <div className="relative">
        <input
          id={id}
          name={name}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls={listboxId}
          value={inputValue}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(event) => {
            if (!isOpen) setIsOpen(true);
            setQuery(event.target.value);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={handleBlur}
          className={twMerge(
            "h-9 w-full rounded-lg border px-3 py-2 pr-9 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30",
            error
              ? "border-error-500 focus:ring-error-500/10 dark:border-error-500"
              : "border-gray-300 focus:border-brand-300 focus:ring-brand-500/10 dark:border-gray-700 dark:focus:border-brand-800",
            disabled &&
              "cursor-not-allowed border-gray-300 bg-gray-100 text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400",
            className
          )}
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
          <svg
            className={twMerge(
              "h-4 w-4 transition-transform",
              isOpen && "rotate-180"
            )}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </div>

      {isOpen && !disabled && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-10 mt-1 max-h-60 overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-theme-lg dark:border-gray-700 dark:bg-gray-900"
        >
          {filtered.length === 0 ? (
            <li className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">
              Sin resultados
            </li>
          ) : (
            filtered.map((option) => {
              const isSelected = option.value === value;
              return (
                <li key={option.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => handleSelect(option)}
                    className={twMerge(
                      "flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-colors",
                      isSelected
                        ? "bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400"
                        : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                    )}
                  >
                    <span className="truncate">{option.label}</span>
                    {isSelected && (
                      <svg
                        className="h-4 w-4 shrink-0"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
};

export default Combobox;