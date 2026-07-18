import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';

import { themedAlert } from '@/components/common/ThemedAlert';

import { CountrySelectPicker } from '@/components/catalog/CountrySelectPicker';
import { EthnicityMultiSelectPicker } from '@/components/catalog/EthnicityMultiSelectPicker';
import { type SemanticTheme } from '@/constants/semantic-colors';
import type { EthnicityOption } from '@/types/catalog';
import {
    type EditProfileDraft,
    EDUCATION_OPTIONS,
    GENDER_OPTIONS,
    MARITAL_STATUS_OPTIONS,
    RELATIONSHIP_INTENTION_OPTIONS,
    RELIGION_OPTIONS,
    YES_NO_OPTIONS,
} from '../mockEditProfile';
import {
    DatePickerField,
    LabeledField,
    RowPair,
    SectionCard,
    SectionTitle,
    SelectField,
    TextInputField
} from './FormComponents';

type Props = {
  draft: EditProfileDraft;
  onChange: (path: string, value: string) => void;
  onChangeEthnicities?: (items: EthnicityOption[]) => void;
  sem: SemanticTheme;
  discoveryMode?: 'PUBLIC' | 'INCOGNITO';
  onDiscoveryModeChange?: (mode: 'PUBLIC' | 'INCOGNITO') => void;
  incognitoEnabled?: boolean;
};

const DISCOVERY_MODES = ['PUBLIC', 'INCOGNITO'] as const;
const MODE_ICONS: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  PUBLIC: 'globe-outline',
  INCOGNITO: 'glasses-outline',
};
const MODE_LABELS: Record<string, string> = { PUBLIC: 'Public', INCOGNITO: 'Private' };
const MODE_HELPERS: Record<string, string> = {
  PUBLIC: 'Public — Your profile is visible in discovery. Others can find and swipe on you.',
  INCOGNITO: 'Private — Your profile is hidden from discovery. You can still swipe, but others won\'t see you.',
};

export const EditDetailsTab = memo(function EditDetailsTab({ draft, onChange, onChangeEthnicities, sem, discoveryMode = 'PUBLIC', onDiscoveryModeChange, incognitoEnabled = false }: Props) {
  const { basics, personal } = draft;

  return (
    <View>
      {/* ─── Basic Information ─── */}
      <SectionCard sem={sem}>
        <SectionTitle title="Basic Information" sem={sem} />

        <RowPair>
          <LabeledField label="Display name" sem={sem}>
            <TextInputField
              value={basics.displayName}
              onChangeText={(v) => onChange('basics.displayName', v)}
              sem={sem}
              placeholder="Your name"
            />
          </LabeledField>
          <LabeledField label="Gender" sem={sem}>
            <SelectField
              value={basics.gender === 'MALE' ? 'Male' : basics.gender === 'FEMALE' ? 'Female' : basics.gender}
              options={GENDER_OPTIONS.map((g) => g === 'MALE' ? 'Male' : 'Female')}
              onSelect={(v) => onChange('basics.gender', v === 'Male' ? 'MALE' : 'FEMALE')}
              sem={sem}
              placeholder="Gender"
            />
          </LabeledField>
        </RowPair>

        <RowPair>
          <LabeledField label="Date of birth" sem={sem}>
            <DatePickerField
              value={basics.dateOfBirth}
              onSelect={(v) => onChange('basics.dateOfBirth', v)}
              sem={sem}
              placeholder="DD MMM YYYY"
            />
          </LabeledField>
          <LabeledField label="Height" sem={sem}>
            <TextInputField
              value={basics.heightCm ? String(basics.heightCm) : ''}
              onChangeText={(v) => onChange('basics.heightCm', v.replace(/[^0-9]/g, ''))}
              sem={sem}
              leftIcon="resize-outline"
              placeholder="Height"
              rightElement={
                <Text className="text-base ml-1" style={{ color: sem.textMuted }}>
                  cm
                </Text>
              }
            />
          </LabeledField>
        </RowPair>

      </SectionCard>

      {/* ─── Heritage ─── */}
      <SectionCard sem={sem}>
        <SectionTitle title="Heritage" sem={sem} />

        <LabeledField label="Ethnicity / Background" sem={sem} flex={false}>
          <EthnicityMultiSelectPicker
            selected={personal.ethnicities}
            onChange={onChangeEthnicities ?? (() => {})}
            accentColor="#8A2CFF"
            textColor={sem.textPrimary}
            mutedColor={sem.textMuted}
            borderColor={sem.border}
            surfaceColor={sem.surface}
          />
        </LabeledField>

        <LabeledField label="Nationality" sem={sem} flex={false}>
          <CountrySelectPicker
            value={personal.nationality || null}
            onChange={(code) => onChange('personal.nationality', code)}
            placeholder="Select nationality"
            accentColor={sem.accent}
            textColor={sem.textPrimary}
            mutedColor={sem.textMuted}
            borderColor={sem.border}
            surfaceColor={sem.surface}
            surfaceMutedColor={sem.surfaceMuted}
          />
        </LabeledField>

        <LabeledField label="Religion" sem={sem}>
          <SelectField
            value={personal.religion}
            options={RELIGION_OPTIONS}
            onSelect={(v) => onChange('personal.religion', v)}
            sem={sem}
            leftIcon="leaf-outline"
            placeholder="Religion"
          />
        </LabeledField>
      </SectionCard>

      {/* ─── Education & Work ─── */}
      <SectionCard sem={sem}>
        <SectionTitle title="Education & Work" sem={sem} />

        <LabeledField label="Education level" sem={sem} flex={false}>
          <SelectField
            value={personal.educationLevel}
            options={EDUCATION_OPTIONS}
            onSelect={(v) => onChange('personal.educationLevel', v)}
            sem={sem}
            leftIcon="school-outline"
            placeholder="Education level"
          />
        </LabeledField>
        <LabeledField label="Occupation" sem={sem} flex={false}>
          <TextInputField
            value={personal.occupation}
            onChangeText={(v) => onChange('personal.occupation', v)}
            sem={sem}
            leftIcon="briefcase-outline"
            placeholder="Your occupation"
          />
        </LabeledField>
      </SectionCard>

      {/* ─── Relationship ─── */}
      <SectionCard sem={sem}>
        <SectionTitle title="Relationship" sem={sem} />

        <RowPair>
          <LabeledField label="Relationship intention" sem={sem}>
            <SelectField
              value={personal.relationshipIntention}
              options={RELATIONSHIP_INTENTION_OPTIONS}
              onSelect={(v) => onChange('personal.relationshipIntention', v)}
              sem={sem}
              leftIcon="heart-outline"
              placeholder="Intention"
            />
          </LabeledField>
          <LabeledField label="Marital status" sem={sem}>
            <SelectField
              value={personal.maritalStatus}
              options={MARITAL_STATUS_OPTIONS}
              onSelect={(v) => onChange('personal.maritalStatus', v)}
              sem={sem}
              leftIcon="person-circle-outline"
              placeholder="Marital status"
            />
          </LabeledField>
        </RowPair>

        <RowPair>
          <LabeledField label="Do you have children?" sem={sem}>
            <SelectField
              value={personal.hasChildren}
              options={YES_NO_OPTIONS}
              onSelect={(v) => onChange('personal.hasChildren', v)}
              sem={sem}
              placeholder="Has children"
            />
          </LabeledField>
          <LabeledField label="Do you want children?" sem={sem}>
            <SelectField
              value={personal.wantsChildren}
              options={YES_NO_OPTIONS}
              onSelect={(v) => onChange('personal.wantsChildren', v)}
              sem={sem}
              placeholder="Wants children"
            />
          </LabeledField>
        </RowPair>
      </SectionCard>

      {/* ─── Profile Visibility ─── */}
      <SectionCard sem={sem}>
        <SectionTitle title="Profile Visibility" sem={sem} />

        <Text className="text-sm font-medium mb-1.5" style={{ color: sem.textSecondary }}>
          Discovery mode
        </Text>
        <View
          className="flex-row rounded-xl overflow-hidden border"
          style={{ borderColor: sem.border }}
        >
          {DISCOVERY_MODES.map((mode) => {
            const isActive = discoveryMode === mode;
            const isLocked = mode === 'INCOGNITO' && !incognitoEnabled;
            return (
              <Pressable
                key={mode}
                onPress={() => {
                  if (isLocked) {
                    themedAlert({
                      title: 'Premium Feature',
                      message: 'Incognito mode is available with a premium subscription. Upgrade to hide your profile from discovery.',
                      icon: 'diamond-outline',
                      iconColor: '#F59E0B',
                      buttons: [
                        { text: 'Not now', style: 'cancel' },
                        { text: 'Upgrade', onPress: () => router.push('/(app)/premium') },
                      ],
                    });
                  } else {
                    onDiscoveryModeChange?.(mode);
                  }
                }}
                className="flex-1 flex-row items-center justify-center py-3 gap-1.5"
                style={{
                  backgroundColor: isActive ? sem.accentSoft : 'transparent',
                  borderWidth: isActive ? 1 : 0,
                  borderColor: isActive ? sem.accent : 'transparent',
                  borderRadius: isActive ? 10 : 0,
                  opacity: isLocked ? 0.5 : 1,
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={MODE_LABELS[mode]}
              >
                <Ionicons name={isLocked ? 'lock-closed-outline' : MODE_ICONS[mode]} size={16} color={isActive ? sem.accent : sem.textMuted} />
                <Text className="text-sm font-semibold" style={{ color: isActive ? sem.accent : sem.textMuted }}>
                  {MODE_LABELS[mode]}
                </Text>
                {isLocked && (
                  <Ionicons name="diamond-outline" size={13} color="#F59E0B" />
                )}
              </Pressable>
            );
          })}
        </View>
        {discoveryMode === 'INCOGNITO' && !incognitoEnabled ? (
          <Text className="text-sm mt-2 mb-1" style={{ color: '#F59E0B' }}>
            Private is a premium feature. Upgrade to unlock.
          </Text>
        ) : (
          <View className="mt-2 gap-1">
            <Text className="text-sm" style={{ color: sem.textMuted }}>
              {MODE_HELPERS.PUBLIC}
            </Text>
            <Text className="text-sm" style={{ color: sem.textMuted }}>
              {MODE_HELPERS.INCOGNITO}
            </Text>
          </View>
        )}
      </SectionCard>
    </View>
  );
});
