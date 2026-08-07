import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { GlassSurface } from '@/components/ui/glass-surface';
import { LedgerScreen } from '@/components/ui/ledger-screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Text } from '@/components/ui/text';

export default function VoiceCaptureScreen() {
  return (
    <LedgerScreen contentStyle={{ justifyContent: 'center' }}>
      <ScreenHeader
        eyebrow="VOICE CAPTURE"
        title="Say it in the moment."
        copy="This component is ready for microphone permission and temporary-media lifecycle integration."
      />
      <GlassSurface className="min-h-[360px] items-center justify-center">
        <View className="bg-action-soft h-[100px] w-[100px] items-center justify-center rounded-full">
          <Text className="text-action text-4xl">●</Text>
        </View>
        <Text className="text-foreground mt-7 text-center text-base font-bold">
          Ready when your capture service is connected
        </Text>
        <Text className="text-muted-foreground mt-2 text-center text-[13px] leading-[19px]">
          Voice is never stored as a durable financial record.
        </Text>
        <Button className="mt-6" disabled>
          <Text>Start recording</Text>
        </Button>
      </GlassSurface>
    </LedgerScreen>
  );
}
