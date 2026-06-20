import { memo } from 'react';
import { View } from 'react-native';

import { type SemanticTheme } from '@/constants/semantic-colors';
import {
  type EditProfileDraft,
  EDUCATION_OPTIONS,
  ETHNICITY_OPTIONS,
  MARITAL_STATUS_OPTIONS,
  NATIONALITY_OPTIONS,
  RELATIONSHIP_INTENTION_OPTIONS,
  RELIGION_OPTIONS,
  YES_NO_OPTIONS,
} from '../mockEditProfile';
import {
  LabeledField,
  RowPair,
  SectionCard,
  SectionTitle,
  SelectField,
  TextInputField,
} from './FormComponents';

type Props = {
  draft: EditProfileDraft;
  onChange: (path: string, value: string) => void;
  sem: SemanticTheme;
};

export const PersonalTab = memo(function PersonalTab({ draft, onChange, sem }: Props) {
  const { personal } = draft;

  return (
    <View>
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
