import { View } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GlassSurface } from '@/components/ui/glass-surface';
import { LedgerScreen } from '@/components/ui/ledger-screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

export default function EnhancedReviewScreen() {
  return (
    <LedgerScreen>
      <ScreenHeader
        eyebrow="REVIEW INBOX"
        title="Resolve what needs context."
        copy="Capture proposals are transparent, editable, and private by default."
      />
      <View className="flex-row gap-2">
        <Metric label="Pending" value="12" action />
        <Metric label="Accuracy" value="98.4%" />
      </View>
      <Text className="text-muted-foreground text-center text-xs">
        ⌑ Media deleted after processing
      </Text>
      <GlassSurface>
        <CardHeader
          source="Quick Capture"
          title="Dinner at Gusto's"
          confidence="High confidence"
        />
        <View className="border-border bg-background mt-3.5 rounded-lg border p-2.5">
          <Text className="text-muted-foreground text-[10px] font-bold tracking-wider">
            ORIGINAL COMMAND
          </Text>
          <Text className="text-foreground mt-1 text-[13px] leading-[19px]">
            “I spent 85.50 on dinner at Gusto&apos;s yesterday with Mark.”
          </Text>
        </View>
        <Text className="text-action mt-3.5 text-[11px] font-bold tracking-wider">
          AI INTERPRETATION
        </Text>
        <View className="mt-2 flex-row gap-2">
          <Field label="Amount" value="$85.50" />
          <Field label="Category" value="Dining" />
        </View>
        <Actions primary="Confirm" secondary="Edit" />
      </GlassSurface>
      <GlassSurface>
        <CardHeader
          source="Scan Result"
          title="Unidentified merchant"
          confidence="Low confidence"
        />
        <View className="border-border bg-background mt-3.5 rounded-lg border p-2.5">
          <Text className="text-muted-foreground text-[10px] font-bold tracking-wider">
            PARTIAL OCR DATA
          </Text>
          <Text className="text-foreground mt-1 text-[13px] leading-[19px]">
            TOTAL: $12.00 · DATE: 12/10/23 · 123 Main St
          </Text>
        </View>
        <View className="mt-2 flex-row gap-2">
          <Field label="Amount" value="$12.00" />
          <Field label="Suggested" value="Uncategorized" />
        </View>
        <Actions primary="Resolve" secondary="Ignore" />
      </GlassSurface>
      <View className="bg-foreground rounded-2xl p-4">
        <Text className="text-lg font-bold text-white">Boost accuracy</Text>
        <Text className="mt-1.5 text-[13px] leading-[19px] text-[#D1D5DB]">
          Connect an account to match captures with statements.
        </Text>
        <Button variant="secondary" className="bg-action-soft mt-4 self-start rounded-full">
          <Text className="text-action text-xs font-bold">Link bank account</Text>
        </Button>
      </View>
    </LedgerScreen>
  );
}

function Metric({
  label,
  value,
  action,
}: {
  label: string;
  value: string;
  action?: boolean;
}) {
  return (
    <View
      className={cn(
        'border-border bg-surface flex-1 rounded-2xl border p-3',
        action && 'border-action bg-action-soft',
      )}
    >
      <Text
        className={cn(
          'text-muted-foreground text-xs font-bold',
          action && 'text-action',
        )}
      >
        {label}
      </Text>
      <Text
        className={cn(
          'text-success mt-2 text-[22px] font-bold',
          action && 'text-foreground',
        )}
      >
        {value}
      </Text>
    </View>
  );
}

function CardHeader({
  source,
  title,
  confidence,
}: {
  source: string;
  title: string;
  confidence: string;
}) {
  const high = confidence.startsWith('High');
  return (
    <View className="flex-row items-start justify-between">
      <View>
        <Text className="text-muted-foreground text-[11px] font-bold tracking-wider">
          {source}
        </Text>
        <Text className="text-foreground mt-1 text-base font-bold">{title}</Text>
      </View>
      <Badge variant={high ? 'success' : 'secondary'}>
        <Text className="uppercase">{confidence}</Text>
      </Badge>
    </View>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View className="border-border bg-background flex-1 rounded-lg border p-2.5">
      <Text className="text-muted-foreground text-[10px] font-bold">{label}</Text>
      <Text className="text-foreground mt-1 text-sm font-bold">{value}</Text>
    </View>
  );
}

function Actions({
  primary,
  secondary,
}: {
  primary: string;
  secondary: string;
}) {
  return (
    <View className="mt-3.5 flex-row gap-2">
      <Button className="bg-foreground flex-1">
        <Text>{primary}</Text>
      </Button>
      <Button variant="secondary">
        <Text className="text-muted-foreground">{secondary}</Text>
      </Button>
    </View>
  );
}
