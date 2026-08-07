import { useState } from 'react';
import { View } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GlassSurface } from '@/components/ui/glass-surface';
import { LedgerScreen } from '@/components/ui/ledger-screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

type ReceiptState = 'preview' | 'processing' | 'review';

export default function ReceiptCaptureScreen() {
  const [state, setState] = useState<ReceiptState>('preview');
  return (
    <LedgerScreen>
      <ScreenHeader
        eyebrow="RECEIPT CAPTURE"
        title={
          state === 'preview'
            ? 'Preview receipt'
            : state === 'processing'
              ? 'Analyzing receipt'
              : 'Review capture'
        }
        copy={
          state === 'preview'
            ? 'Frame the receipt before temporary processing begins.'
            : state === 'processing'
              ? 'Each processing step remains visible to preserve trust.'
              : 'Confirm the extracted facts before a future ledger write.'
        }
      />
      {state === 'preview' ? (
        <Preview onUse={() => setState('processing')} />
      ) : null}
      {state === 'processing' ? (
        <Processing onComplete={() => setState('review')} />
      ) : null}
      {state === 'review' ? (
        <Review onRetake={() => setState('preview')} />
      ) : null}
    </LedgerScreen>
  );
}

function Preview({ onUse }: { onUse: () => void }) {
  return (
    <GlassSurface className="gap-3.5">
      <View className="border-border bg-background h-[300px] items-center justify-center rounded-xl border border-dashed">
        <Text className="text-action text-[42px]">⌁</Text>
        <Text className="text-muted-foreground mt-2.5 text-sm">
          Receipt photo preview
        </Text>
      </View>
      <View className="flex-row gap-2.5">
        <Button variant="outline" className="flex-1">
          <Text>Retake</Text>
        </Button>
        <Button className="bg-foreground flex-1" onPress={onUse}>
          <Text>Use photo</Text>
        </Button>
      </View>
    </GlassSurface>
  );
}

function Processing({ onComplete }: { onComplete: () => void }) {
  return (
    <GlassSurface className="gap-3.5">
      <View className="bg-background h-[180px] items-center justify-center rounded-2xl">
        <Text className="text-action text-[58px]">⌁</Text>
      </View>
      <Text className="text-foreground text-center text-lg font-bold">
        Analyzing Receipt
      </Text>
      {['Reading text', 'Detecting amounts', 'Securely deleting image'].map(
        (step, index) => (
          <View key={step} className="flex-row items-center gap-2.5">
            <Text
              className={
                index === 0 ? 'text-action' : 'text-muted-foreground'
              }
            >
              {index === 0 ? '●' : '○'}
            </Text>
            <Text
              className={cn(
                'text-muted-foreground text-[13px] font-semibold',
                index === 0 && 'text-action',
              )}
            >
              {step}...
            </Text>
          </View>
        ),
      )}
      <Button className="mt-1" onPress={onComplete}>
        <Text>Show extracted draft</Text>
      </Button>
    </GlassSurface>
  );
}

function Review({ onRetake }: { onRetake: () => void }) {
  return (
    <View className="gap-3">
      <View className="bg-success-soft rounded-xl p-4">
        <Text className="text-foreground text-sm font-bold">Privacy secured</Text>
        <Text className="text-muted-foreground mt-1 text-xs leading-[18px]">
          The original receipt image is represented as deleted. Only extracted
          data would be saved.
        </Text>
      </View>
      <GlassSurface>
        <Badge variant="success" className="mb-2 self-end">
          <Text>98% MATCH</Text>
        </Badge>
        <Field label="Merchant" value="Blue Bottle Coffee" />
        <View className="flex-row gap-3.5">
          <Field label="Total amount" value="$14.50" half />
          <Field label="Date" value="Jul 18, 2026" half />
        </View>
        <Field label="Suggested category" value="Dining & Drinks" />
        <Field label="Account" value="BAC Checking" />
        <Button className="bg-foreground mt-2">
          <Text>Confirm & save transaction</Text>
        </Button>
        <Button variant="ghost" className="mt-1" onPress={onRetake}>
          <Text className="text-muted-foreground">Discard</Text>
        </Button>
      </GlassSurface>
    </View>
  );
}

function Field({
  label,
  value,
  half,
}: {
  label: string;
  value: string;
  half?: boolean;
}) {
  return (
    <View className={cn('border-border border-b pb-2.5', half && 'flex-1')}>
      <Text className="text-muted-foreground text-[11px] font-bold">{label}</Text>
      <Text className="text-foreground mt-1.5 text-base font-bold">{value}</Text>
    </View>
  );
}
