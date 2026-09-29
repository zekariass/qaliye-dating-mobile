import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import i18n from '@/i18n';
import type { CurrentUserProfile } from '../mockCurrentUserProfile';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface StatusItem {
  id: 'visibility' | 'onboarding' | 'verification' | 'completion';
  icon: IoniconName;
  label: string;
  value: string;
  active: boolean;
}

function buildStatusItems(p: CurrentUserProfile): StatusItem[] {
  return [
    {
      id: 'visibility',
      icon: 'eye-outline',
      label: i18n.t('profile.status.profileVisibility'),
      value: p.isVisible ? i18n.t('profile.status.visible') : i18n.t('profile.status.hidden'),
      active: p.isVisible,
    },
    {
      id: 'onboarding',
      icon: 'checkmark-done-outline',
      label: i18n.t('profile.status.onboardingStatus'),
      value: p.isOnboarded ? i18n.t('profile.status.completed') : i18n.t('profile.status.inProgress'),
      active: p.isOnboarded,
    },
    {
      id: 'verification',
      icon: 'shield-checkmark-outline',
      label: i18n.t('profile.status.verificationStatus'),
      value: p.isVerified ? i18n.t('profile.status.verified') : i18n.t('profile.status.notVerified'),
      active: p.isVerified,
    },
    {
      id: 'completion',
      icon: 'speedometer-outline',
      label: i18n.t('profile.status.profileCompletion'),
      value: i18n.t('profile.status.completionPercent', { percent: p.profileCompletionScore }),
      active: p.profileCompletionScore >= 80,
    },
  ];
}

interface StatusContentProps {
  profile: CurrentUserProfile;
}

export default function StatusContent({ profile }: StatusContentProps) {
  const { t } = useTranslation();
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';
  const router = useRouter();
  const items = buildStatusItems(profile);
  const showCompleteBtn = profile.profileCompletionScore < 100;

  const surfaceBg = th.surface;
  const iconBg = isDark ? th.backgroundSelected : '#F3EEFF';
  const borderCol = isDark ? 'rgba(46,31,80,0.22)' : 'rgba(233,221,248,0.5)';
  const textCol = th.text;
  const mutedCol = th.textSecondary;

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.listCard,
          {
            backgroundColor: surfaceBg,
            borderColor: borderCol,
            ...Platform.select({
              ios: { shadowColor: '#8A2CFF', shadowOpacity: isDark ? 0.15 : 0.06, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } },
              android: { elevation: 3 },
            }) as any,
          },
        ]}
      >
        {items.map((item, idx) => (
          <View key={item.id}>
            {idx > 0 && <View style={[styles.divider, { backgroundColor: borderCol }]} />}
            <View style={styles.listRow}>
              <View style={[styles.detailIconWrap, { backgroundColor: iconBg, borderColor: borderCol }]}>
                <Ionicons name={item.icon} size={17} color={colors.primary} />
              </View>
              <View style={styles.detailBody}>
                <Text style={[styles.detailLabel, { color: mutedCol }]}>{item.label}</Text>
                <View style={styles.valueRow}>
                  <Text style={[styles.detailValue, { color: textCol }]}>{item.value}</Text>
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: item.active ? colors.success : '#D1D5DB' },
                    ]}
                  />
                </View>
                {item.id === 'completion' && showCompleteBtn && (
                  <Pressable
                    style={[styles.completeBtn, { backgroundColor: colors.primary }]}
                    onPress={() => router.push('/(app)/edit-profile' as any)}
                    accessibilityLabel={t('profile.status.completeProfile')}
                    accessibilityRole="button"
                  >
                    <Text style={styles.completeBtnText}>{t('profile.status.completeProfile')}</Text>
                    <Ionicons name="arrow-forward" size={14} color="#fff" />
                  </Pressable>
                )}
                {item.id === 'verification' && !profile.isVerified && (
                  <Pressable
                    style={[styles.completeBtn, { backgroundColor: colors.primary }]}
                    onPress={() => router.push('/(app)/verify-identity' as any)}
                    accessibilityLabel={t('profile.verifyIdentity')}
                    accessibilityRole="button"
                  >
                    <Ionicons name="shield-checkmark-outline" size={14} color="#fff" />
                    <Text style={styles.completeBtnText}>{t('profile.status.verify')}</Text>
                  </Pressable>
                )}
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  listCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
  },
  detailIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  detailBody: {
    flex: 1,
    minWidth: 0,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 15.5,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  completeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 8,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  completeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
});
