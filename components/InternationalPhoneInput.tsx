import React, { useEffect, useRef } from "react";
import type { CountryCode } from "libphonenumber-js";
import {
  defaultPrefixForCountry,
  formatPhoneAsYouType,
  formatPhoneForDisplay,
  isBareCountryCallingCode,
} from "../utils/internationalPhone";

export type InternationalPhoneInputProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  /** When set (from lead country), applies calling-code prefix and national formatting. */
  countryIso?: CountryCode;
  disabled?: boolean;
  error?: boolean;
  /** Non-blocking duplicate hint (amber); ignored when error is true. */
  warning?: boolean;
  className?: string;
  placeholder?: string;
  autoComplete?: string;
};

export const InternationalPhoneInput: React.FC<InternationalPhoneInputProps> = ({
  id,
  value,
  onChange,
  countryIso,
  disabled,
  error,
  warning,
  className = "",
  placeholder = "Phone number",
  autoComplete = "tel",
}) => {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const prevIsoRef = useRef<CountryCode | undefined>(undefined);
  const initializedRef = useRef(false);

  useEffect(() => {
    const emit = (v: string) => {
      onChangeRef.current(v);
    };

    if (!countryIso) {
      prevIsoRef.current = undefined;
      initializedRef.current = false;
      return;
    }

    const prefix = defaultPrefixForCountry(countryIso);

    if (!initializedRef.current) {
      initializedRef.current = true;
      prevIsoRef.current = countryIso;
      const v = value.trim();
      if (!v) {
        emit(prefix);
        return;
      }
      const pretty = formatPhoneForDisplay(v, countryIso);
      if (pretty !== value) emit(pretty);
      return;
    }

    if (prevIsoRef.current === countryIso) return;

    const prevIso = prevIsoRef.current;
    prevIsoRef.current = countryIso;

    const v = value.trim();
    if (!v) {
      emit(prefix);
      return;
    }

    if (prevIso && isBareCountryCallingCode(v, prevIso)) {
      emit(prefix);
      return;
    }

    if (prevIso && !v.startsWith("+")) {
      const next = formatPhoneForDisplay(v, countryIso);
      if (next !== value) emit(next);
      return;
    }

    if (v.startsWith("+")) {
      const next = formatPhoneForDisplay(v, undefined);
      if (next !== value) emit(next);
    }
  }, [countryIso, value]);

  const baseInputClass = `w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
    disabled ? "opacity-60" : ""
  } ${
    error
      ? "border-red-500 ring-1 ring-red-500"
      : warning
        ? "border-amber-500 ring-1 ring-amber-400/80 bg-amber-50/50 dark:bg-amber-900/15"
        : "border-gray-300 dark:border-gray-600"
  }`;

  return (
    <input
      id={id}
      type="tel"
      inputMode="tel"
      autoComplete={autoComplete}
      disabled={disabled}
      placeholder={placeholder}
      className={`${baseInputClass} ${className}`.trim()}
      value={value}
      onChange={(e) => {
        const next = formatPhoneAsYouType(e.target.value, countryIso);
        onChange(next);
      }}
      onBlur={() => {
        const t = value.trim();
        if (!t) return;
        const pretty = formatPhoneForDisplay(t, countryIso);
        if (pretty !== value) onChange(pretty);
      }}
    />
  );
};
