import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/constants/theme';
import { usePromotionRedemptions } from '@/hooks/billing/usePromotionRedemptions';
import { useTheme } from '@/hooks/use-theme';
import type { RedemptionStatus, UserRedemptionDto } from '@/types/billing';

const STATUS_CONFIG: Record<
  RedemptionStatus,
  { color: string; icon: React.ComponentProps<typeof Ionicons>['name'] }
> = {
  FULFILLED: { color: colors.success, icon: 'checkmark-circle' },
  RESERVED: { color: colors.warning, icon: 'time-outline' },
  CANCELLED: { color: colors.textMuted, icon: 'close-circle-outline' },
  EXPIRED: { color: colors.textMuted, icon: 'alert-circle-outline' },
};

function formatDate(iso: string | null): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

function RedemptionItem({ item }: { item: UserRedemptionDto }) {
  const { colors: th } = useTheme();
  const { t } = useTranslation();
  const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.RESERVED;

  const actionDate =
    item.fulfilled_at ??
    item.cancelled_at ??
    item.expired_at ??
    item.reserved_at;

  const statusLabel: Record<RedemptionStatus, string> = {
    FULFILLED: t('promotion.history.statusFulfilled', 'Active'),
    RESERVED: t('promotion.history.statusReserved', 'Pending'),
    CANCELLED: t('promotion.history.statusCancelled', 'Cancelled'),
    EXPIRED: t('promotion.history.statusExpired', 'Expired'),
  };

  return (
    <View
      style={[
        styles.item,
        { backgroundColor: th.surface, borderColor: th.border },
      ]}
    >
      <View style={[styles.itemIcon, { backgroundColor: cfg.color + '15' }]}>
        <Ionicons name={cfg.icon} size={20} color={cfg.color} />
      </View>
      <View style={styles.itemBody}>
        <Text
          style={[styles.itemName, { color: th.text }]}
          numberOfLines={1}
        >
          {item.campaign_name}
        </Text>
        <Text style={[styles.itemDate, { color: th.textSecondary }]}>
          {formatDate(actionDate)}
        </Text>
      </View>
      <View
        style={[
          styles.statusBadge,
          { backgroundColor: cfg.color + '15' },
        ]}
      >
        <Text style={[styles.statusText, { color: cfg.color }]}>
          {statusLabel[item.status]}
        </Text>
      </View>
    </View>
  );
}

export default function PromotionHistoryScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { top: safeTop, bottom: safeBottom } = useSafeAreaInsets();
  const { colors: th } = useTheme();
  const { redemptions, isLoading, isRefetching, refreshRedemptions } =
    usePromotionRedemptions();

  const handleBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(app)/(tabs)/profile' as any);
  }, [router]);

  const renderEmpty = () => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyWrap}>
        <Ionicons name="gift-outline" size={48} color={th.textMuted} />
        <Text style={[styles.emptyTitle, { color: th.text }]}>
          {t('promotion.history.empty', 'No rewards yet')}
        </Text>
        <Text style={[styles.emptyBody, { color: th.textSecondary }]}>
          {t(
            'promotion.history.emptyBody',
            'Claimed promotions will appear here.',
          )}
        </Text>
      </View>
    );
  };

  return (
    <View
      style={[
        styles.screen,
        { backgroundColor: th.background, paddingTop: safeTop },
      ]}
    >
      <View style={styles.header}>
        <Pressable
          style={[styles.circleBtn, { backgroundColor: th.surface }]}
          onPress={handleBack}
          accessibilityLabel={t('common.back', 'Back')}
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={22} color={th.text} />
        </Pressable>
        <Text style={[styles.title, { color: th.text }]}>
          {t('promotion.history.title', 'My Rewards')}
        </Text>
        <View style={styles.circleBtn} />
      </View>

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={redemptions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <RedemptionItem item={item} />}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: safeBottom + 24 },
          ]}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refreshRedemptions}
              tintColor={colors.primary}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  circleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 8,
    flexGrow: 1,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 8,
  },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemBody: {
    flex: 1,
    gap: 2,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
  },
  itemDate: {
    fontSize: 12,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
