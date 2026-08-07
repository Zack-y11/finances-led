import { Link } from 'expo-router';

import { GlassSurface } from '@/components/ui/glass-surface';
import { LedgerScreen } from '@/components/ui/ledger-screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Text } from '@/components/ui/text';

export default function SettingsScreen() {
  return (
    <LedgerScreen>
      <ScreenHeader
        eyebrow="SETTINGS"
        title="Control your workspace."
        copy="Configuration components are ready for account, privacy, and display preferences."
      />
      <Link
        href={'/settings/entities' as any}
        style={{ textDecorationLine: 'none' }}
      >
        <GlassSurface>
          <Text className="text-foreground text-base font-bold">
            Accounts & categories
          </Text>
          <Text className="text-muted-foreground mt-1 text-[13px] leading-[19px]">
            Manage the entities behind each ledger entry.
          </Text>
        </GlassSurface>
      </Link>
      <Link href={'/review' as any} style={{ textDecorationLine: 'none' }}>
        <GlassSurface>
          <Text className="text-foreground text-base font-bold">
            Review inbox
          </Text>
          <Text className="text-muted-foreground mt-1 text-[13px] leading-[19px]">
            Inspect basic and enhanced proposal-review states.
          </Text>
        </GlassSurface>
      </Link>
      <Link href={'/rules' as any} style={{ textDecorationLine: 'none' }}>
        <GlassSurface>
          <Text className="text-foreground text-base font-bold">
            Automation rules
          </Text>
          <Text className="text-muted-foreground mt-1 text-[13px] leading-[19px]">
            Review the reusable automation rule components.
          </Text>
        </GlassSurface>
      </Link>
      <GlassSurface>
        <Text className="text-foreground text-base font-bold">
          Privacy & capture
        </Text>
        <Text className="text-muted-foreground mt-1 text-[13px] leading-[19px]">
          Temporary media controls will appear when voice and receipt flows are
          connected.
        </Text>
      </GlassSurface>
      <GlassSurface>
        <Text className="text-foreground text-base font-bold">
          Display preferences
        </Text>
        <Text className="text-muted-foreground mt-1 text-[13px] leading-[19px]">
          USD · English · Light Paper & Ink theme
        </Text>
      </GlassSurface>
    </LedgerScreen>
  );
}
