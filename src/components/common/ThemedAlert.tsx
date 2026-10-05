import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { createRef, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import { colors, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// ---------------------------------------------------------------------------
// Types — mirrors React Native's Alert.alert API
// ---------------------------------------------------------------------------
export type ThemedAlertButton = {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
  icon?: React.ComponentProps<typeof Ionicons>['name'] | (string & {});
  iconFamily?: 'ionicons' | 'material';
  iconColor?: string;
  /** Stays tappable while a button cooldown runs — set on retry-style actions
   *  you want blocked. Cancel/dismiss buttons are always allowed. */
  allowDuringCooldown?: boolean;
};

export type ThemedAlertOptions = {
  title?: string;
  message?: string;
  buttons?: ThemedAlertButton[];
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  iconColor?: string;
  loading?: boolean;
  /** When set, shows a countdown and auto-dismisses after this many milliseconds. */
  autoDismissMs?: number;
  /** Seconds buttons stay disabled while a live countdown runs. `{seconds}` in
   *  `message` is replaced with the remaining time. No auto-dismiss. */
  buttonCooldownSeconds?: number;
  /** Message shown once the button cooldown reaches zero. */
  cooldownDoneMessage?: string;
};

// ---------------------------------------------------------------------------
// Global ref — lets us call themedAlert() imperatively from anywhere
// ---------------------------------------------------------------------------
export const themedAlertRef = createRef<{
  show: (opts: ThemedAlertOptions) => void;
  hide: () => void;
}>();

export function themedAlert(opts: ThemedAlertOptions): void {
  themedAlertRef.current?.show(opts);
}

export function themedAlertDismiss(): void {
  themedAlertRef.current?.hide();
}

// Convenience helpers
export function themedSuccess(title: string, message?: string): void {
  themedAlert({ title, message, icon: 'checkmark-circle', iconColor: colors.success });
}

export function themedError(title: string, message?: string): void {
  themedAlert({ title, message, icon: 'alert-circle', iconColor: colors.danger });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function ThemedAlert() {
  const { t } = useTranslation();
  const { colors: th } = useTheme();
  const [visible, setVisible] = useState(false);
  const [opts, setOpts] = useState<ThemedAlertOptions>({});
  const [countdown, setCountdown] = useState<number | null>(null);
  const [cooldown, setCooldown] = useState<number | null>(null);

  const show = useCallback((o: ThemedAlertOptions) => {
    setOpts(o);
    setVisible(true);
    if (o.autoDismissMs && o.autoDismissMs > 0) {
      setCountdown(Math.ceil(o.autoDismissMs / 1000));
    } else {
      setCountdown(null);
    }
    setCooldown(
      o.buttonCooldownSeconds != null && o.buttonCooldownSeconds > 0
        ? Math.ceil(o.buttonCooldownSeconds)
        : null,
    );
  }, []);

  const hide = useCallback(() => {
    setVisible(false);
    setCountdown(null);
    setCooldown(null);
  }, []);

  useEffect(() => {
    const instance = { show, hide };
    (themedAlertRef as any).current = instance;
    return () => {
      if ((themedAlertRef as any).current === instance) {
        (themedAlertRef as any).current = null;
      }
    };
  }, [show, hide]);

  // Countdown + auto-dismiss timer
  useEffect(() => {
    if (!visible || !opts.autoDismissMs || countdown === null) return;

    if (countdown <= 0) {
      hide();
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((c) => (c !== null ? c - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [visible, opts.autoDismissMs, countdown, hide]);

  // Button-cooldown ticker — disables actions until it reaches zero
  useEffect(() => {
    if (!visible || cooldown === null || cooldown <= 0) return;
    const timer = setTimeout(() => {
      setCooldown((c) => (c !== null ? Math.max(0, c - 1) : null));
    }, 1000);
    return () => clearTimeout(timer);
  }, [visible, cooldown]);

  const cooldownActive = cooldown !== null && cooldown > 0;
  const displayMessage =
    cooldown === 0 && opts.cooldownDoneMessage
      ? opts.cooldownDoneMessage
      : opts.message?.replace('{seconds}', String(cooldown ?? 0));

  const buttons = opts.buttons ?? [{ text: t('common.ok', 'OK'), style: 'default' as const, allowDuringCooldown: true }];

  // Dismiss-style buttons (cancel, or explicitly allowed) stay live during a
  // cooldown; only action buttons are blocked.
  const btnBlocked = (btn: ThemedAlertButton) =>
    cooldownActive && btn.style !== 'cancel' && !btn.allowDuringCooldown;

  const handlePress = (btn: ThemedAlertButton) => {
    if (btnBlocked(btn)) return;
    setVisible(false);
    btn.onPress?.();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        const cancelBtn = buttons.find((b) => b.style === 'cancel');
        if (cancelBtn) handlePress(cancelBtn);
        else setVisible(false);
      }}
    >
      <Pressable style={styles.overlay} onPress={(e) => e.stopPropagation()}>
        <View style={[styles.card, { backgroundColor: th.surface, borderColor: th.border }]}>
          {/* Icon */}
          {opts.loading ? (
            <ActivityIndicator size="large" color={colors.primary} style={styles.icon} />
          ) : opts.icon ? (
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: (opts.iconColor ?? colors.primary) + '20' },
              ]}
            >
              <Ionicons
                name={opts.icon}
                size={28}
                color={opts.iconColor ?? colors.primary}
              />
            </View>
          ) : null}

          {/* Title */}
          {opts.title ? (
            <Text style={[styles.title, { color: th.text }]}>{opts.title}</Text>
          ) : null}

          {/* Message */}
          {displayMessage ? (
            <Text style={[styles.message, { color: th.textSecondary }]}>{displayMessage}</Text>
          ) : null}

          {/* Countdown indicator */}
          {countdown !== null && countdown > 0 ? (
            <View style={styles.countdownRow}>
              <View style={[styles.countdownBar, { backgroundColor: th.border }]}>
                <View
                  style={[
                    styles.countdownBarFill,
                    {
                      backgroundColor: opts.iconColor ?? colors.primary,
                      width: `${(countdown / Math.ceil((opts.autoDismissMs ?? 1) / 1000)) * 100}%`,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.countdownText, { color: th.textMuted }]}>{countdown}</Text>
            </View>
          ) : null}

          {/* Buttons */}
          <View style={styles.buttonRow}>
            {buttons.map((btn, idx) => {
              const isCancel = btn.style === 'cancel';
              const isDestructive = btn.style === 'destructive';
              return (
                <Pressable
                  key={idx}
                  style={[
                    styles.button,
                    isCancel && styles.buttonCancel,
                    isDestructive && styles.buttonDestructive,
                    { borderColor: th.border },
                    btnBlocked(btn) && { opacity: 0.45 },
                  ]}
                  onPress={() => handlePress(btn)}
                  disabled={btnBlocked(btn)}
                >
                  {btn.icon ? (
                    btn.iconFamily === 'material' ? (
                      <MaterialCommunityIcons
                        name={btn.icon as any}
                        size={16}
                        color={btn.iconColor ?? (isDestructive ? colors.danger : colors.primary)}
                      />
                    ) : (
                      <Ionicons
                        name={btn.icon as any}
                        size={16}
                        color={btn.iconColor ?? (isDestructive ? colors.danger : colors.primary)}
                      />
                    )
                  ) : null}
                  <Text
                    style={[
                      styles.buttonText,
                      { color: isDestructive ? colors.danger : colors.primary },
                    ]}
                  >
                    {btn.text}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    alignItems: 'center',
    gap: 10,
  },
  icon: {
    marginBottom: 4,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  button: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: radius.sm,
    borderWidth: 1,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  buttonCancel: {
    // no special bg — outlined
  },
  buttonDestructive: {
    // no special bg — text color handles it
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    marginTop: 4,
  },
  countdownBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  countdownBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  countdownText: {
    fontSize: 13,
    fontWeight: '600',
    minWidth: 16,
    textAlign: 'center',
  },
});
