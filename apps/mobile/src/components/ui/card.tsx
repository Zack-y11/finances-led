import { cva, type VariantProps } from 'class-variance-authority';
import { View } from 'react-native';

import { Text, TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';

const cardVariants = cva('flex flex-col gap-4 rounded-xl py-4', {
  variants: {
    variant: {
      default: 'border-border bg-card border shadow-sm shadow-black/5',
      glass: 'glass-surface border-transparent',
      muted: 'border-border bg-surface-muted border',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

function Card({
  className,
  variant,
  ...props
}: React.ComponentProps<typeof View> &
  React.RefAttributes<View> &
  VariantProps<typeof cardVariants>) {
  return (
    <TextClassContext.Provider value="text-card-foreground">
      <View className={cn(cardVariants({ variant }), className)} {...props} />
    </TextClassContext.Provider>
  );
}

function CardHeader({
  className,
  ...props
}: React.ComponentProps<typeof View> & React.RefAttributes<View>) {
  return <View className={cn('flex flex-col gap-1.5 px-4', className)} {...props} />;
}

function CardTitle({
  className,
  ref,
  ...props
}: React.ComponentProps<typeof Text> & React.RefAttributes<typeof Text>) {
  return (
    <Text
      ref={ref}
      role="heading"
      aria-level={3}
      className={cn('font-semibold leading-none', className)}
      {...props}
    />
  );
}

function CardDescription({
  className,
  ...props
}: React.ComponentProps<typeof Text> & React.RefAttributes<typeof Text>) {
  return <Text className={cn('text-muted-foreground text-sm', className)} {...props} />;
}

function CardContent({
  className,
  ...props
}: React.ComponentProps<typeof View> & React.RefAttributes<View>) {
  return <View className={cn('px-4', className)} {...props} />;
}

function CardFooter({
  className,
  ...props
}: React.ComponentProps<typeof View> & React.RefAttributes<View>) {
  return (
    <View className={cn('flex flex-row items-center px-4', className)} {...props} />
  );
}

export {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  cardVariants,
};
