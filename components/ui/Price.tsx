import { formatPrice } from "@/lib/format";

export function Price({
  amount,
  className = "",
  ...rest
}: { amount: number; className?: string } & Omit<React.HTMLAttributes<HTMLSpanElement>, "children">) {
  return (
    <span className={`tabular-nums ${className}`.trim()} {...rest}>
      {formatPrice(amount)}
    </span>
  );
}
