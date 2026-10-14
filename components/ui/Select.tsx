import type { SelectHTMLAttributes } from "react";
import { inputClasses } from "./Field";
import { ChevronDownIcon } from "./icons";

export function Select({ className = "", children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className={`relative ${className}`.trim()}>
      <select className={`${inputClasses} appearance-none pr-10`} {...rest}>
        {children}
      </select>
      <ChevronDownIcon size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
    </div>
  );
}
