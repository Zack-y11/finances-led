import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GlassSurface } from '@/components/ui/glass-surface';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LedgerScreen } from '@/components/ui/ledger-screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Text } from '@/components/ui/text';
import { currency, mobileTransactions } from '@/constants/fixtures';
import { Colors } from '@/constants/theme';
import { cn } from '@/lib/utils';

export default function LedgerScreenRoute() {
  const [query, setQuery] = useState('');
  const [type, setType] = useState<'all' | 'income' | 'expense'>('all');
  const entries = useMemo(
    () =>
      mobileTransactions.filter(
        (entry) =>
          (type === 'all' || entry.type === type) &&
          [entry.merchant, entry.category]
            .join(' ')
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [query, type],
  );
  return (
    <LedgerScreen>
      <ScreenHeader
        eyebrow="TRANSACTIONS"
        title="Your financial record."
        copy="Search and review every event in the ledger."
      />
      <GlassSurface>
        <Label nativeID="search-entries">Search</Label>
        <Input
          accessibilityLabel="Search entries"
          aria-labelledby="search-entries"
          className="mt-2"
          onChangeText={setQuery}
          placeholder="Search entries"
          value={query}
        />
        <View className="mt-3 flex-row gap-2">
          {(['all', 'expense', 'income'] as const).map((value) => (
            <Button
              key={value}
              size="sm"
              variant={type === value ? 'secondary' : 'ghost'}
              className={cn(
                'rounded-full',
                type === value && 'bg-action-soft',
              )}
              onPress={() => setType(value)}
            >
              <Text
                className={cn(
                  'text-xs font-bold',
                  type === value ? 'text-action' : 'text-muted-foreground',
                )}
              >
                {value === 'all'
                  ? 'All'
                  : value === 'expense'
                    ? 'Expenses'
                    : 'Income'}
              </Text>
            </Button>
          ))}
        </View>
        <View className="mt-3">
          {entries.map((item) => (
            <View
              key={item.id}
              className="border-border flex-row items-center gap-3 border-t py-3"
            >
              <View
                className="h-9 w-9 items-center justify-center rounded-[10px]"
                style={{
                  backgroundColor:
                    item.type === 'income'
                      ? Colors.light.successSoft
                      : Colors.light.dangerSoft,
                }}
              >
                <Text
                  style={{
                    color:
                      item.type === 'income'
                        ? Colors.light.success
                        : Colors.light.danger,
                  }}
                >
                  {item.type === 'income' ? '↑' : '↓'}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-foreground text-sm font-bold">
                  {item.merchant}
                </Text>
                <Text className="text-muted-foreground mt-0.5 text-xs">
                  {item.category} · {item.date}
                </Text>
              </View>
              <View className="items-end">
                {item.status === 'review' ? (
                  <Badge variant="review" className="mb-0.5">
                    <Text>Review</Text>
                  </Badge>
                ) : null}
                <Text
                  className="mt-0.5 text-sm font-bold"
                  style={{
                    color:
                      item.type === 'income'
                        ? Colors.light.success
                        : Colors.light.text,
                  }}
                >
                  {item.type === 'income' ? '+' : '−'}
                  {currency(item.amount)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </GlassSurface>
    </LedgerScreen>
  );
}
