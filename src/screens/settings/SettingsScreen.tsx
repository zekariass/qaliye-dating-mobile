import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NotificationSettingsSection } from '@/components/notifications/NotificationSettingsSection';
import { ReviewPassedProfilesSheet } from '@/components/settings/ReviewPassedProfilesSheet';
import { colors } from '@/constants/theme';
import { useActivityVisibility } from '@/hooks/activity/useActivityVisibility';
import { useSignOutWithDeactivation } from '@/hooks/notifications/useSignOutWithDeactivation';
import { useTheme } from '@/hooks/use-theme';
import { ThemeMode, useThemeStore } from '@/stores/theme-store';

const THEME_OPTIONS: { key: ThemeMode; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { key: 'light', label: 'Light', icon: 'sunny-outline' },
  { key: 'dark', label: 'Dark', icon: 'moon-outline' },
  { key: 'system', label: 'System', icon: 'contrast-outline' },
];

export default function SettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { top: safeTop, bottom: safeBottom } = useSafeAreaInsets();
  const { colors: th } = useTheme();
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);
  const { showActivityStatus, update: updateVisibility, isUpdating: isUpdatingVisibility } = useActivityVisibility();
  const { signOut } = useSignOutWithDeactivation();
  const [revisitSheetVisible, setRevisitSheetVisible] = useState(false);

  const handleSignOut = useCallback(() => {
    Alert.alert(
      t('settings.signOutTitle', 'Sign Out'),
      t('settings.signOutConfirm', 'Are you sure you want to sign out?'),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('settings.signOut', 'Sign Out'),
          style: 'destructive',
          onPress: signOut,
        },
      ],
    );
  }, [t, signOut]);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(app)/(tabs)/profile' as any);
    }
  }, [router]);

  return (
    <View style={[styles.screen, { backgroundColor: th.background, paddingTop: safeTop }]}>
      <View style={styles.header}>
        <Pressable
          style={[styles.circleBtn, { backgroundColor: th.surface }]}
          onPress={handleBack}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={22} color={th.text} />
        </Pressable>
        <Text style={[styles.title, { color: th.text }]}>{t('settings.title', 'Settings')}</Text>
        <View style={styles.circleBtn} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: safeBottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, { backgroundColor: th.surface, borderColor: th.border }]}>
          <Text style={[styles.sectionTitle, { color: th.text }]}>
            {t('settings.appearance', 'Appearance')}
          </Text>
          <Text style={[styles.sectionSubtitle, { color: th.textSecondary }]}>
            {t('settings.themeSubtitle', 'Choose how the app looks to you.')}
          </Text>

          {THEME_OPTIONS.map((option, idx) => {
            const isActive = mode === option.key;
            return (
              <Pressable
                key={option.key}
                style={[
                  styles.optionRow,
                  idx > 0 && { borderTopWidth: 1, borderTopColor: th.border },
                ]}
                onPress={() => setMode(option.key)}
                accessibilityRole="radio"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={option.label}
              >
                <View style={[styles.iconCircle, { backgroundColor: th.backgroundSelected }]}>
                  <Ionicons name={option.icon} size={18} color={th.text} />
                </View>
                <Text style={[styles.optionLabel, { color: th.text }]}>{option.label}</Text>
                <View
                  style={[
                    styles.radio,
                    { borderColor: isActive ? colors.primary : th.border },
                    isActive && { backgroundColor: colors.primary },
                  ]}
                >
                  {isActive && <Ionicons name="checkmark" size={12} color="#fff" />}
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={[styles.card, { backgroundColor: th.surface, borderColor: th.border }]}>
          <Text style={[styles.sectionTitle, { color: th.text }]}>
            {t('settings.privacy', 'Privacy')}
          </Text>
          <Text style={[styles.sectionSubtitle, { color: th.textSecondary }]}>
            {t('settings.privacySubtitle', 'Control what others can see about you.')}
          </Text>
          <View style={styles.optionRow}>
            <View style={[styles.iconCircle, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="eye-outline" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.optionLabel, { color: th.text }]}>
                {t('settings.activityStatus', 'Activity Status')}
              </Text>
              <Text style={[styles.optionSublabel, { color: th.textSecondary }]}>
                {t('settings.activityStatusSub', 'Show others when you’re active')}
              </Text>
            </View>
            <Switch
              value={showActivityStatus}
              onValueChange={updateVisibility}
              disabled={isUpdatingVisibility}
              trackColor={{ false: th.border, true: colors.primary + 'AA' }}
              thumbColor={showActivityStatus ? colors.primary : th.textMuted}
            />
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: th.surface, borderColor: th.border }]}>
          <Text style={[styles.sectionTitle, { color: th.text }]}>
            {t('settings.discovery', 'Discovery')}
          </Text>
          <Pressable
            testID="review-passed-profiles-row"
            style={styles.optionRow}
            onPress={() => setRevisitSheetVisible(true)}
            accessibilityRole="button"
            accessibilityLabel={t('settings.revisitPassedProfiles', 'Review passed profiles')}
          >
            <View style={[styles.iconCircle, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="refresh-outline" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.optionLabel, { color: th.text }]}>
                {t('settings.revisitPassedProfiles', 'Review passed profiles')}
              </Text>
              <Text style={[styles.optionSublabel, { color: th.textSecondary }]}>
                {t(
                  'settings.revisitPassedProfilesSub',
                  'Bring back profiles you previously passed that are still eligible.',
                )}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={th.textSecondary} />
          </Pressable>
        </View>

        <ReviewPassedProfilesSheet
          visible={revisitSheetVisible}
          onClose={() => setRevisitSheetVisible(false)}
        />

        <NotificationSettingsSection />

        <View style={[styles.card, { backgroundColor: th.surface, borderColor: th.border }]}>
          <Text style={[styles.sectionTitle, { color: th.text }]}>
            {t('settings.account', 'Account')}
          </Text>
          <Pressable
            style={styles.optionRow}
            onPress={handleSignOut}
            accessibilityRole="button"
            accessibilityLabel={t('settings.signOut', 'Sign Out')}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="log-out-outline" size={18} color="#EF4444" />
            </View>
            <Text style={[styles.optionLabel, { color: '#EF4444' }]}>
              {t('settings.signOut', 'Sign Out')}
            </Text>
            <Ionicons name="chevron-forward" size={18} color="#EF4444" />
          </Pressable>
        </View>
      </ScrollView>
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
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    marginBottom: 16,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 1,
  },
  optionSublabel: {
    fontSize: 12,
    opacity: 0.7,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
