import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BlockedUserItem } from '@/api/safety/safetyApi';
import { themedAlert, themedError } from '@/components/common/ThemedAlert';
import { colors, radius } from '@/constants/theme';
import { useBlockedUsers } from '@/hooks/safety/useBlockedUsers';
import { useUnblockUser } from '@/hooks/safety/useUnblockUser';
import { useTheme } from '@/hooks/use-theme';

const SCREEN_W = Dimensions.get('window').width;
const H_PAD = 16;
const COL_GAP = 10;
const CARD_W = (SCREEN_W - H_PAD * 2 - COL_GAP) / 2;
const PHOTO_H = Math.round(CARD_W * 1.3);

export default function BlockedUsersScreen() {
  const router = useRouter();
  const { top: safeTop, bottom: safeBottom } = useSafeAreaInsets();
  const { colors: th } = useTheme();

  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } =
    useBlockedUsers();

  const { mutate: unblock } = useUnblockUser();

  const items: BlockedUserItem[] = data?.pages.flatMap((p) => p.items) ?? [];

  const handleUnblock = (item: BlockedUserItem) => {
    themedAlert({
      title: 'Unblock user?',
      message: `${item.blocked_user.display_name} will be able to appear in your discovery again.`,
      icon: 'checkmark-circle-outline',
      iconColor: colors.success,
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          onPress: () =>
            unblock(item.blocked_user.id, {
              onError: () =>
                themedError('Failed', 'Could not unblock. Please try again.'),
            }),
        },
      ],
    });
  };

  const renderCard = ({ item, index }: { item: BlockedUserItem; index: number }) => {
    const user = item.blocked_user;
    const isRightCol = index % 2 === 1;
    return (
      <View
        style={[
          styles.card,
          { backgroundColor: th.surface, borderColor: th.border, marginLeft: isRightCol ? COL_GAP : 0 },
        ]}
      >
        <View style={[styles.photoWrap, { backgroundColor: th.backgroundSelected }]}>
          {user.primary_photo_url ? (
            <Image
              source={{ uri: user.primary_photo_url }}
              style={styles.photo}
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
            />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Ionicons name="person-outline" size={40} color={th.textMuted} />
            </View>
          )}

          {/* Unblock button */}
          <Pressable
            style={styles.unblockBtn}
            onPress={() => handleUnblock(item)}
            accessibilityRole="button"
            accessibilityLabel={`Unblock ${user.display_name}`}
            hitSlop={8}
          >
            <Ionicons name="close" size={14} color="#FFF" />
          </Pressable>
        </View>

        <View style={styles.cardBody}>
          <Text style={[styles.name, { color: th.text }]} numberOfLines={1}>
            {user.display_name}
          </Text>
          {user.address && (
            <Text style={[styles.location, { color: th.textMuted }]} numberOfLines={1}>
              {user.address.city_name}, {user.address.country_code}
            </Text>
          )}
        </View>
      </View>
    );
  };

  const renderFooter = () => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: th.background, paddingTop: safeTop }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={[styles.circleBtn, { backgroundColor: th.surface }]}
          onPress={() => router.back()}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={22} color={th.text} />
        </Pressable>
        <Text style={[styles.title, { color: th.text }]}>Blocked Users</Text>
        <View style={styles.circleBtn} />
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : isError ? (
        <View style={styles.centered}>
          <Text style={[styles.emptyText, { color: th.textMuted }]}>
            Failed to load blocked users.
          </Text>
          <Pressable style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryLabel}>Retry</Text>
          </Pressable>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="ban-outline" size={52} color={th.textMuted} />
          <Text style={[styles.emptyTitle, { color: th.text }]}>No blocked users</Text>
          <Text style={[styles.emptyText, { color: th.textMuted }]}>
            Users you block will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderCard}
          numColumns={2}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: safeBottom + 24 },
          ]}
          columnWrapperStyle={styles.columnWrapper}
          onEndReached={() => hasNextPage && fetchNextPage()}
          onEndReachedThreshold={0.4}
          ListFooterComponent={renderFooter}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 32,
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
  listContent: {
    paddingHorizontal: H_PAD,
    paddingTop: 8,
  },
  columnWrapper: {
    marginBottom: COL_GAP,
  },
  card: {
    width: CARD_W,
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  photoWrap: {
    width: CARD_W,
    height: PHOTO_H,
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unblockBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.62)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 2,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
  },
  location: {
    fontSize: 12,
    fontWeight: '400',
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginTop: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: 4,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.primary,
  },
  retryLabel: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});
