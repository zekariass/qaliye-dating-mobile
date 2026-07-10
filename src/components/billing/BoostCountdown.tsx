import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/theme';
import type { ActiveBoostInfo } from '@/types/billing';

type Props = {
  activeBoost: ActiveBoostInfo;
  onExpire?: () => void;
};

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function BoostCountdown({ activeBoost, onExpire }: Props) {
  const [remaining, setRemaining] = useState<number>(
    activeBoost?.remaining_seconds ?? 0,
  );
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!activeBoost) return;
    setRemaining(activeBoost.remaining_seconds);
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          onExpire?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [activeBoost, onExpire]);

  if (!activeBoost) return null;

  return (
    <View style={styles.container}>
      <View style={styles.iconRow}>
        <Ionicons name="rocket" size={18} color="#fff" />
        <Text style={styles.label}>Boost Active</Text>
      </View>
      <Text style={styles.timer}>{formatCountdown(remaining)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  timer: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
