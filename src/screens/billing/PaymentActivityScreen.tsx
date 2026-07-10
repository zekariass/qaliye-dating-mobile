import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    AppState,
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OrderCard } from '@/components/billing/OrderCard';
import { colors } from '@/constants/theme';
import { useOrderResume } from '@/hooks/billing/useOrderResume';
import { useOrders, usePendingOrders } from '@/hooks/billing/useOrders';
import { useTheme } from '@/hooks/use-theme';
import type { OrderListItem } from '@/types/billing';

type Tab = 'pending' | 'history';

export default function PaymentActivityScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { top, bottom } = useSafeAreaInsets();
  const { colors: th } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>('pending');
  const { resume, viewDetail, retry } = useOrderResume();
  const appStateRef = useRef(AppState.currentState);

  const {
    pendingOrders,
    isPendingLoading,
    refreshPending,
    historyOrders,
    fetchNextHistoryPage,
    hasNextHistoryPage,
    isHistoryLoading,
    isHistoryFetchingNext,
    refreshHistory,
  } = useOrders(true);

  const { refetch: refetchPendingBadge } = usePendingOrders(true);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (appStateRef.current !== 'active' && nextState === 'active') {
        refreshPending();
        refreshHistory();
      }
      appStateRef.current = nextState;
    });
    return () => sub.remove();
  }, [refreshPending, refreshHistory]);

  const handleOrderAction = useCallback(
    async (action: import('@/components/billing/OrderCard').OrderAction, order: OrderListItem) => {
      switch (action) {
        case 'resume':
          await resume(order);
          break;
        case 'retry':
          retry(order);
          break;
        case 'detail':
          viewDetail(order);
          break;
        case 'refresh':
          await refreshPending();
          break;
      }
    },
    [resume, viewDetail, retry, refreshPending],
  );

  const renderOrder = useCallback(
    ({ item }: { item: OrderListItem }) => (
      <OrderCard
        order={item}
        onAction={handleOrderAction}
        textColor={th.text}
        secondaryColor={th.textSecondary}
        surfaceColor={th.surface}
        borderColor={th.border}
      />
    ),
    [handleOrderAction, th],
  );

  const keyExtractor = useCallback((item: OrderListItem) => item.id, []);
  const itemSeparator = useCallback(
    () => <View style={{ height: 12 }} />,
    [],
  );

  const handleRefresh = useCallback(() => {
    if (activeTab === 'pending') {
      refreshPending();
    } else {
      refreshHistory();
    }
  }, [activeTab, refreshPending, refreshHistory]);

  const isLoading = activeTab === 'pending' ? isPendingLoading : isHistoryLoading;
  const orders = activeTab === 'pending' ? pendingOrders : historyOrders;

  return (
    <View style={[styles.screen, { backgroundColor: th.background, paddingTop: top }]}>
      <View style={styles.header}>
        <Pressable
          style={[styles.backBtn, { backgroundColor: th.backgroundElement }]}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('common.back', 'Back')}
        >
          <Ionicons name="chevron-back" size={20} color={th.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: th.text }]}>
          {t('billing.paymentActivity', 'Payment Activity')}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={[styles.tabBar, { backgroundColor: th.surface, borderColor: th.border }]}>
        <TabButton
          active={activeTab === 'pending'}
          label={t('billing.pending', 'Pending')}
          onPress={() => setActiveTab('pending')}
          textColor={th.text}
          activeColor={colors.primary}
        />
        <TabButton
          active={activeTab === 'history'}
          label={t('billing.history', 'History')}
          onPress={() => setActiveTab('history')}
          textColor={th.text}
          activeColor={colors.primary}
        />
      </View>

      {isLoading && orders.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons
            name={activeTab === 'pending' ? 'checkmark-circle' : 'receipt-outline'}
            size={48}
            color={th.textSecondary}
          />
          <Text style={[styles.emptyTitle, { color: th.text }]}>
            {activeTab === 'pending'
              ? t('billing.noPendingOrders', 'No pending orders')
              : t('billing.noOrderHistory', 'No order history')}
          </Text>
          <Text style={[styles.emptyBody, { color: th.textSecondary }]}>
            {activeTab === 'pending'
              ? t('billing.noPendingOrdersBody', 'You have no payments waiting for action.')
              : t('billing.noOrderHistoryBody', 'Your past payments will appear here.')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          renderItem={renderOrder}
          keyExtractor={keyExtractor}
          ItemSeparatorComponent={itemSeparator}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: bottom + 24 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isLoading && orders.length > 0}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          onEndReached={activeTab === 'history' ? () => {
            if (hasNextHistoryPage && !isHistoryFetchingNext) {
              fetchNextHistoryPage();
            }
          } : undefined}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            activeTab === 'history' && isHistoryFetchingNext ? (
              <ActivityIndicator style={{ marginVertical: 16 }} color={colors.primary} />
            ) : null
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

function TabButton({
  active,
  label,
  onPress,
  textColor,
  activeColor,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
  textColor: string;
  activeColor: string;
}) {
  return (
    <Pressable
      style={[styles.tabButton, active && { borderBottomColor: activeColor, borderBottomWidth: 2 }]}
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.tabLabel, { color: active ? activeColor : textColor }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  tabLabel: { fontSize: 14, fontWeight: '700' },
  list: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
  },
  emptyBody: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
});
