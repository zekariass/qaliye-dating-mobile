import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAppLink } from '@/hooks/useAppLink';
import { LANGUAGE_LABELS, LANGUAGE_LIST, useLanguageStore, type SupportedLanguage } from '@/stores/language-store';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface HelpAction {
  key: string;
  icon: IoniconName;
  iconColor: string;
  iconBg: string;
}

const HELP_ACTIONS: HelpAction[] = [
  { key: 'like',                  icon: 'heart-outline',              iconColor: colors.heartPink,  iconBg: '#FEE2E2' },
  { key: 'super_like',            icon: 'diamond-outline',            iconColor: '#00B4FC',         iconBg: '#E0F2FE' },
  { key: 'boost',                 icon: 'flash-outline',              iconColor: '#F59E0B',         iconBg: '#FFF7ED' },
  { key: 'rewind',                icon: 'arrow-undo-outline',         iconColor: colors.primary,    iconBg: colors.primary + '20' },
  { key: 'super_message',         icon: 'mail-outline',               iconColor: '#F59E0B',         iconBg: '#FFF7ED' },
  { key: 'image_message',         icon: 'image-outline',              iconColor: '#10B981',         iconBg: '#D1FAE5' },
  { key: 'voice_message',         icon: 'mic-outline',                iconColor: '#8B5CF6',         iconBg: '#EDE9FE' },
  { key: 'return_passed_profile', icon: 'arrow-undo-circle-outline',  iconColor: colors.primary,    iconBg: colors.primary + '20' },
  { key: 'change_address',        icon: 'location-outline',           iconColor: colors.primary,    iconBg: colors.primary + '20' },
  { key: 'see_who_liked_you',     icon: 'eye-outline',                iconColor: colors.heartPink,  iconBg: '#FEE2E2' },
  { key: 'message',               icon: 'chatbubble-outline',         iconColor: colors.primary,    iconBg: colors.primary + '20' },
  { key: 'incognito_mode',        icon: 'eye-off-outline',            iconColor: '#6B7280',         iconBg: '#F3F4F6' },
];

// ── Accordion for a group of action definitions ──────────────────────────────

interface AccordionProps {
  title: string;
  subtitle?: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function Accordion({ title, subtitle, expanded, onToggle, children }: AccordionProps) {
  const { colors: th } = useTheme();
  return (
    <View style={[styles.accordionCard, { backgroundColor: th.surface, borderColor: th.border }]}>
      <Pressable
        style={styles.accordionHeader}
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
      >
        <View style={[styles.accordionIcon, { backgroundColor: colors.primary + '20' }]}>
          <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.accordionTitle, { color: th.text }]}>{title}</Text>
          {subtitle ? (
            <Text style={[styles.accordionSubtitle, { color: th.textSecondary }]} numberOfLines={expanded ? 2 : 1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={th.textSecondary}
        />
      </Pressable>
      {expanded && <View style={styles.accordionBody}>{children}</View>}
    </View>
  );
}

// ── Screen ───────────────────────────────────────────────────────────────────

export default function HelpScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { top: safeTop, bottom: safeBottom } = useSafeAreaInsets();
  const { colors: th } = useTheme();

  const [actionsExpanded, setActionsExpanded] = useState(false);
  const [creditsExpanded, setCreditsExpanded] = useState(false);
  const [faqExpanded, setFaqExpanded] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  const language = useLanguageStore((s) => s.language);
  const setLanguage = useLanguageStore((s) => s.setLanguage);
  const { shareApp } = useAppLink();

  const handleLanguageChange = useCallback(async (code: SupportedLanguage) => {
    setLanguage(code);
    await i18n.changeLanguage(code);
    setLangOpen(false);
  }, [i18n, setLanguage]);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(app)/(tabs)/profile' as any);
    }
  }, [router]);

  return (
    <View style={[styles.screen, { backgroundColor: th.background, paddingTop: safeTop }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={[styles.circleBtn, { backgroundColor: th.surface }]}
          onPress={handleBack}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={22} color={th.text} />
        </Pressable>
        <Text style={[styles.title, { color: th.text }]}>
          {t('help.title', 'Help')}
        </Text>
        {/* Language dropdown trigger */}
        <Pressable
          style={[styles.langTrigger, { backgroundColor: th.surface, borderColor: th.border }]}
          onPress={() => setLangOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={t('help.language', 'Language')}
        >
          <Ionicons name="language-outline" size={16} color={th.text} />
          <Text style={[styles.langTriggerText, { color: th.text }]} numberOfLines={1}>
            {LANGUAGE_LABELS[language].native}
          </Text>
          <Ionicons name="chevron-down" size={14} color={th.textSecondary} />
        </Pressable>
      </View>

      {/* Language dropdown modal */}
      <Modal
        visible={langOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setLangOpen(false)}
      >
        <Pressable style={styles.langOverlay} onPress={() => setLangOpen(false)}>
          <View style={[styles.langDropdown, { backgroundColor: th.surface, borderColor: th.border }]}>
            <Text style={[styles.langDropdownTitle, { color: th.textMuted }]}>
              {t('help.language', 'Language')}
            </Text>
            {LANGUAGE_LIST.map((code) => {
              const active = code === language;
              const { native, label } = LANGUAGE_LABELS[code];
              return (
                <Pressable
                  key={code}
                  style={[
                    styles.langOption,
                    active && { backgroundColor: th.backgroundSelected },
                  ]}
                  onPress={() => handleLanguageChange(code)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={label}
                >
                  <View style={styles.langOptionTextCol}>
                    <Text style={[styles.langOptionNative, { color: th.text }]}>{native}</Text>
                    <Text style={[styles.langOptionLabel, { color: th.textMuted }]}>{label}</Text>
                  </View>
                  {active && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: safeBottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Action definitions accordion ── */}
        <Accordion
          title={t('help.actionsTitle', 'Action Definitions')}
          subtitle={t('help.actionsSubtitle', 'Tap to see what each action does')}
          expanded={actionsExpanded}
          onToggle={() => setActionsExpanded((v) => !v)}
        >
          {HELP_ACTIONS.map((action, idx) => (
            <View
              key={action.key}
              style={[styles.actionRow, idx > 0 && { borderTopWidth: 1, borderTopColor: th.border }]}
            >
              <View style={[styles.iconCircle, { backgroundColor: action.iconBg }]}>
                <Ionicons name={action.icon} size={20} color={action.iconColor} />
              </View>
              <View style={styles.textCol}>
                <Text style={[styles.actionTitle, { color: th.text }]}>
                  {t(`help.actions.${action.key}.title`)}
                </Text>
                <Text style={[styles.actionDesc, { color: th.textSecondary }]}>
                  {t(`help.actions.${action.key}.description`)}
                </Text>
              </View>
            </View>
          ))}
        </Accordion>

        {/* ── Credits accordion ── */}
        <View style={{ marginTop: 10 }}>
          <Accordion
            title={t('help.creditsTitle', 'Credits')}
            subtitle={t('help.creditsSubtitle', 'Tap to learn about credits and how they work')}
            expanded={creditsExpanded}
            onToggle={() => setCreditsExpanded((v) => !v)}
          >
            <Text style={[styles.creditsSectionTitle, { color: th.text }]}>
              {t('help.creditsOverviewTitle')}
            </Text>
            <Text style={[styles.creditsDesc, { color: th.textSecondary }]}>
              {t('help.creditsOverview')}
            </Text>

            <Text style={[styles.creditsSectionTitle, { color: th.text }]}>
              {t('help.creditsHowTitle')}
            </Text>
            <Text style={[styles.creditsDesc, { color: th.textSecondary }]}>
              {t('help.creditsHow')}
            </Text>

            <Text style={[styles.creditsSubLabel, { color: th.text }]}>
              {t('help.creditsCheckTitle')}
            </Text>
            <Text style={[styles.creditsDesc, { color: th.textSecondary }]}>
              {t('help.creditsCheck')}
            </Text>
            <Text style={[styles.creditsSubLabel, { color: th.text }]}>
              {t('help.creditsBuyTitle')}
            </Text>
            <Text style={[styles.creditsDesc, { color: th.textSecondary }]}>
              {t('help.creditsBuy')}
            </Text>
          </Accordion>
        </View>

        {/* ── FAQ accordion ── */}
        <View style={{ marginTop: 10 }}>
          <Accordion
            title={t('help.faqTitle', 'Frequently Asked Questions')}
            subtitle={t('help.faqSubtitle', 'Tap to see answers to common questions')}
            expanded={faqExpanded}
            onToggle={() => setFaqExpanded((v) => !v)}
          >
            {Array.from({ length: 15 }, (_, i) => i + 1).filter((n) => n !== 1).map((n) => (
              <View
                key={n}
                style={[styles.faqRow, n > 1 && { borderTopWidth: 1, borderTopColor: th.border }]}
              >
                <Text style={[styles.faqQuestion, { color: th.text }]}>
                  {t(`help.faq.q${n}`)}
                </Text>
                <Text style={[styles.faqAnswer, { color: th.textSecondary }]}>
                  {t(`help.faq.a${n}`)}
                </Text>
              </View>
            ))}
          </Accordion>
        </View>

        {/* ── Share App ── */}
        <Pressable
          style={[styles.supportLink, { backgroundColor: th.surface, borderColor: th.border }]}
          onPress={shareApp}
          accessibilityRole="button"
          accessibilityLabel={t('settings.shareApp', 'Share App')}
        >
          <View style={[styles.supportIcon, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name="share-social-outline" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.supportTitle, { color: th.text }]}>
              {t('settings.shareApp', 'Share App')}
            </Text>
            <Text style={[styles.supportSubtitle, { color: th.textSecondary }]}>
              {t('settings.shareAppSub', 'Invite your friends to join')}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={th.textSecondary} />
        </Pressable>

        {/* ── Support link ── */}
        <Pressable
          style={[styles.supportLink, { backgroundColor: th.surface, borderColor: th.border }]}
          onPress={() => router.push('/(app)/support-conversation' as any)}
          accessibilityRole="link"
          accessibilityLabel={t('help.supportLink', 'Have a question? Chat with us')}
        >
          <View style={[styles.supportIcon, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.supportTitle, { color: th.text }]}>
              {t('help.supportLink', 'Have a question? Chat with us')}
            </Text>
            <Text style={[styles.supportSubtitle, { color: th.textSecondary }]}>
              {t('help.supportSubtitle', 'We typically reply within 24 hours')}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={th.textSecondary} />
        </Pressable>
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
  subtitle: {
    fontSize: 14,
    paddingHorizontal: 4,
    marginBottom: 16,
  },

  // ── Language dropdown trigger (header top-right) ──
  langTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    maxWidth: 120,
  },
  langTriggerText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // ── Language dropdown modal ──
  langOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 60,
    paddingRight: 16,
  },
  langDropdown: {
    width: 200,
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },
  langDropdownTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  langOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: radius.md,
    gap: 10,
  },
  langOptionTextCol: {
    flex: 1,
    gap: 1,
  },
  langOptionNative: {
    fontSize: 15,
    fontWeight: '600',
  },
  langOptionLabel: {
    fontSize: 12,
  },

  // ── Accordion ──
  accordionCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  accordionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accordionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  accordionSubtitle: {
    fontSize: 13,
  },
  accordionBody: {
    paddingHorizontal: 16,
    paddingBottom: 14,
  },

  // ── Action rows inside accordion ──
  actionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    gap: 14,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
    gap: 4,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  actionDesc: {
    fontSize: 13,
    lineHeight: 19,
  },

  // ── Credits accordion content ──
  creditsSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  creditsSubLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
  },
  creditsDesc: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 10,
  },

  // ── FAQ accordion content ──
  faqRow: {
    paddingVertical: 14,
  },
  faqQuestion: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  faqAnswer: {
    fontSize: 13,
    lineHeight: 19,
  },

  // ── Support link ──
  supportLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 16,
  },
  supportIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  supportTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  supportSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
});
