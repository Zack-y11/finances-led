import {
  applyAutomationRules,
  detectRecurringPatterns,
  prepareMerchantName,
} from '@finance/rules';

describe('prepareMerchantName', () => {
  it('strips store numbers, legal suffixes, and case differences', () => {
    expect(prepareMerchantName('STARBUCKS #1842')).toEqual({
      original: 'STARBUCKS #1842',
      displayName: 'Starbucks',
      key: 'starbucks',
    });
    expect(prepareMerchantName('Starbucks, Inc.')?.key).toBe('starbucks');
    expect(prepareMerchantName('Blue Bottle Coffee LLC')?.key).toBe(
      'blue bottle coffee',
    );
  });

  it('keeps distinct brands separate', () => {
    expect(prepareMerchantName('Uber')?.key).toBe('uber');
    expect(prepareMerchantName('Uber Eats')?.key).toBe('uber eats');
  });

  it('title-cases mixed alphanumeric tokens used as uniqueness suffixes', () => {
    expect(prepareMerchantName('Phase6 Claro d93b3fcd2c7b')).toEqual({
      original: 'Phase6 Claro d93b3fcd2c7b',
      displayName: 'Phase6 Claro D93b3fcd2c7b',
      key: 'phase6 claro d93b3fcd2c7b',
    });
  });
});

describe('applyAutomationRules', () => {
  const starbucksFood = {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Starbucks Dining',
    conditionField: 'merchant' as const,
    conditionOp: 'contains' as const,
    conditionValue: 'Starbucks',
    actionField: 'category' as const,
    actionValue: 'Food',
    priority: 1,
    isEnabled: true,
  };
  const starbucksTransport = {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Lower priority override',
    conditionField: 'merchant' as const,
    conditionOp: 'contains' as const,
    conditionValue: 'Starbucks',
    actionField: 'category' as const,
    actionValue: 'Transport',
    priority: 5,
    isEnabled: true,
  };
  const amountAccount = {
    id: '33333333-3333-4333-8333-333333333333',
    name: 'Large spend cash',
    conditionField: 'amount' as const,
    conditionOp: 'greater_than' as const,
    conditionValue: '50',
    actionField: 'account' as const,
    actionValue: 'Cash',
    priority: 2,
    isEnabled: true,
  };

  it('lets the highest priority rule win per action field', () => {
    const { result, applied } = applyAutomationRules(
      {
        merchant: 'Starbucks',
        amount: 3.19,
        category: 'Uncategorized',
        account: 'BAC',
      },
      [starbucksTransport, starbucksFood, amountAccount],
    );

    expect(result.category).toBe('Food');
    expect(result.account).toBe('BAC');
    expect(applied).toEqual([
      expect.objectContaining({
        ruleName: 'Starbucks Dining',
        actionField: 'category',
        actionValue: 'Food',
      }),
    ]);
    expect(applied[0]?.explanation).toContain('priority 1');
  });

  it('can apply category and account rules together', () => {
    const { result, applied } = applyAutomationRules(
      {
        merchant: 'Starbucks',
        amount: 80,
        category: 'Uncategorized',
        account: 'BAC',
      },
      [starbucksFood, amountAccount],
    );

    expect(result).toEqual(
      expect.objectContaining({ category: 'Food', account: 'Cash' }),
    );
    expect(applied).toHaveLength(2);
  });

  it('matches normalized merchant equality and decimal amounts', () => {
    const merchantRule = {
      ...starbucksFood,
      conditionOp: 'equals' as const,
      conditionValue: 'STARBUCKS #1842',
    };
    const amountRule = {
      ...amountAccount,
      conditionOp: 'equals' as const,
      conditionValue: '3.10',
    };

    expect(
      applyAutomationRules({ merchant: 'Starbucks', amount: 3.1 }, [
        merchantRule,
        amountRule,
      ]),
    ).toEqual(
      expect.objectContaining({
        result: expect.objectContaining({ category: 'Food', account: 'Cash' }),
        applied: expect.arrayContaining([
          expect.objectContaining({ ruleId: starbucksFood.id }),
          expect.objectContaining({ ruleId: amountAccount.id }),
        ]),
      }),
    );
  });
});

describe('detectRecurringPatterns', () => {
  it('detects a monthly merchant cadence from similar posted amounts', () => {
    const patterns = detectRecurringPatterns([
      {
        id: '1',
        type: 'EXPENSE',
        amount: 12.5,
        merchant: 'Claro',
        merchantId: 'merchant-1',
        occurredAt: new Date('2026-04-08T12:00:00.000Z'),
      },
      {
        id: '2',
        type: 'EXPENSE',
        amount: 12.5,
        merchant: 'Claro',
        merchantId: 'merchant-1',
        occurredAt: new Date('2026-05-08T12:00:00.000Z'),
      },
      {
        id: '3',
        type: 'EXPENSE',
        amount: 12.75,
        merchant: 'CLARO',
        merchantId: 'merchant-1',
        occurredAt: new Date('2026-06-08T12:00:00.000Z'),
      },
      {
        id: '4',
        type: 'EXPENSE',
        amount: 12.5,
        merchant: 'Claro',
        merchantId: 'merchant-1',
        occurredAt: new Date('2026-07-08T12:00:00.000Z'),
      },
    ]);

    expect(patterns).toEqual([
      expect.objectContaining({
        merchant: 'Claro',
        cadence: 'monthly',
        occurrenceCount: 4,
        medianAmount: 12.5,
        type: 'expense',
        nextExpectedAt: '2026-08-08T00:00:00.000Z',
      }),
    ]);
  });

  it('combines legacy entries without merchant ids with canonical history', () => {
    const patterns = detectRecurringPatterns([
      {
        id: 'legacy-1',
        type: 'EXPENSE',
        amount: 42,
        merchant: 'Internet Provider',
        merchantId: null,
        occurredAt: new Date('2026-01-08T12:00:00.000Z'),
      },
      {
        id: 'canonical-2',
        type: 'EXPENSE',
        amount: 42,
        merchant: 'Internet Provider',
        merchantId: 'merchant-1',
        occurredAt: new Date('2026-02-08T12:00:00.000Z'),
      },
      {
        id: 'canonical-3',
        type: 'EXPENSE',
        amount: 42,
        merchant: 'INTERNET PROVIDER',
        merchantId: 'merchant-1',
        occurredAt: new Date('2026-03-08T12:00:00.000Z'),
      },
      {
        id: 'legacy-4',
        type: 'EXPENSE',
        amount: 42,
        merchant: 'Internet Provider',
        merchantId: null,
        occurredAt: new Date('2026-04-08T12:00:00.000Z'),
      },
    ]);

    expect(patterns).toEqual([
      expect.objectContaining({
        cadence: 'monthly',
        occurrenceCount: 4,
        sampleEntryIds: ['legacy-1', 'canonical-2', 'canonical-3', 'legacy-4'],
      }),
    ]);
  });

  it('ignores one-off merchants', () => {
    expect(
      detectRecurringPatterns([
        {
          id: '1',
          type: 'EXPENSE',
          amount: 4,
          merchant: 'Cafe',
          merchantId: null,
          occurredAt: new Date('2026-07-01T12:00:00.000Z'),
        },
        {
          id: '2',
          type: 'EXPENSE',
          amount: 4,
          merchant: 'Cafe',
          merchantId: null,
          occurredAt: new Date('2026-07-20T12:00:00.000Z'),
        },
      ]),
    ).toEqual([]);
  });
});
