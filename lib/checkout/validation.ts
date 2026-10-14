// Pure checkout validators. Each returns an error message, or null when valid.
// M4 hook: `postcodeValidation` switches validatePostcode to { strict: true }.
import type { CountryCode } from "@/lib/config";

export type CheckoutField =
  | "email"
  | "firstName"
  | "lastName"
  | "address"
  | "city"
  | "postcode"
  | "country"
  | "cardNumber"
  | "cardExpiry"
  | "cardCvc";

export type CheckoutValues = Record<CheckoutField, string>;

export const FIELD_ORDER: CheckoutField[] = [
  "email",
  "firstName",
  "lastName",
  "address",
  "city",
  "postcode",
  "country",
  "cardNumber",
  "cardExpiry",
  "cardCvc",
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const REQUIRED: Partial<Record<CheckoutField, string>> = {
  email: "Enter your email address",
  firstName: "Enter your first name",
  lastName: "Enter your last name",
  address: "Enter your street and house number",
  city: "Enter your town or city",
  postcode: "Enter your postcode",
  country: "Choose a country",
  cardNumber: "Enter your card number",
  cardExpiry: "Enter the expiry date",
  cardCvc: "Enter the security code",
};

const POSTCODE_CLEAN: Record<CountryCode, { re: RegExp; example: string }> = {
  NL: { re: /^\d{4}\s?[A-Z]{2}$/, example: "1234 AB" },
  BE: { re: /^\d{4}$/, example: "1000" },
  DE: { re: /^\d{5}$/, example: "10115" },
  FR: { re: /^\d{5}$/, example: "75001" },
};

/** Strict mode (friction): exact format only, no normalising, unhelpful message. */
const POSTCODE_STRICT = /^\d{4}[A-Z]{2}$|^\d{4,5}$/;

export function validatePostcode(
  value: string,
  country: CountryCode,
  opts: { strict?: boolean } = {},
): string | null {
  if (!value.trim()) return REQUIRED.postcode!;
  if (opts.strict) return POSTCODE_STRICT.test(value) ? null : "Invalid input.";
  const normalised = value.trim().toUpperCase();
  const rule = POSTCODE_CLEAN[country];
  return rule.re.test(normalised) ? null : `Enter a postcode like ${rule.example}`;
}

export function validateEmail(value: string): string | null {
  if (!value.trim()) return REQUIRED.email!;
  return EMAIL_RE.test(value.trim()) ? null : "Enter an email address like name@example.com";
}

export function validateCardNumber(value: string): string | null {
  const digits = value.replace(/\s+/g, "");
  if (!digits) return REQUIRED.cardNumber!;
  return /^\d{13,19}$/.test(digits) ? null : "Enter a card number of 13 to 19 digits";
}

export function validateExpiry(value: string, now: Date = new Date()): string | null {
  const v = value.replace(/\s+/g, "");
  if (!v) return REQUIRED.cardExpiry!;
  const m = /^(\d{2})\/(\d{2})$/.exec(v);
  if (!m) return "Enter the expiry date as MM/YY";
  const month = Number(m[1]);
  const year = 2000 + Number(m[2]);
  if (month < 1 || month > 12) return "Enter a month between 01 and 12";
  const endOfMonth = new Date(year, month, 0, 23, 59, 59);
  return endOfMonth >= now ? null : "This card has expired";
}

export function validateCvc(value: string): string | null {
  const v = value.trim();
  if (!v) return REQUIRED.cardCvc!;
  return /^\d{3,4}$/.test(v) ? null : "Enter the 3 or 4 digit security code";
}

export interface ValidateOptions {
  strictPostcode?: boolean;
  now?: Date;
}

export function validateField(
  field: CheckoutField,
  values: CheckoutValues,
  opts: ValidateOptions = {},
): string | null {
  const value = values[field] ?? "";
  switch (field) {
    case "email":
      return validateEmail(value);
    case "postcode":
      return validatePostcode(value, values.country as CountryCode, { strict: opts.strictPostcode });
    case "cardNumber":
      return validateCardNumber(value);
    case "cardExpiry":
      return validateExpiry(value, opts.now);
    case "cardCvc":
      return validateCvc(value);
    default:
      return value.trim() ? null : REQUIRED[field] ?? "Required";
  }
}

export function validateAll(values: CheckoutValues, opts: ValidateOptions = {}) {
  const errors: Partial<Record<CheckoutField, string>> = {};
  for (const f of FIELD_ORDER) {
    const e = validateField(f, values, opts);
    if (e) errors[f] = e;
  }
  return errors;
}
