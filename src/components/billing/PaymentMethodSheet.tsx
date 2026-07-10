import { Ionicons } from '@expo/vector-icons';
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
  if (channel === 'ONLINE_PAYMENT') return 'card-outline';
  if (channel === 'CHAPA') return 'card-outline';
  if (channel === 'DIRECT_TELEBIRR') return 'phone-portrait-outline';
  return 'wallet-outline';
}

function methodIcon(channel: string): React.ComponentProps<typeof Ionicons>['name'] {
  if (channel === 'MANUAL_TRANSFER') return 'business-outline';
  if (channel === 'CHAPA') return 'card-outline';
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

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <Pressable style={styles.overlay} onPress={onDismiss} />
      <View style={[styles.sheet, { backgroundColor: surfaceColor, paddingBottom: bottom + 16 }]}>
        <View style={[styles.handle, { backgroundColor: borderColor }]} />

        {step === 'method' && channels.length > 1 && (
          <Pressable style={styles.backRow} onPress={() => setStep('channel')} accessibilityRole="button">
            <Ionicons name="chevron-back" size={18} color={secondaryColor} />
            <Text style={[styles.backText, { color: secondaryColor }]}>Back</Text>
          </Pressable>
        )}

        <Text style={[styles.title, { color: textColor }]}>
          {step === 'channel' ? 'Choose Payment Type' : 'Choose Payment Method'}
        </Text>

        {isLoading ? (
          <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
        ) : step === 'channel' ? (
          <ScrollView showsVerticalScrollIndicator={false} style={styles.list}>
            {!Array.isArray(channels) || channels.length === 0 ? (
              <Text style={[styles.emptyText, { color: secondaryColor }]}>
                No payment options available. Please try again later.
              </Text>
            ) : (
              channels.map((ch) => (
                <Pressable
                  key={ch.channel}
                  style={[styles.row, { borderColor }]}
                  onPress={() => handleChannelSelect(ch.channel)}
                  accessibilityRole="button"
                >
                  <View style={[styles.iconCircle, { backgroundColor }]}>
                    <Ionicons name={channelIcon(ch.channel)} size={22} color={secondaryColor} />
                  </View>
                  <Text style={[styles.rowName, { color: textColor }]}>{ch.display_name}</Text>
                  <Ionicons name="chevron-forward" size={18} color={secondaryColor} />
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
                      styles.row,
                      { borderColor: isSelected ? colors.primary : borderColor },
                      isSelected && styles.rowSelected,
                    ]}
                    onPress={() => setSelectedMethodId(method.id)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                  >
                    <View style={[styles.iconCircle, { backgroundColor: isSelected ? colors.primary + '15' : backgroundColor }]}>
                      <Ionicons name={methodIcon(method.payment_channel)} size={20} color={isSelected ? colors.primary : secondaryColor} />
                    </View>
                    <Text style={[styles.rowName, { color: textColor }]}>{method.display_name}</Text>
                    {isSelected && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
                  </Pressable>
                );
              })}
              {filteredMethods.length === 0 && !loadingMethods && (
                <Text style={[styles.emptyText, { color: secondaryColor }]}>
                  No payment methods available for this channel.
                </Text>
              )}
            </ScrollView>

            <Pressable
              style={[styles.confirmBtn, !selectedMethodId && styles.confirmBtnDisabled]}
              onPress={handleConfirm}
              disabled={!selectedMethodId}
              accessibilityRole="button"
            >
              <Text style={styles.confirmBtnText}>Continue</Text>
            </Pressable>
          </>
        )}

        <Pressable style={styles.cancelBtn} onPress={onDismiss} accessibilityRole="button">
          <Text style={[styles.cancelText, { color: secondaryColor }]}>Cancel</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: '80%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 8,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  backText: { fontSize: 14 },
  title: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  loader: { paddingVertical: 40 },
  list: { flexGrow: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  rowSelected: { borderColor: colors.primary },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowName: { flex: 1, fontSize: 15, fontWeight: '500' },
  emptyText: { fontSize: 14, textAlign: 'center', paddingVertical: 20 },
  confirmBtn: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 4,
  },
  confirmBtnDisabled: { opacity: 0.4 },
  confirmBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelBtn: { alignItems: 'center', paddingVertical: 10 },
  cancelText: { fontSize: 14 },
});
