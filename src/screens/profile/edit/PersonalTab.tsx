import { memo, useCallback } from 'react';
import { View } from 'react-native';

import { EthnicityMultiSelectPicker } from '@/components/catalog/EthnicityMultiSelectPicker';
import { type SemanticTheme } from '@/constants/semantic-colors';
import type { EthnicityOption } from '@/types/catalog';
import {
    type EditProfileDraft,
    EDUCATION_OPTIONS,
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
  onChangeEthnicities: (items: EthnicityOption[]) => void;
  sem: SemanticTheme;
};

export const PersonalTab = memo(function PersonalTab({ draft, onChange, onChangeEthnicities, sem }: Props) {
  const { personal } = draft;

  const handleEthnicitiesChange = useCallback(
    (items: EthnicityOption[]) => onChangeEthnicities(items),
    [onChangeEthnicities],
  );

  return (
    <View>
      {/* ─── Heritage ─── */}
      <SectionCard sem={sem}>
        <SectionTitle title="Heritage" sem={sem} />

        <LabeledField label="Ethnicity / Background" sem={sem} flex={false}>
          <EthnicityMultiSelectPicker
            selected={personal.ethnicities}
            onChange={handleEthnicitiesChange}
            accentColor="#8A2CFF"
            textColor={sem.textPrimary}
            mutedColor={sem.textMuted}
            borderColor={sem.border}
            surfaceColor={sem.surface}
          />
        </LabeledField>

        <RowPair>
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
        </RowPair>
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
