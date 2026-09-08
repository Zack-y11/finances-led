import { View } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { GlassSurface } from '@/components/ui/glass-surface';
import { LedgerScreen } from '@/components/ui/ledger-screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Text } from '@/components/ui/text';

const rules = [
  { name: 'Starbucks → Dining', usage: 'Applied 12 times', active: true },
  { name: 'Uber → Transport', usage: 'Applied 8 times', active: true },
  { name: 'Salary → BAC Checking', usage: 'Applied 2 times', active: false },
];

export default function RulesScreen() {
  return (
    <LedgerScreen>
      <ScreenHeader
        eyebrow="AUTOMATION RULES"
        title="Make repeated choices once."
        copy="Rules are clear, visible, and ready to explain each suggested action."
      />
      <View className="gap-2">
        {rules.map((rule) => (
          <GlassSurface key={rule.name}>
            <View className="flex-row items-center gap-3">
              <View className="flex-1">
                <Text className="text-foreground text-base font-bold">
                  {rule.name}
                </Text>
                <Text className="text-muted-foreground mt-1 text-[13px]">
                  {rule.usage}
                </Text>
              </View>
              <Badge variant={rule.active ? 'success' : 'secondary'}>
                <Text>{rule.active ? 'Active' : 'Paused'}</Text>
              </Badge>
            </View>
          </GlassSurface>
        ))}
      </View>
    </LedgerScreen>
  );
}
