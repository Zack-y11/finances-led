import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

type ScreenHeaderProps = {
  eyebrow: string;
  title: string;
  copy?: string;
  className?: string;
};

export function ScreenHeader({
  eyebrow,
  title,
  copy,
  className,
}: ScreenHeaderProps) {
  return (
    <View className={cn(className)}>
      <Text className="text-action text-xs font-bold tracking-wider">
        {eyebrow}
      </Text>
      <Text
        variant="h3"
        className="text-foreground mt-1 text-[28px] font-bold leading-[34px]"
      >
        {title}
      </Text>
      {copy ? (
        <Text variant="muted" className="mt-2 text-sm leading-5">
          {copy}
        </Text>
      ) : null}
    </View>
  );
}
