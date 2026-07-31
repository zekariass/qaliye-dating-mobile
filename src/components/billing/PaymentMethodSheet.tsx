import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/constants/theme';
import { usePaymentChannels } from '@/hooks/billing/usePaymentChannels';
import { usePaymentOptions } from '@/hooks/billing/usePaymentOptions';
import type { PaymentChannel, PaymentMethodDto } from '@/types/billing';

type SheetStep = 'channel' | 'method';

type Props = {
  visible: boolean;
  onConfirm: (method: PaymentMethodDto) => void;
  onDismiss: () => void;
  surfaceColor: string;
  borderColor: string;
  textColor: string;
  secondaryColor: string;
  backgroundColor: string;
};

function channelIcon(channel: string): React.ComponentProps<typeof Ionicons>['name'] {
  if (channel === 'MANUAL_TRANSFER') return 'business-outline';
  if (channel === 'ONLINE' || channel === 'ONLINE_PAYMENT') return 'card-outline';
  if (channel === 'CHAPA') return 'card-outline';
  if (channel === 'DIRECT_TELEBIRR') return 'phone-portrait-outline';
  return 'wallet-outline';
}

function channelSubtitle(channel: string): string {
  if (channel === 'MANUAL_TRANSFER') return 'Bank transfer with manual verification';
  if (channel === 'ONLINE' || channel === 'ONLINE_PAYMENT') return 'Pay online with card or mobile';
  if (channel === 'CHAPA') return 'Online checkout via Chapa';
  if (channel === 'DIRECT_TELEBIRR') return 'Pay directly through Telebirr';
  return 'Choose a payment method';
}

function methodIcon(channel: string): React.ComponentProps<typeof Ionicons>['name'] {
  if (channel === 'MANUAL_TRANSFER') return 'business-outline';
  if (channel === 'ONLINE' || channel === 'CHAPA') return 'card-outline';
  if (channel === 'DIRECT_TELEBIRR') return 'phone-portrait-outline';
  return 'wallet-outline';
}

export function PaymentMethodSheet({
  visible,
  onConfirm,
  onDismiss,
  surfaceColor,
  borderColor,
  textColor,
  secondaryColor,
  backgroundColor,
}: Props) {
  const { bottom } = useSafeAreaInsets();

  const [step, setStep] = useState<SheetStep>('channel');
  const [selectedChannel, setSelectedChannel] = useState<PaymentChannel | null>(null);
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);

  const { channels, isLoading: loadingChannels } = usePaymentChannels();
  const { paymentMethods, isLoading: loadingMethods } = usePaymentOptions(selectedChannel ?? undefined);

  useEffect(() => {
    if (!visible) return;
    setSelectedMethodId(null);

    if (loadingChannels) {
      setStep('channel');
      setSelectedChannel(null);
      return;
    }

    if (channels.length === 1) {
      setSelectedChannel(channels[0].channel);
      setStep('method');
    } else {
      setSelectedChannel(null);
      setStep('channel');
    }
  }, [visible, channels, loadingChannels]);

  const filteredMethods = useMemo(() => {
    if (!selectedChannel) return [];
    return paymentMethods
      .filter((m) => m.payment_channel === selectedChannel)
      .sort((a, b) => a.display_order - b.display_order);
  }, [paymentMethods, selectedChannel]);

  // Auto-select and auto-confirm when only one method is available
  useEffect(() => {
    if (!visible || step !== 'method') return;
    if (loadingMethods) return;
    if (filteredMethods.length === 1 && selectedMethodId === null) {
      setSelectedMethodId(filteredMethods[0].id);
      onConfirm(filteredMethods[0]);
    }
  }, [visible, step, loadingMethods, filteredMethods, selectedMethodId, onConfirm]);

  const handleChannelSelect = (channel: PaymentChannel) => {
    setSelectedChannel(channel);
    setSelectedMethodId(null);
    setStep('method');
  };

  const handleConfirm = () => {
    const method = filteredMethods.find((m) => m.id === selectedMethodId);
    if (method) onConfirm(method);
  };

  const isLoading = loadingChannels || (step === 'method' && loadingMethods && filteredMethods.length === 0);
  const isAutoConfirming = step === 'method' && !loadingMethods && filteredMethods.length === 1 && selectedMethodId === null;

  const selectedMethod = filteredMethods.find((m) => m.id === selectedMethodId);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <Pressable style={styles.overlay} onPress={onDismiss} />
      <View style={[styles.sheet, { backgroundColor: surfaceColor, paddingBottom: bottom + 16 }]}>
        <View style={[styles.handle, { backgroundColor: borderColor }]} />

        {/* Header row */}
        <View style={styles.headerRow}>
          {step === 'method' && channels.length > 1 ? (
            <Pressable
              style={[styles.backBtn, { backgroundColor }]}
              onPress={() => setStep('channel')}
              accessibilityRole="button"
            >
              <Ionicons name="chevron-back" size={18} color={textColor} />
            </Pressable>
          ) : (
            <View style={styles.backBtnPlaceholder} />
          )}

          <View style={styles.headerTitleWrap}>
            <Text style={[styles.title, { color: textColor }]}>
              {step === 'channel' ? 'Payment Type' : 'Payment Method'}
            </Text>
            <Text style={[styles.subtitle, { color: secondaryColor }]}>
              {step === 'channel'
                ? 'Choose how you want to pay'
                : selectedChannel
                  ? channelSubtitle(selectedChannel)
                  : 'Select a method to continue'}
            </Text>
          </View>

          <Pressable
            style={[styles.closeBtn, { backgroundColor }]}
            onPress={onDismiss}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Ionicons name="close" size={18} color={textColor} />
          </Pressable>
        </View>

        {isLoading || isAutoConfirming ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loaderText, { color: secondaryColor }]}>Loading options…</Text>
          </View>
        ) : step === 'channel' ? (
          <ScrollView showsVerticalScrollIndicator={false} style={styles.list}>
            {!Array.isArray(channels) || channels.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Ionicons name="wallet-outline" size={36} color={secondaryColor} />
                <Text style={[styles.emptyText, { color: secondaryColor }]}>
                  No payment options available.{'\n'}Please try again later.
                </Text>
              </View>
            ) : (
              channels.map((ch) => (
                <Pressable
                  key={ch.channel}
                  style={[styles.channelRow, { borderColor, backgroundColor }]}
                  onPress={() => handleChannelSelect(ch.channel)}
                  accessibilityRole="button"
                >
                  <View style={[styles.channelIconRing, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}25` }]}>
                    <Ionicons name={channelIcon(ch.channel)} size={22} color={colors.primary} />
                  </View>
                  <View style={styles.channelInfo}>
                    <Text style={[styles.channelName, { color: textColor }]}>{ch.display_name}</Text>
                    <Text style={[styles.channelSubtitle, { color: secondaryColor }]} numberOfLines={1}>
                      {channelSubtitle(ch.channel)}
                    </Text>
                  </View>
                  <View style={[styles.channelArrow, { backgroundColor: `${colors.primary}10` }]}>
                    <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                  </View>
                </Pressable>
              ))
            )}
          </ScrollView>
        ) : (
          <>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.list}>
              {filteredMethods.map((method) => {
                const isSelected = method.id === selectedMethodId;
                return (
                  <Pressable
                    key={method.id}
                    style={[
                      styles.methodRow,
                      {
                        borderColor: isSelected ? colors.primary : borderColor,
                        backgroundColor: isSelected ? `${colors.primary}10` : backgroundColor,
                      },
                    ]}
                    onPress={() => setSelectedMethodId(method.id)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                  >
                    <View
                      style={[
                        styles.methodIconRing,
                        {
                          backgroundColor: isSelected ? `${colors.primary}18` : backgroundColor,
                          borderColor: isSelected ? `${colors.primary}40` : borderColor,
                        },
                      ]}
                    >
                      {method.logo_url ? (
                        <ExpoImage
                          source={{ uri: method.logo_url }}
                          style={styles.logoImage}
                          contentFit="contain"
                        />
                      ) : (
                        <Ionicons
                          name={methodIcon(method.payment_channel)}
                          size={20}
                          color={isSelected ? colors.primary : secondaryColor}
                        />
                      )}
                    </View>
                    <Text style={[styles.methodName, { color: textColor }]}>{method.display_name}</Text>
                    <View style={[
                      styles.radioOuter,
                      { borderColor: isSelected ? colors.primary : borderColor },
                    ]}>
                      {isSelected && <View style={styles.radioInner} />}
                    </View>
                  </Pressable>
                );
              })}
              {filteredMethods.length === 0 && !loadingMethods && (
                <View style={styles.emptyWrap}>
                  <Ionicons name="card-outline" size={36} color={secondaryColor} />
                  <Text style={[styles.emptyText, { color: secondaryColor }]}>
                    No payment methods available for this channel.
                  </Text>
                </View>
              )}
            </ScrollView>

            <Pressable
              style={[styles.confirmBtn, !selectedMethodId && styles.confirmBtnDisabled]}
              onPress={handleConfirm}
              disabled={!selectedMethodId}
              accessibilityRole="button"
            >
              {selectedMethod ? (
                <>
                  <Text style={styles.confirmBtnText}>Continue with {selectedMethod.display_name}</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </>
              ) : (
                <Text style={styles.confirmBtnText}>Continue</Text>
              )}
            </Pressable>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: '82%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 14,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  backBtnPlaceholder: { width: 36 },
  headerTitleWrap: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  title: { fontSize: 17, fontWeight: '800', textAlign: 'center' },
  subtitle: { fontSize: 12, fontWeight: '500', textAlign: 'center' },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  loaderWrap: {
    paddingVertical: 48,
    alignItems: 'center',
    gap: 12,
  },
  loaderText: { fontSize: 14, fontWeight: '600' },
  list: { flexGrow: 0 },
  // Channel rows
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  channelIconRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  channelInfo: { flex: 1, gap: 2 },
  channelName: { fontSize: 16, fontWeight: '700' },
  channelSubtitle: { fontSize: 12, fontWeight: '500' },
  channelArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Method rows
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  methodIconRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  logoImage: {
    width: 34,
    height: 34,
  },
  methodName: { flex: 1, fontSize: 15, fontWeight: '600' },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  // Empty
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 36,
    gap: 12,
  },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  // Confirm
  confirmBtn: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 6,
    marginBottom: 4,
  },
  confirmBtnDisabled: { opacity: 0.4 },
  confirmBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
