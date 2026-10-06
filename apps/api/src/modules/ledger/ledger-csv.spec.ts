import { Prisma } from '@finance/database';
import { ledgerCsv } from './ledger-csv.js';

describe('ledgerCsv', () => {
  const entry = {
    id: 'entry-id',
    occurredAt: new Date('2026-01-01T00:00:00Z'),
    type: 'EXPENSE',
    amount: new Prisma.Decimal('0.10'),
    currency: 'EUR',
    merchant: '=SUM(1,2)',
    account: { name: 'Café "cash"' },
    category: null,
    group: null,
    status: 'NEEDS_REVIEW',
    inputMethod: 'TEXT',
    note: 'First line\nSecond, line',
  };
  it('preserves original currency, status and precision, escapes CSV, and neutralizes formulas', () => {
    const csv = ledgerCsv([entry]);
    expect(csv.startsWith('\uFEFFid,occurredAt,')).toBe(true);
    expect(csv).toContain('0.10,"EUR","\'=SUM(1,2)","Café ""cash"""');
    expect(csv).toContain('"needs_review","text","First line\nSecond, line"');
    expect(csv.endsWith('\r\n')).toBe(true);
  });
  it.each(['+cmd', '-cmd', '@cmd', '  =cmd', '\t=cmd', '\r=cmd', '\n=cmd'])(
    'neutralizes %p in user-controlled text',
    (merchant) => {
      expect(ledgerCsv([{ ...entry, merchant }])).toContain(`"'${merchant}"`);
    },
  );
  it('exports a header-only empty result', () => {
    expect(ledgerCsv([]).split('\r\n')).toHaveLength(2);
  });
});
