import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';

import { type SemanticTheme } from '@/constants/semantic-colors';
import {
    type EditProfileDraft,
    EDUCATION_OPTIONS,
    ETHNICITY_OPTIONS,
    GENDER_OPTIONS,
    MARITAL_STATUS_OPTIONS,
    NATIONALITY_OPTIONS,
    RELATIONSHIP_INTENTION_OPTIONS,
    RELIGION_OPTIONS,
    RESIDENCY_OPTIONS,
    YES_NO_OPTIONS,
} from '../mockEditProfile';
import {
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
  sem: SemanticTheme;
  discoveryMode?: 'PUBLIC' | 'INCOGNITO';
  onDiscoveryModeChange?: (mode: 'PUBLIC' | 'INCOGNITO') => void;
};

const DISCOVERY_MODES = ['PUBLIC', 'INCOGNITO'] as const;
const MODE_ICONS: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  PUBLIC: 'globe-outline',
  INCOGNITO: 'glasses-outline',
};
const MODE_LABELS: Record<string, string> = { PUBLIC: 'Public', INCOGNITO: 'Incognito' };
const MODE_HELPERS: Record<string, string> = {
  PUBLIC: 'Your profile appears in discovery for others.',
  INCOGNITO: 'Your profile is hidden from discovery.',
};

export const EditDetailsTab = memo(function EditDetailsTab({ draft, onChange, sem, discoveryMode = 'PUBLIC', onDiscoveryModeChange }: Props) {
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
            <TextInputField
              value={basics.dateOfBirth}
              onChangeText={(v) => onChange('basics.dateOfBirth', v)}
              sem={sem}
              leftIcon="calendar-outline"
              placeholder="DD MMM YYYY"
            />
          </LabeledField>
          <LabeledField label="Height (cm)" sem={sem}>
            <TextInputField
              value={basics.heightCm ? `${basics.heightCm} cm` : ''}
              onChangeText={(v) => onChange('basics.heightCm', v.replace(/[^0-9]/g, ''))}
              sem={sem}
              leftIcon="resize-outline"
              placeholder="Height"
            />
          </LabeledField>
        </RowPair>

        <LabeledField label="Residency type" sem={sem} flex={false}>
          <View className="w-1/2 pr-1.5">
            <SelectField
              value={basics.residencyType === 'ETHIOPIA' ? 'Ethiopia' : basics.residencyType === 'ERITREA' ? 'Eritrea' : 'Diaspora'}
              options={RESIDENCY_OPTIONS.map((r) => r === 'ETHIOPIA' ? 'Ethiopia' : r === 'ERITREA' ? 'Eritrea' : 'Diaspora')}
              onSelect={(v) => onChange('basics.residencyType', v === 'Ethiopia' ? 'ETHIOPIA' : v === 'Eritrea' ? 'ERITREA' : 'DIASPORA')}
              sem={sem}
              leftIcon="globe-outline"
              placeholder="Residency type"
            />
          </View>
        </LabeledField>

      </SectionCard>

      {/* ─── Heritage ─── */}
      <SectionCard sem={sem}>
        <SectionTitle title="Heritage" sem={sem} />

        <RowPair>
          <LabeledField label="Ethnicity" sem={sem}>
            <SelectField
              value={personal.ethnicity}
              options={ETHNICITY_OPTIONS}
              onSelect={(v) => onChange('personal.ethnicity', v)}
              sem={sem}
              leftIcon="people-outline"
              placeholder="Ethnicity"
            />
          </LabeledField>
          <LabeledField label="Nationality" sem={sem}>
            <SelectField
              value={personal.nationality}
              options={NATIONALITY_OPTIONS}
              onSelect={(v) => onChange('personal.nationality', v)}
              sem={sem}
              leftIcon="flag-outline"
              placeholder="Nationality"
            />
          </LabeledField>
        </RowPair>

        <LabeledField label="Religion" sem={sem} flex={false}>
          <View className="w-1/2 pr-1.5">
            <SelectField
              value={personal.religion}
              options={RELIGION_OPTIONS}
              onSelect={(v) => onChange('personal.religion', v)}
              sem={sem}
              leftIcon="leaf-outline"
              placeholder="Religion"
            />
          </View>
        </LabeledField>
      </SectionCard>

      {/* ─── Education & Work ─── */}
      <SectionCard sem={sem}>
        <SectionTitle title="Education & Work" sem={sem} />

        <RowPair>
          <LabeledField label="Education level" sem={sem}>
            <SelectField
              value={personal.educationLevel}
              options={EDUCATION_OPTIONS}
              onSelect={(v) => onChange('personal.educationLevel', v)}
              sem={sem}
              leftIcon="school-outline"
              placeholder="Education level"
            />
          </LabeledField>
          <LabeledField label="Occupation" sem={sem}>
            <TextInputField
              value={personal.occupation}
              onChangeText={(v) => onChange('personal.occupation', v)}
              sem={sem}
              leftIcon="briefcase-outline"
              placeholder="Your occupation"
            />
          </LabeledField>
        </RowPair>
      </SectionCard>

      {/* ─── Profile Visibility ─── */}
      <SectionCard sem={sem}>
        <SectionTitle title="Profile Visibility" sem={sem} />

        <Text className="text-xs font-medium mb-1.5" style={{ color: sem.textSecondary }}>
          Discovery mode
        </Text>
        <View
          className="flex-row rounded-xl overflow-hidden border"
          style={{ borderColor: sem.border }}
        >
          {DISCOVERY_MODES.map((mode) => {
            const isActive = discoveryMode === mode;
            return (
              <Pressable
                key={mode}
                onPress={() => onDiscoveryModeChange?.(mode)}
                className="flex-1 flex-row items-center justify-center py-3 gap-1.5"
                style={{
                  backgroundColor: isActive ? sem.accentSoft : 'transparent',
                  borderWidth: isActive ? 1 : 0,
                  borderColor: isActive ? sem.accent : 'transparent',
                  borderRadius: isActive ? 10 : 0,
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={MODE_LABELS[mode]}
              >
                <Ionicons name={MODE_ICONS[mode]} size={16} color={isActive ? sem.accent : sem.textMuted} />
                <Text className="text-xs font-semibold" style={{ color: isActive ? sem.accent : sem.textMuted }}>
                  {MODE_LABELS[mode]}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text className="text-xs mt-2 mb-1" style={{ color: sem.textMuted }}>
          {MODE_HELPERS[discoveryMode]}
        </Text>
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
    </View>
  );
});
