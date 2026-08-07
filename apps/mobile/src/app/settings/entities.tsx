import { View } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { GlassSurface } from '@/components/ui/glass-surface';
import { LedgerScreen } from '@/components/ui/ledger-screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Text } from '@/components/ui/text';

export default function EntitySettingsScreen() {
  return (
    <LedgerScreen>
      <ScreenHeader
        eyebrow="ACCOUNTS & CATEGORIES"
        title="Keep the ledger structured."
        copy="Fixture entities show the management component before persistence is connected."
      />
      <EntitySection
        title="Accounts"
        values={['BAC Checking', 'Cash', 'Credit card']}
      />
      <EntitySection
        title="Categories"
        values={['Groceries', 'Dining', 'Transport', 'Utilities', 'Income']}
      />
    </LedgerScreen>
  );
}

function EntitySection({ title, values }: { title: string; values: string[] }) {
  return (
    <GlassSurface>
      <Text className="text-foreground text-[17px] font-bold">{title}</Text>
      {values.map((value) => (
        <View
          key={value}
          className="border-border flex-row items-center justify-between border-t py-3"
        >
          <Text className="text-foreground text-sm font-semibold">{value}</Text>
          <Badge variant="success">
            <Text>Active</Text>
          </Badge>
        </View>
      ))}
    </GlassSurface>
  );
}
