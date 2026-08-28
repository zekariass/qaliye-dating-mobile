import { memo } from 'react';
import { Text, View } from 'react-native';

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
};

export const EditDetailsTab = memo(function EditDetailsTab({ draft, onChange, onChangeEthnicities, sem }: Props) {
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
            leftIcon="mci:hands-pray"
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
    </View>
  );
});
