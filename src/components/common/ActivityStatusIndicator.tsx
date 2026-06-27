import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';

import type { ActivityStatus } from '@/types/activity';

interface Props {
  status: ActivityStatus | null | undefined;
  /** Show text label alongside the dot */
  showLabel?: boolean;
  /** Dot diameter in dp (default 8) */
  size?: number;
  /** Override label text colour */
  labelColor?: string;
  style?: StyleProp<ViewStyle>;
}

const DOT_COLOR: Partial<Record<ActivityStatus, string>> = {
  ONLINE: '#22C55E',
  RECENTLY_ACTIVE: '#F59E0B',
};

const STATUS_LABEL: Partial<Record<ActivityStatus, string>> = {
  ONLINE: 'Online',
  RECENTLY_ACTIVE: 'Recently active',
};

export function ActivityStatusIndicator({
  status,
  showLabel = false,
  size = 8,
  labelColor = '#6B7280',
  style,
}: Props) {
  if (!status || status === 'HIDDEN') return null;

  const dotColor = DOT_COLOR[status];
  const label = showLabel ? STATUS_LABEL[status] : undefined;

  if (!dotColor && !label) return null;

  return (
    <View style={[styles.row, style]}>
      {!!dotColor && (
        <View
          style={[
            styles.dot,
            { width: size, height: size, borderRadius: size / 2, backgroundColor: dotColor },
          ]}
          accessibilityElementsHidden
        />
      )}
      {!!label && (
        <Text style={[styles.label, { color: labelColor }]}>{label}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {},
  label: {
    fontSize: 12,
    fontWeight: '500',
  },
});
