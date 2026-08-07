import { View } from 'react-native';

import { GlassSurface } from '@/components/ui/glass-surface';
import { LedgerScreen } from '@/components/ui/ledger-screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Text } from '@/components/ui/text';
import { currency, mobileTransactions } from '@/constants/fixtures';
import { Colors } from '@/constants/theme';

export default function OverviewScreen() {
  return (
    <LedgerScreen>
      <ScreenHeader
        eyebrow="FINANCIAL OVERVIEW"
        title="Make the month visible."
        copy="A clear view of income, spending, and the net you have left to direct."
      />
      <View className="flex-row flex-wrap gap-2">
        <Metric label="Income" value="$2,720.00" color={Colors.light.success} />
        <Metric label="Expenses" value="$423.85" color={Colors.light.danger} />
        <Metric
          label="Net position"
          value="$2,296.15"
          color={Colors.light.action}
        />
        <Metric label="Month" value="July 2026" color={Colors.light.text} />
      </View>
      <GlassSurface>
        <Text className="text-foreground text-[17px] font-bold">This month</Text>
        <Text className="text-muted-foreground mt-1 text-[13px] leading-[19px]">
          Net income continues to outpace your planned spending.
        </Text>
        <View className="mt-6 h-[110px] flex-row items-end gap-3">
          {[30, 45, 35, 58, 42, 76].map((height, index) => (
            <View
              key={height + index}
              className="flex-1 items-center justify-end gap-1.5"
            >
              <View
                className="bg-success w-full min-h-3 rounded-[5px]"
                style={{ height }}
              />
              <Text className="text-muted-foreground text-[11px]">
                {['F', 'M', 'A', 'M', 'J', 'J'][index]}
              </Text>
            </View>
          ))}
        </View>
      </GlassSurface>
      <GlassSurface>
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-foreground text-[17px] font-bold">
              Recent activity
            </Text>
            <Text className="text-muted-foreground mt-1 text-[13px] leading-[19px]">
              Latest ledger entries
            </Text>
          </View>
          <Text className="text-action text-[13px] font-bold">Ledger</Text>
        </View>
        <View className="mt-3">
          {mobileTransactions.slice(0, 3).map((item) => (
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
              <Text
                className="text-sm font-bold"
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
          ))}
        </View>
      </GlassSurface>
    </LedgerScreen>
  );
}

function Metric({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View className="border-border bg-surface min-w-[45%] grow rounded-2xl border p-3">
      <Text className="text-muted-foreground text-xs font-semibold">{label}</Text>
      <Text className="mt-3 text-[19px] font-bold" style={{ color }}>
        {value}
      </Text>
    </View>
  );
}
