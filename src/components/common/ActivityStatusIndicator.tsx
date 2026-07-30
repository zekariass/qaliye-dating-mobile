import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';

import type { ActivityStatus } from '@/types/activity';

interface Props {
  status: ActivityStatus | null | undefined;
  /** Show text label alongside the dot */
  showLabel?: boolean;
  /** Dot diameter in dp (default 8) */
  size?: number;
  /** Override label text colour. Defaults to the dot colour. */
  labelColor?: string;
  /** Label font size (default 12) */
  labelFontSize?: number;
  style?: StyleProp<ViewStyle>;
}

const DOT_COLOR: Partial<Record<ActivityStatus, string>> = {
  ONLINE: '#22C55E',
  RECENTLY_ACTIVE: '#F59E0B',
  OFFLINE: '#9CA3AF',
};

const STATUS_LABEL: Partial<Record<ActivityStatus, string>> = {
  ONLINE: 'Online',
  RECENTLY_ACTIVE: 'Recently online',
  OFFLINE: 'Offline now',
};

export function ActivityStatusIndicator({
  status,
  showLabel = false,
  size = 8,
  labelColor,
  labelFontSize = 12,
  style,
}: Props) {
  if (!status || status === 'HIDDEN') return null;

  const dotColor = DOT_COLOR[status];
  const label = showLabel ? STATUS_LABEL[status] : undefined;

  if (!dotColor && !label) return null;

  const effectiveLabelColor = labelColor ?? dotColor ?? '#6B7280';

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
        <Text
          style={[styles.label, { color: effectiveLabelColor, fontSize: labelFontSize }]}
          numberOfLines={1}
        >
          {label}
        </Text>
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
