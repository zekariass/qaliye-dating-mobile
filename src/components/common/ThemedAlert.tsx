import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { createRef, useCallback, useEffect, useState } from 'react';
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
};

export type ThemedAlertOptions = {
  title?: string;
  message?: string;
  buttons?: ThemedAlertButton[];
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  iconColor?: string;
  loading?: boolean;
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
  const { colors: th } = useTheme();
  const [visible, setVisible] = useState(false);
  const [opts, setOpts] = useState<ThemedAlertOptions>({});

  const show = useCallback((o: ThemedAlertOptions) => {
    setOpts(o);
    setVisible(true);
  }, []);

  const hide = useCallback(() => setVisible(false), []);

  useEffect(() => {
    const instance = { show, hide };
    (themedAlertRef as any).current = instance;
    return () => {
      if ((themedAlertRef as any).current === instance) {
        (themedAlertRef as any).current = null;
      }
    };
  }, [show, hide]);

  const buttons = opts.buttons ?? [{ text: 'OK', style: 'default' }];

  const handlePress = (btn: ThemedAlertButton) => {
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
          {opts.message ? (
            <Text style={[styles.message, { color: th.textSecondary }]}>{opts.message}</Text>
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
                  ]}
                  onPress={() => handlePress(btn)}
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
});
