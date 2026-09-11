"use client";

import React, { useEffect, useState } from "react";
import Input from "@/components/form/input/InputField";

interface SearchInputProps {
  id?: string;
  name?: string;
  placeholder?: string;
  defaultValue?: string;
  onChange: (value: string) => void;
  debounceMs?: number;
  className?: string;
  disabled?: boolean;
}

const SearchInput: React.FC<SearchInputProps> = ({
  id,
  name,
  placeholder = "Buscar...",
  defaultValue = "",
  onChange,
  debounceMs = 300,
  className,
  disabled,
}) => {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      onChange(value);
    }, debounceMs);
    return () => window.clearTimeout(timer);
  }, [value, debounceMs, onChange]);

  return (
    <Input
      id={id}
      name={name}
      type="search"
      value={value}
      onChange={(event) => setValue(event.target.value)}
      placeholder={placeholder}
      className={className}
      disabled={disabled}
    />
  );
};

export default SearchInput;