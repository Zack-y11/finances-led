type CsvEntry = {
  id: string;
  occurredAt: Date;
  type: string;
  amount: { toFixed(places: number): string };
  currency: string;
  merchant: string | null;
  account: { name: string } | null;
  category: { name: string } | null;
  group: { name: string } | null;
  status: string;
  inputMethod: string;
  note: string | null;
};

function textCell(value: string | null): string {
  let text = value ?? '';
  // Spreadsheet apps may execute formulas even when a CSV value is quoted.
  if (/^[\s\uFEFF]*[=+@-]/u.test(text) || /^[\t\r\n]/u.test(text))
    text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function ledgerCsv(entries: CsvEntry[]): string {
  const header =
    'id,occurredAt,type,amount,currency,merchant,account,category,group,status,inputMethod,note';
  const rows = entries.map((entry) =>
    [
      textCell(entry.id),
      textCell(entry.occurredAt.toISOString()),
      textCell(entry.type.toLowerCase()),
      entry.amount.toFixed(2),
      textCell(entry.currency),
      textCell(entry.merchant),
      textCell(entry.account?.name ?? null),
      textCell(entry.category?.name ?? null),
      textCell(entry.group?.name ?? null),
      textCell(entry.status.toLowerCase()),
      textCell(entry.inputMethod.toLowerCase()),
      textCell(entry.note),
    ].join(','),
  );
  return `\uFEFF${[header, ...rows].join('\r\n')}\r\n`;
}
