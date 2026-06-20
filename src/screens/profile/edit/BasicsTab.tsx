import { memo } from 'react';
import { View } from 'react-native';

import { type SemanticTheme } from '@/constants/semantic-colors';
import {
    type EditProfileDraft,
    DRINKING_OPTIONS,
    EDUCATION_OPTIONS,
    ETHNICITY_OPTIONS,
    GENDER_OPTIONS,
    MARITAL_STATUS_OPTIONS,
    NATIONALITY_OPTIONS,
    RELATIONSHIP_INTENTION_OPTIONS,
    RELIGION_OPTIONS,
    RESIDENCY_OPTIONS,
    SMOKING_OPTIONS,
    YES_NO_OPTIONS,
} from '../mockEditProfile';
import { AccountStatusCard } from './AccountStatusCard';
import {
    HelperText,
    LabeledField,
    RowPair,
    SectionCard,
    SectionTitle,
    SelectField,
    TextAreaField,
    TextInputField,
} from './FormComponents';

type Props = {
  draft: EditProfileDraft;
  onChange: (path: string, value: string) => void;
  sem: SemanticTheme;
};

export const BasicsTab = memo(function BasicsTab({ draft, onChange, sem }: Props) {
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

        <RowPair>
          <LabeledField label="Residency type" sem={sem}>
            <SelectField
              value={basics.residencyType === 'ETHIOPIA' ? 'Ethiopia' : basics.residencyType === 'ERITREA' ? 'Eritrea' : 'Diaspora'}
              options={RESIDENCY_OPTIONS.map((r) => r === 'ETHIOPIA' ? 'Ethiopia' : r === 'ERITREA' ? 'Eritrea' : 'Diaspora')}
              onSelect={(v) => onChange('basics.residencyType', v === 'Ethiopia' ? 'ETHIOPIA' : v === 'Eritrea' ? 'ERITREA' : 'DIASPORA')}
              sem={sem}
              leftIcon="globe-outline"
              placeholder="Residency type"
            />
          </LabeledField>
          <LabeledField label="Address" sem={sem}>
            <SelectField
              value={basics.address}
              options={['Addis Ababa, Ethiopia', 'Dire Dawa, Ethiopia', 'Bahir Dar, Ethiopia', 'Hawassa, Ethiopia']}
              onSelect={(v) => onChange('basics.address', v)}
              sem={sem}
              leftIcon="location-outline"
              placeholder="Address"
            />
          </LabeledField>
        </RowPair>
        <HelperText text="Your location helps us show you closer matches." sem={sem} />
      </SectionCard>

      {/* ─── About You ─── */}
      <SectionCard sem={sem}>
        <SectionTitle title="About You" sem={sem} />

        <LabeledField label="Bio" sem={sem} flex={false}>
          <TextAreaField
            value={personal.bio}
            onChangeText={(v) => onChange('personal.bio', v)}
            sem={sem}
            maxLength={500}
            placeholder="Tell others about yourself..."
          />
        </LabeledField>

        <View className="h-4" />

        <RowPair>
          <LabeledField label="Ethnicity" sem={sem}>
            <SelectField
              value={personal.ethnicity}
              options={ETHNICITY_OPTIONS}
              onSelect={(v) => onChange('personal.ethnicity', v)}
              sem={sem}
              placeholder="Ethnicity"
            />
          </LabeledField>
          <LabeledField label="Nationality" sem={sem}>
            <SelectField
              value={personal.nationality}
              options={NATIONALITY_OPTIONS}
              onSelect={(v) => onChange('personal.nationality', v)}
              sem={sem}
              placeholder="Nationality"
            />
          </LabeledField>
        </RowPair>

        <RowPair>
          <LabeledField label="Religion" sem={sem}>
            <SelectField
              value={personal.religion}
              options={RELIGION_OPTIONS}
              onSelect={(v) => onChange('personal.religion', v)}
              sem={sem}
              placeholder="Religion"
            />
          </LabeledField>
          <LabeledField label="Education level" sem={sem}>
            <SelectField
              value={personal.educationLevel}
              options={EDUCATION_OPTIONS}
              onSelect={(v) => onChange('personal.educationLevel', v)}
              sem={sem}
              placeholder="Education level"
            />
          </LabeledField>
        </RowPair>

        <RowPair>
          <LabeledField label="Occupation" sem={sem}>
            <TextInputField
              value={personal.occupation}
              onChangeText={(v) => onChange('personal.occupation', v)}
              sem={sem}
              leftIcon="briefcase-outline"
              placeholder="Occupation"
            />
          </LabeledField>
          <LabeledField label="Relationship intention" sem={sem}>
            <SelectField
              value={personal.relationshipIntention}
              options={RELATIONSHIP_INTENTION_OPTIONS}
              onSelect={(v) => onChange('personal.relationshipIntention', v)}
              sem={sem}
              leftIcon="heart-outline"
              placeholder="Relationship intention"
            />
          </LabeledField>
        </RowPair>

        <RowPair>
          <LabeledField label="Marital status" sem={sem}>
            <SelectField
              value={personal.maritalStatus}
              options={MARITAL_STATUS_OPTIONS}
              onSelect={(v) => onChange('personal.maritalStatus', v)}
              sem={sem}
              placeholder="Marital status"
            />
          </LabeledField>
          <LabeledField label="Do you have children?" sem={sem}>
            <SelectField
              value={personal.hasChildren}
              options={YES_NO_OPTIONS}
              onSelect={(v) => onChange('personal.hasChildren', v)}
              sem={sem}
              placeholder="Children"
            />
          </LabeledField>
        </RowPair>

        <LabeledField label="Do you want children?" sem={sem} flex={false}>
          <View className="w-1/2 pr-1.5">
            <SelectField
              value={personal.wantsChildren}
              options={YES_NO_OPTIONS}
              onSelect={(v) => onChange('personal.wantsChildren', v)}
              sem={sem}
              placeholder="Want children"
            />
          </View>
        </LabeledField>
      </SectionCard>

      {/* ─── Lifestyle ─── */}
      <SectionCard sem={sem}>
        <SectionTitle title="Lifestyle" sem={sem} />
        <RowPair>
          <LabeledField label="Smoking" sem={sem}>
            <SelectField
              value={draft.lifestyle.smoking}
              options={SMOKING_OPTIONS}
              onSelect={(v) => onChange('lifestyle.smoking', v)}
              sem={sem}
              leftIcon="ban-outline"
              placeholder="Smoking"
            />
          </LabeledField>
          <LabeledField label="Drinking" sem={sem}>
            <SelectField
              value={draft.lifestyle.drinking}
              options={DRINKING_OPTIONS}
              onSelect={(v) => onChange('lifestyle.drinking', v)}
              sem={sem}
              leftIcon="wine-outline"
              placeholder="Drinking"
            />
          </LabeledField>
        </RowPair>
      </SectionCard>

      {/* ─── Account Status ─── */}
      <AccountStatusCard sem={sem} />
    </View>
  );
});
