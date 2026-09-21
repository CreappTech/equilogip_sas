"use client";

import React, { useEffect, useRef, useState } from "react";
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
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      onChangeRef.current(value);
    }, debounceMs);
    return () => window.clearTimeout(timer);
  }, [value, debounceMs]);

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