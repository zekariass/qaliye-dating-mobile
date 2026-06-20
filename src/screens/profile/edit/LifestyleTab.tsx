import { memo, useCallback } from 'react';
import { View } from 'react-native';

import { type SemanticTheme } from '@/constants/semantic-colors';
import {
  type EditProfileDraft,
  ACTIVITY_OPTIONS,
  DRINKING_OPTIONS,
  INTEREST_OPTIONS,
  LANGUAGE_OPTIONS,
  SMOKING_OPTIONS,
} from '../mockEditProfile';
import {
  ChipSelector,
  LabeledField,
  RowPair,
  SectionCard,
  SectionTitle,
  SelectField,
} from './FormComponents';

type Props = {
  draft: EditProfileDraft;
  onChange: (path: string, value: string) => void;
  onToggleArrayItem: (path: string, value: string) => void;
  sem: SemanticTheme;
};

export const LifestyleTab = memo(function LifestyleTab({ draft, onChange, onToggleArrayItem, sem }: Props) {
  const { lifestyle } = draft;

  const handleToggleInterest = useCallback((val: string) => {
    onToggleArrayItem('lifestyle.interests', val);
  }, [onToggleArrayItem]);

  const handleToggleLanguage = useCallback((val: string) => {
    onToggleArrayItem('lifestyle.languages', val);
  }, [onToggleArrayItem]);

  return (
    <View>
      {/* ─── Habits ─── */}
      <SectionCard sem={sem}>
        <SectionTitle title="Habits" sem={sem} />

        <RowPair>
          <LabeledField label="Smoking" sem={sem}>
            <SelectField
              value={lifestyle.smoking}
              options={SMOKING_OPTIONS}
              onSelect={(v) => onChange('lifestyle.smoking', v)}
              sem={sem}
              leftIcon="ban-outline"
              placeholder="Smoking"
            />
          </LabeledField>
          <LabeledField label="Drinking" sem={sem}>
            <SelectField
              value={lifestyle.drinking}
              options={DRINKING_OPTIONS}
              onSelect={(v) => onChange('lifestyle.drinking', v)}
              sem={sem}
              leftIcon="wine-outline"
              placeholder="Drinking"
            />
          </LabeledField>
        </RowPair>

        <LabeledField label="Activity level" sem={sem} flex={false}>
          <View className="w-1/2 pr-1.5">
            <SelectField
              value={lifestyle.activityLevel}
              options={ACTIVITY_OPTIONS}
              onSelect={(v) => onChange('lifestyle.activityLevel', v)}
              sem={sem}
              leftIcon="fitness-outline"
              placeholder="Activity level"
            />
          </View>
        </LabeledField>
      </SectionCard>

      {/* ─── Interests ─── */}
      <SectionCard sem={sem}>
        <SectionTitle title="Interests" sem={sem} />
        <ChipSelector
          options={INTEREST_OPTIONS}
          selected={lifestyle.interests}
          onToggle={handleToggleInterest}
          sem={sem}
        />
      </SectionCard>

      {/* ─── Languages ─── */}
      <SectionCard sem={sem}>
        <SectionTitle title="Languages" sem={sem} />
        <ChipSelector
          options={LANGUAGE_OPTIONS}
          selected={lifestyle.languages}
          onToggle={handleToggleLanguage}
          sem={sem}
        />
      </SectionCard>
    </View>
  );
});
