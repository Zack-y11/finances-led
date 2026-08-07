import { View } from 'react-native';

import { GlassSurface } from '@/components/ui/glass-surface';
import { LedgerScreen } from '@/components/ui/ledger-screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Text } from '@/components/ui/text';
import { Colors } from '@/constants/theme';

const items = [
  'Starbucks · low category confidence',
  'Unknown merchant · account needed',
  'Super Selectos · receipt total differs',
];

export default function ReviewScreen() {
  return (
    <LedgerScreen>
      <ScreenHeader
        eyebrow="REVIEW INBOX"
        title="Keep automation explainable."
        copy="Every uncertain proposal waits for an intentional decision."
      />
      <View className="flex-row gap-2">
        <Metric label="Pending" value="3" color={Colors.light.actionSoft} />
        <Metric label="Attention" value="2" color={Colors.light.reviewSoft} />
      </View>
      <GlassSurface>
        <Text className="text-foreground text-[17px] font-bold">
          Items to review
        </Text>
        {items.map((item) => (
          <View
            key={item}
            className="border-border flex-row items-center gap-2.5 border-t py-3.5"
          >
            <View className="bg-review h-2 w-2 rounded" />
            <View className="flex-1">
              <Text className="text-foreground text-sm font-bold">
                {item.split(' · ')[0]}
              </Text>
              <Text className="text-muted-foreground mt-0.5 text-xs">
                {item.split(' · ')[1]}
              </Text>
            </View>
            <Text className="text-action text-[22px]">›</Text>
          </View>
        ))}
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
    <View className="flex-1 rounded-2xl p-3" style={{ backgroundColor: color }}>
      <Text className="text-muted-foreground text-xs font-bold">{label}</Text>
      <Text className="text-foreground mt-3 text-[26px] font-bold">{value}</Text>
    </View>
  );
}
