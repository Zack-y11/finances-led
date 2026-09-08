import { View } from 'react-native';

import { GlassSurface } from '@/components/ui/glass-surface';
import { LedgerScreen } from '@/components/ui/ledger-screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Text } from '@/components/ui/text';
import { currency, mobileGroups } from '@/constants/fixtures';

export default function GroupsScreen() {
  return (
    <LedgerScreen>
      <ScreenHeader
        eyebrow="ENTRY GROUPS"
        title="Related spending, together."
        copy="Groups retain every individual entry while keeping a larger event understandable."
      />
      <View className="gap-2">
        {mobileGroups.map((group) => (
          <GlassSurface key={group.id}>
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-action text-[10px] font-bold tracking-wider">
                  EXPENSE GROUP
                </Text>
                <Text className="text-foreground mt-1 text-[17px] font-bold">
                  {group.name}
                </Text>
                <Text className="text-muted-foreground mt-1 text-[13px]">
                  {group.entries} linked entries
                </Text>
              </View>
              <View className="items-end gap-1">
                <Text className="text-foreground text-base font-bold">
                  {currency(group.total)}
                </Text>
                <Text className="text-action text-2xl leading-6">›</Text>
              </View>
            </View>
          </GlassSurface>
        ))}
      </View>
    </LedgerScreen>
  );
}
