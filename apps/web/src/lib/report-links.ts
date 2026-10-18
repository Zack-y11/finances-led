export function reportLedgerHref(
  month: string,
  filters: Record<string, string | null | undefined> = {},
) {
  const params = new URLSearchParams({
    month,
    status: "posted",
    currency: "USD",
    financialOnly: "true",
  });
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  return `/ledger?${params}`;
}
