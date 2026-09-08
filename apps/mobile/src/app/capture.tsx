import { useState } from 'react';
import { View } from 'react-native';
import { Link } from 'expo-router';

import { Button } from '@/components/ui/button';
import { GlassSurface } from '@/components/ui/glass-surface';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LedgerScreen } from '@/components/ui/ledger-screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Text } from '@/components/ui/text';

export default function CaptureScreen() {
  const [note, setNote] = useState('');
  const [showProposal, setShowProposal] = useState(false);
  return (
    <LedgerScreen>
      <ScreenHeader
        eyebrow="QUICK CAPTURE"
        title="Capture it while it is fresh."
        copy="Turn a short note into a reviewable ledger proposal."
      />
      <GlassSurface>
        <Label>WHAT HAPPENED?</Label>
        <Input
          multiline
          className="mt-2 min-h-[120px] py-3"
          onChangeText={(value) => {
            setNote(value);
            setShowProposal(false);
          }}
          placeholder="e.g. Gaste 3.19 en Starbucks con BAC"
          style={{ textAlignVertical: 'top' }}
          value={note}
        />
        <Button
          className="mt-3"
          disabled={!note.trim()}
          onPress={() => setShowProposal(true)}
        >
          <Text>Interpret entry →</Text>
        </Button>
      </GlassSurface>
      {showProposal ? (
        <GlassSurface>
          <Text className="text-action text-[11px] font-bold tracking-wider">
            PROPOSAL PREVIEW
          </Text>
          <Text className="text-foreground mt-2 text-lg font-bold">
            Dining expense · $3.19
          </Text>
          <Text className="text-muted-foreground mt-1 text-[13px]">
            BAC Checking · Today · needs confirmation
          </Text>
          <View className="mt-3 flex-row gap-2">
            <Button className="flex-1" variant="outline">
              <Text>Edit</Text>
            </Button>
            <Button className="flex-1">
              <Text>Approve</Text>
            </Button>
          </View>
        </GlassSurface>
      ) : null}
      <GlassSurface>
        <Text className="text-foreground text-[17px] font-bold">
          Capture modes
        </Text>
        <Text className="text-muted-foreground mt-2 text-sm leading-5">
          Voice and receipts record in app cache, extract on the API, then
          delete the local media. Raw photos are never kept.
        </Text>
        <Link asChild href={'/voice-capture' as any}>
          <Button className="mt-3">
            <Text>Open voice capture</Text>
          </Button>
        </Link>
        <Link asChild href={'/receipt-capture' as any}>
          <Button className="mt-2" variant="outline">
            <Text>Open receipt capture</Text>
          </Button>
        </Link>
      </GlassSurface>
    </LedgerScreen>
  );
}
