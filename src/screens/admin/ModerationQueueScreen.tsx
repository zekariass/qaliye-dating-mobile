import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fetchModerationPhotos, moderatePhoto } from '@/api/admin/adminApi';
import { themedAlert, themedError } from '@/components/common/ThemedAlert';
import { colors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { PhotoModerationItemDto } from '@/types/admin';

// ─── Query key ────────────────────────────────────────────────────────────────

const MODERATION_QUEUE_KEY = ['admin', 'moderation', 'photos'] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffH = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffH < 1) return `${Math.max(1, Math.floor(diffMs / 60000))}m ago`;
  if (diffH < 24) return `${diffH}h ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ─── Queue item card ──────────────────────────────────────────────────────────

function ModerationCard({
  item,
  onApprove,
  onReject,
  isActing,
}: {
  item: PhotoModerationItemDto;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  isActing: boolean;
}) {
  const { t } = useTranslation();
  const { colors: th } = useTheme();

  const showAiBadge = item.ai_generated_detected === true;
  const confidence = item.ai_generated_confidence != null
    ? Math.round(item.ai_generated_confidence * 100)
    : null;

  return (
    <View style={[styles.card, { backgroundColor: th.surface, borderColor: th.border }]}>
      {/* Photo */}
      <View style={styles.imageWrap}>
        <Image
          source={{ uri: item.image_url }}
          style={styles.image}
          contentFit="cover"
          transition={200}
        />
        {/* AI badge overlaid on photo */}
        {showAiBadge && (
          <View style={styles.aiBadge}>
            <Ionicons name="sparkles" size={9} color="#fff" />
            <Text style={styles.aiBadgeText}>
              {t('admin.moderation.aiBadge', 'AI')}
              {confidence != null ? ` · ${confidence}%` : ''}
            </Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={[styles.userName, { color: th.text }]} numberOfLines={1}>
          {item.display_name}
        </Text>
        <Text style={[styles.date, { color: th.textSecondary }]}>
          {formatDate(item.created_at)}
        </Text>

        {/* AI detection details */}
        {showAiBadge && (
          <View style={[styles.aiSection, { backgroundColor: '#FEF3C780', borderColor: '#F59E0B' }]}>
            <Text style={styles.aiSectionLabel}>
              {t('admin.moderation.aiDetectionSection', 'AI Detection')}
            </Text>
            {confidence != null && (
              <Text style={styles.aiSectionValue}>
                {t('admin.moderation.aiConfidence', '{{confidence}}% confidence', { confidence })}
              </Text>
            )}
            {item.ai_detected_generator && (
              <Text style={styles.aiSectionValue}>
                {t('admin.moderation.aiGenerator', 'Generator: {{generator}}', { generator: item.ai_detected_generator })}
              </Text>
            )}
            {item.ai_detection_action && (
              <Text style={styles.aiSectionValue}>
                {t('admin.moderation.aiAction', 'Action: {{action}}', { action: item.ai_detection_action })}
              </Text>
            )}
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.approveBtn]}
            onPress={() => onApprove(item.id)}
            disabled={isActing}
            accessibilityRole="button"
            accessibilityLabel={t('admin.moderation.approve', 'Approve')}
          >
            {isActing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={15} color="#fff" />
                <Text style={styles.actionBtnText}>{t('admin.moderation.approve', 'Approve')}</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.rejectBtn]}
            onPress={() => onReject(item.id)}
            disabled={isActing}
            accessibilityRole="button"
            accessibilityLabel={t('admin.moderation.reject', 'Reject')}
          >
            {isActing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="close-circle-outline" size={15} color="#fff" />
                <Text style={styles.actionBtnText}>{t('admin.moderation.reject', 'Reject')}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ModerationQueueScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors: th } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [actingId, setActingId] = useState<string | null>(null);

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: MODERATION_QUEUE_KEY,
    queryFn: () => fetchModerationPhotos('MANUAL_REVIEW'),
  });

  const { mutateAsync: doModerate } = useMutation({
    mutationFn: ({ photoId, decision }: { photoId: string; decision: 'APPROVED' | 'REJECTED' }) =>
      moderatePhoto(photoId, decision),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MODERATION_QUEUE_KEY });
    },
  });

  const handleApprove = useCallback((photoId: string) => {
    themedAlert({
      title: t('admin.moderation.confirmApprove', 'Approve this photo?'),
      message: t('admin.moderation.confirmApproveBody', 'The photo will be approved and become visible.'),
      icon: 'checkmark-circle',
      iconColor: '#16A34A',
      buttons: [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('admin.moderation.approve', 'Approve'),
          style: 'default',
          onPress: async () => {
            setActingId(photoId);
            try {
              await doModerate({ photoId, decision: 'APPROVED' });
            } catch {
              themedError(
                t('common.error', 'Error'),
                t('admin.moderation.actionError', 'Failed to update photo status.'),
              );
            } finally {
              setActingId(null);
            }
          },
        },
      ],
    });
  }, [doModerate, t]);

  const handleReject = useCallback((photoId: string) => {
    themedAlert({
      title: t('admin.moderation.confirmReject', 'Reject this photo?'),
      message: t('admin.moderation.confirmRejectBody', "The photo will be rejected and hidden from the user's profile."),
      icon: 'close-circle',
      iconColor: '#EF4444',
      buttons: [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('admin.moderation.reject', 'Reject'),
          style: 'destructive',
          onPress: async () => {
            setActingId(photoId);
            try {
              await doModerate({ photoId, decision: 'REJECTED' });
            } catch {
              themedError(
                t('common.error', 'Error'),
                t('admin.moderation.actionError', 'Failed to update photo status.'),
              );
            } finally {
              setActingId(null);
            }
          },
        },
      ],
    });
  }, [doModerate, t]);

  const items = data?.items ?? [];

  return (
    <View style={[styles.container, { backgroundColor: th.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: th.surface, borderBottomColor: th.border }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('common.back', 'Back')}
        >
          <Ionicons name="arrow-back" size={24} color={th.text} />
        </TouchableOpacity>
        <View style={styles.headerTitles}>
          <Text style={[styles.headerTitle, { color: th.text }]}>
            {t('admin.moderation.title', 'Moderation Queue')}
          </Text>
          <Text style={[styles.headerSubtitle, { color: th.textSecondary }]}>
            {t('admin.moderation.subtitle', 'Photos pending manual review')}
          </Text>
        </View>
        {items.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{items.length}</Text>
          </View>
        )}
      </View>

      {/* Body */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={40} color={th.textSecondary} />
          <Text style={[styles.emptyTitle, { color: th.text }]}>
            {t('admin.moderation.loadError', 'Failed to load moderation queue.')}
          </Text>
          <TouchableOpacity style={[styles.retryBtn, { borderColor: th.border }]} onPress={() => refetch()}>
            <Text style={[styles.retryBtnText, { color: colors.primary }]}>{t('common.retry', 'Retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="checkmark-done-circle-outline" size={52} color={th.textSecondary} />
          <Text style={[styles.emptyTitle, { color: th.text }]}>
            {t('admin.moderation.empty', 'No photos pending review')}
          </Text>
          <Text style={[styles.emptyHint, { color: th.textSecondary }]}>
            {t('admin.moderation.emptyHint', 'All caught up! Check back later.')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
          }
          renderItem={({ item }) => (
            <ModerationCard
              item={item}
              onApprove={handleApprove}
              onReject={handleReject}
              isActing={actingId === item.id}
            />
          )}
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerTitles: { flex: 1 },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  headerSubtitle: { fontSize: 12, marginTop: 1 },
  countBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  countBadgeText: { fontSize: 12, fontWeight: '700', color: '#fff' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },

  emptyTitle: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
  emptyHint: { fontSize: 14, textAlign: 'center' },

  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  retryBtnText: { fontSize: 14, fontWeight: '600' },

  list: { padding: 16, gap: 12 },

  // Card
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  imageWrap: {
    width: 120,
    height: 160,
    flexShrink: 0,
  },
  image: { width: 120, height: 160 },

  // AI badge on photo
  aiBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(161,97,0,0.90)',
    gap: 3,
  },
  aiBadgeText: { fontSize: 10, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },

  info: {
    flex: 1,
    padding: 12,
    gap: 4,
  },
  userName: { fontSize: 14, fontWeight: '700' },
  date: { fontSize: 12 },

  // AI detection section
  aiSection: {
    marginTop: 6,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 2,
  },
  aiSectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#92400E',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  aiSectionValue: { fontSize: 11, color: '#92400E' },

  // Action buttons
  actions: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 'auto',
    paddingTop: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  approveBtn: { backgroundColor: '#16A34A' },
  rejectBtn: { backgroundColor: '#EF4444' },
  actionBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },
});
