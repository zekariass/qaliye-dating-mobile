import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import {
    ActivityIndicator,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';

import { colors, fontSize, radius, spacing } from '@/constants/theme';
import { useEntitlements } from '@/hooks/billing/useEntitlements';
import { useAcceptSuperMessage, usePassSuperMessage } from '@/hooks/discovery/useSuperMessageActions';
import { useTheme } from '@/hooks/use-theme';
import type { SuperMessageDto } from '@/types/superMessage';
import { isInsufficientCreditsError } from '@/utils/entitlements';
import { showActionErrorAlert } from '@/utils/limitExceededAlert';

// ---------------------------------------------------------------------------
// Timestamp
// ---------------------------------------------------------------------------
function formatTimestamp(isoString: string | null | undefined): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffMinutes < 60) return `${Math.max(diffMinutes, 1)}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()
  ) {
    return 'Yesterday';
  }
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

// ---------------------------------------------------------------------------
// SuperMessageDetailModal
// ---------------------------------------------------------------------------

export interface SuperMessageDetailModalProps {
  visible: boolean;
  item: SuperMessageDto | null;
  direction: 'sent' | 'received' | null;
  onClose: () => void;
}

export default function SuperMessageDetailModal({
  visible,
  item,
  direction,
  onClose,
}: SuperMessageDetailModalProps) {
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';
  const router = useRouter();
  const { entitlements } = useEntitlements();

  const acceptMutation = useAcceptSuperMessage();
  const passMutation = usePassSuperMessage();
  const isBusy = acceptMutation.isPending || passMutation.isPending;

  const handleClose = useCallback(() => onClose(), [onClose]);

  const handleAccept = useCallback(() => {
    if (!item || isBusy) return;
    acceptMutation.mutate(item.id, {
      onSuccess: (res) => {
        if (res.matched && res.match_id) {
          onClose();
          router.push({
            pathname: '/(app)/chat' as any,
            params: {
              matchId: res.match_id,
              displayName: item.sender?.display_name ?? '',
              avatarUrl: item.sender?.photo_url ?? '',
            },
          });
        } else {
          onClose();
        }
      },
      onError: (err: any) => {
        const code = err?.response?.data?.error?.code as string | undefined;
        if (code === 'super_message_already_responded' || code === 'SUPER_MESSAGE_ALREADY_RESPONDED') {
          onClose();
          return;
        }
        if (isInsufficientCreditsError(err)) return;
        showActionErrorAlert(err, router, {
          subscriptionEnabled: entitlements?.country_settings?.subscription_enabled ?? true,
          creditsEnabled: entitlements?.country_settings?.credits_enabled ?? true,
          actionTypeOverride: 'LIKES',
        });
      },
    });
  }, [item, isBusy, acceptMutation, onClose, router, entitlements]);

  const handlePass = useCallback(() => {
    if (!item || isBusy) return;
    passMutation.mutate(item.id, {
      onSuccess: () => onClose(),
      onError: (err: any) => {
        const code = err?.response?.data?.error?.code as string | undefined;
        if (code === 'super_message_already_responded' || code === 'SUPER_MESSAGE_ALREADY_RESPONDED') {
          onClose();
          return;
        }
        showActionErrorAlert(err, router, {
          subscriptionEnabled: entitlements?.country_settings?.subscription_enabled ?? true,
          creditsEnabled: entitlements?.country_settings?.credits_enabled ?? true,
        });
      },
    });
  }, [item, isBusy, passMutation, onClose, router, entitlements]);

  if (!item || !direction) return null;

  const isSent = direction === 'sent';
  const isReceived = !isSent;
  const alreadyResponded = item.status === 'ACCEPTED' || item.status === 'PASSED';
  const showActions = isReceived && !alreadyResponded;
  const otherParty = isSent ? item.receiver : item.sender;
  const displayName = otherParty?.display_name ?? 'Unknown';
  const photoUrl = otherParty?.photo_url ?? null;
  const timestampLabel = formatTimestamp(item.created_at);
  const statusLabel = isSent
    ? item.match_id ? 'Matched!' : 'Awaiting reply'
    : item.status === 'ACCEPTED' ? 'Accepted'
    : item.status === 'PASSED' ? 'Passed'
    : item.viewed_at ? 'Viewed' : 'New';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      <View style={styles.kav} pointerEvents="box-none">
        <View style={[styles.sheet, { backgroundColor: isDark ? th.surface : '#FFFFFF' }]}>
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: isDark ? '#4B3B7A' : '#DDD5F5' }]} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.targetInfo}>
              {photoUrl ? (
                <Image
                  source={{ uri: photoUrl }}
                  style={styles.avatar}
                  contentFit="cover"
                />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: isDark ? '#3D2A6E' : '#EDE0FF' }]}>
                  <Ionicons name="person" size={20} color={colors.primary} />
                </View>
              )}
              <View style={styles.targetText}>
                <View style={styles.titleRow}>
                  <Ionicons name="star" size={15} color="#F59E0B" style={{ marginRight: 4 }} />
                  <Text style={[styles.modalTitle, { color: isDark ? '#FFFFFF' : '#1A1A2E' }]}>
                    Pre-Match Message
                  </Text>
                </View>
                <Text style={[styles.targetName, { color: th.textSecondary }]} numberOfLines={1}>
                  {isSent ? `to ${displayName}` : `from ${displayName}`}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={handleClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={22} color={th.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Status + timestamp row */}
          <View style={styles.metaRow}>
            <View style={[
              styles.statusPill,
              {
                backgroundColor: item.match_id
                  ? '#16A34A'
                  : isDark ? '#3D2A6E' : '#F3EEFF',
              },
            ]}>
              <Text style={[
                styles.statusText,
                { color: item.match_id ? '#FFFFFF' : isDark ? '#C4AEF0' : colors.primary },
              ]}>
                {statusLabel}
              </Text>
            </View>
            {timestampLabel ? (
              <Text style={[styles.timestamp, { color: isDark ? '#7C6EA0' : '#9CA3AF' }]}>
                {timestampLabel}
              </Text>
            ) : null}
          </View>

          {/* Message body */}
          <View style={[styles.messageWrap, { backgroundColor: isDark ? '#1A1230' : '#F8F4FF' }]}>
            <ScrollView style={styles.messageScroll} showsVerticalScrollIndicator={false}>
              <Text style={[styles.messageText, { color: th.text }]}>
                {item.message}
              </Text>
            </ScrollView>
          </View>

          {/* Footer actions */}
          <View style={styles.footer}>
            {showActions ? (
              <>
                {/* Pass button */}
                <TouchableOpacity
                  style={[styles.passBtn, { borderColor: isDark ? '#4B3B7A' : '#DDD5F5' }, isBusy && styles.btnDisabled]}
                  onPress={handlePass}
                  activeOpacity={0.8}
                  disabled={isBusy}
                >
                  {passMutation.isPending ? (
                    <ActivityIndicator size="small" color={th.textSecondary} />
                  ) : (
                    <Text style={[styles.passBtnText, { color: th.textSecondary }]}>Pass</Text>
                  )}
                </TouchableOpacity>
                {/* Accept button */}
                <TouchableOpacity
                  style={[styles.acceptBtn, isBusy && styles.btnDisabled]}
                  onPress={handleAccept}
                  activeOpacity={0.8}
                  disabled={isBusy}
                >
                  {acceptMutation.isPending ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.acceptBtnText}>Accept</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={[styles.closeBtn, { borderColor: isDark ? '#4B3B7A' : '#DDD5F5' }]}
                onPress={handleClose}
                activeOpacity={0.8}
              >
                <Text style={[styles.closeBtnText, { color: th.textSecondary }]}>Close</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  kav: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 36 : 64,
    paddingTop: 12,
    gap: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.18,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: -4 },
      },
      android: { elevation: 16 },
    }),
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  targetInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetText: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: fontSize.md,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  targetName: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    marginTop: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  timestamp: {
    fontSize: 12,
    fontWeight: '600',
  },
  messageWrap: {
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 100,
    maxHeight: 220,
  },
  messageScroll: {
    flex: 1,
  },
  messageText: {
    fontSize: fontSize.sm,
    lineHeight: 22,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 4,
  },
  closeBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: radius.full,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  passBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: radius.full,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  passBtnText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  acceptBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  acceptBtnText: {
    color: '#FFFFFF',
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.5,
  },
});
