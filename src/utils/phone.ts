const onlyDigits = (value: string) => value.replace(/\D/g, "");

export const normalizePhoneNumber = (value: string) => {
  const digits = onlyDigits(value);

  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    return digits;
  }

  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }

  return digits;
};

export const isValidBrazilianPhoneNumber = (value: string) => {
  const normalized = normalizePhoneNumber(value);
  const withoutCountryCode = normalized.startsWith("55")
    ? normalized.slice(2)
    : normalized;

  return /^[1-9]{2}9?\d{8}$/.test(withoutCountryCode);
};
