import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { Text, View } from 'react-native';

import { type SemanticTheme } from '@/constants/semantic-colors';
import { SectionCard, SectionTitle } from './FormComponents';

type Props = {
  sem: SemanticTheme;
  isOnboarded?: boolean;
  isVerified?: boolean;
};

export const AccountStatusCard = memo(function AccountStatusCard({
  sem,
  isOnboarded = false,
  isVerified = false,
}: Props) {
  return (
    <SectionCard sem={sem}>
      <SectionTitle title="Account Status" sem={sem} />

      {/* Onboarded row */}
      <View className="flex-row items-center py-3">
        <View
          className="w-9 h-9 rounded-full items-center justify-center mr-3"
          style={{ backgroundColor: sem.accentSoft }}
        >
          <Ionicons
            name={isOnboarded ? 'shield-checkmark' : 'shield-outline'}
            size={18}
            color={isOnboarded ? sem.success : sem.textMuted}
          />
        </View>
        <View className="flex-1">
          <Text className="text-sm font-semibold" style={{ color: sem.textPrimary }}>
            Onboarded
          </Text>
          <Text className="text-xs" style={{ color: sem.textMuted }}>
            {isOnboarded ? 'Onboarding completed' : 'Onboarding in progress'}
          </Text>
        </View>
        <View
          className="px-3 py-1 rounded-full"
          style={{ backgroundColor: isOnboarded ? `${sem.success}18` : `${sem.textMuted}18` }}
          accessibilityLabel={isOnboarded ? 'Completed' : 'In progress'}
        >
          <Text
            className="text-xs font-bold"
            style={{ color: isOnboarded ? sem.success : sem.textMuted }}
          >
            {isOnboarded ? 'Completed' : 'In Progress'}
          </Text>
        </View>
      </View>

      {/* Divider */}
      <View className="h-px my-1" style={{ backgroundColor: sem.border }} />

      {/* Verified row */}
      <View className="flex-row items-center py-3">
        <View
          className="w-9 h-9 rounded-full items-center justify-center mr-3"
          style={{ backgroundColor: isVerified ? `${sem.info}15` : sem.accentSoft }}
        >
          <Ionicons
            name={isVerified ? 'checkmark-circle' : 'ellipse-outline'}
            size={18}
            color={isVerified ? sem.info : sem.textMuted}
          />
        </View>
        <View className="flex-1">
          <Text className="text-sm font-semibold" style={{ color: sem.textPrimary }}>
            Verified identity
          </Text>
          <Text className="text-xs" style={{ color: sem.textMuted }}>
            {isVerified ? 'Your identity has been verified' : 'Identity not yet verified'}
          </Text>
        </View>
        <View
          className="px-3 py-1 rounded-full"
          style={{ backgroundColor: isVerified ? `${sem.info}18` : `${sem.textMuted}18` }}
          accessibilityLabel={isVerified ? 'Verified' : 'Not verified'}
        >
          <Text
            className="text-xs font-bold"
            style={{ color: isVerified ? sem.info : sem.textMuted }}
          >
            {isVerified ? 'Verified' : 'Not Verified'}
          </Text>
        </View>
      </View>

      {/* Footer */}
      <View className="flex-row items-center mt-4 pt-3" style={{ borderTopWidth: 1, borderTopColor: sem.border }}>
        <Ionicons name="lock-closed" size={13} color={sem.textMuted} style={{ marginRight: 6 }} />
        <Text className="text-xs flex-1" style={{ color: sem.textMuted }}>
          These fields are read-only and cannot be changed.
        </Text>
      </View>
    </SectionCard>
  );
});
