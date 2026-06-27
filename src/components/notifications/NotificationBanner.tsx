import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, shadows } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useNotificationsStore } from '@/stores/notifications-store';
import type { ValidatedNavIntent } from '@/types/notifications';

function getTypeIcon(intent: ValidatedNavIntent | null): React.ComponentProps<typeof Ionicons>['name'] {
  if (!intent) return 'notifications-outline';
  switch (intent.type) {
    case 'CHAT_MESSAGE': return 'chatbubble-outline';
    case 'MATCH_CREATED': return 'heart-outline';
    case 'LIKE_RECEIVED': return 'heart-outline';
    case 'ACCOUNT_ALERT': return 'alert-circle-outline';
    case 'MARKETING': return 'gift-outline';
    default: return 'notifications-outline';
  }
}

export function NotificationBanner() {
  const { colors: th } = useTheme();
  const { top } = useSafeAreaInsets();
  const router = useRouter();
  const banner = useNotificationsStore((s) => s.foregroundBanner);
  const dismiss = useNotificationsStore((s) => s.dismissForegroundBanner);

  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const isVisible = useRef(false);

  useEffect(() => {
    if (banner && !isVisible.current) {
      isVisible.current = true;
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 300 }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else if (!banner && isVisible.current) {
      isVisible.current = false;
      Animated.parallel([
        Animated.timing(translateY, { toValue: -120, duration: 250, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [banner, translateY, opacity]);

  if (!banner) return null;

  const handlePress = () => {
    dismiss();
    if (!banner.navIntent) return;
    const { navIntent } = banner;

    switch (navIntent.type) {
      case 'CHAT_MESSAGE':
        if (navIntent.match_id) {
          router.push({ pathname: '/(app)/chat', params: { matchId: navIntent.match_id } } as any);
        } else {
          router.push('/(app)/(tabs)/messages' as any);
        }
        break;
      case 'MATCH_CREATED':
        router.push('/(app)/(tabs)/matches' as any);
        break;
      case 'LIKE_RECEIVED':
        router.push('/(app)/(tabs)/likes' as any);
        break;
      case 'ACCOUNT_ALERT':
        router.push('/(app)/settings' as any);
        break;
      case 'MARKETING':
        router.push('/(app)/(tabs)/index' as any);
        break;
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        { top: top + 8, transform: [{ translateY }], opacity },
        shadows.soft,
      ]}
      accessibilityLiveRegion="polite"
    >
      <Pressable
        style={[styles.inner, { backgroundColor: th.surface }]}
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={`${banner.title}: ${banner.body}`}
      >
        <View style={[styles.iconWrap, { backgroundColor: colors.primary + '20' }]}>
          <Ionicons
            name={getTypeIcon(banner.navIntent)}
            size={22}
            color={colors.primary}
          />
        </View>
        <View style={styles.textWrap}>
          {!!banner.title && (
            <Text style={[styles.title, { color: th.text }]} numberOfLines={1}>
              {banner.title}
            </Text>
          )}
          {!!banner.body && (
            <Text style={[styles.body, { color: th.textSecondary }]} numberOfLines={2}>
              {banner.body}
            </Text>
          )}
        </View>
        <Pressable
          onPress={dismiss}
          style={styles.closeBtn}
          hitSlop={8}
          accessibilityLabel="Dismiss notification"
        >
          <Ionicons name="close" size={18} color={th.textMuted} />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 9999,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(138, 44, 255, 0.15)',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  body: {
    fontSize: 13,
    lineHeight: 17,
  },
  closeBtn: {
    padding: 4,
  },
});
