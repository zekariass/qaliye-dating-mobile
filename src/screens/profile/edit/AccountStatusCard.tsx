import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { Text, View } from 'react-native';

import { type SemanticTheme } from '@/constants/semantic-colors';
import { SectionCard, SectionTitle } from './FormComponents';

type Props = {
  sem: SemanticTheme;
};

export const AccountStatusCard = memo(function AccountStatusCard({ sem }: Props) {
  return (
    <SectionCard sem={sem}>
      <SectionTitle title="Account Status" sem={sem} />

      {/* Onboarded row */}
      <View className="flex-row items-center py-3">
        <View
          className="w-9 h-9 rounded-full items-center justify-center mr-3"
          style={{ backgroundColor: sem.accentSoft }}
        >
          <Ionicons name="shield-checkmark" size={18} color={sem.success} />
        </View>
        <View className="flex-1">
          <Text className="text-sm font-semibold" style={{ color: sem.textPrimary }}>
            Onboarded
          </Text>
          <Text className="text-xs" style={{ color: sem.textMuted }}>
            Onboarding completed
          </Text>
        </View>
        <View
          className="px-3 py-1 rounded-full"
          style={{ backgroundColor: `${sem.success}18` }}
          accessibilityLabel="Completed"
        >
          <Text className="text-xs font-bold" style={{ color: sem.success }}>
            Completed
          </Text>
        </View>
      </View>

      {/* Divider */}
      <View className="h-px my-1" style={{ backgroundColor: sem.border }} />

      {/* Verified row */}
      <View className="flex-row items-center py-3">
        <View
          className="w-9 h-9 rounded-full items-center justify-center mr-3"
          style={{ backgroundColor: `${sem.info}15` }}
        >
          <Ionicons name="checkmark-circle" size={18} color={sem.info} />
        </View>
        <View className="flex-1">
          <Text className="text-sm font-semibold" style={{ color: sem.textPrimary }}>
            Verified identity
          </Text>
          <Text className="text-xs" style={{ color: sem.textMuted }}>
            Your identity has been verified
          </Text>
        </View>
        <View
          className="px-3 py-1 rounded-full"
          style={{ backgroundColor: `${sem.info}18` }}
          accessibilityLabel="Verified"
        >
          <Text className="text-xs font-bold" style={{ color: sem.info }}>
            Verified
          </Text>
        </View>
      </View>

      {/* Footer */}
      <View className="flex-row items-center mt-4 pt-3" style={{ borderTopWidth: 1, borderTopColor: sem.border }}>
        <Ionicons name="lock-closed" size={13} color={sem.textMuted} style={{ marginRight: 6 }} />
        <Text className="text-xs flex-1" style={{ color: sem.textMuted }}>
          These information are read only and cannot be changed.
        </Text>
      </View>
    </SectionCard>
  );
});
