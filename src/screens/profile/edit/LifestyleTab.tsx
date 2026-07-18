import { memo, useCallback } from 'react';
import { View } from 'react-native';

import { LanguageMultiSelectPicker } from '@/components/catalog/LanguageMultiSelectPicker';
import { InterestPicker } from '@/components/profile/InterestPicker';
import { type SemanticTheme } from '@/constants/semantic-colors';
import type { LanguageOption } from '@/types/catalog';
import {
    type EditProfileDraft,
    ACTIVITY_OPTIONS,
    DRINKING_OPTIONS,
    SMOKING_OPTIONS,
} from '../mockEditProfile';
import {
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
  onChangeLanguages: (items: LanguageOption[]) => void;
  sem: SemanticTheme;
};

export const LifestyleTab = memo(function LifestyleTab({ draft, onChange, onToggleArrayItem, onChangeLanguages, sem }: Props) {
  const { lifestyle } = draft;

  const handleToggleInterest = useCallback((val: string) => {
    onToggleArrayItem('lifestyle.interests', val);
  }, [onToggleArrayItem]);

  const handleLanguagesChange = useCallback(
    (items: LanguageOption[]) => onChangeLanguages(items),
    [onChangeLanguages],
  );

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
        <InterestPicker
          selected={lifestyle.interests}
          onToggle={handleToggleInterest}
          sem={sem}
        />
      </SectionCard>

      {/* ─── Languages ─── */}
      <SectionCard sem={sem}>
        <SectionTitle title="Languages" sem={sem} />
        <LanguageMultiSelectPicker
          selected={lifestyle.languages}
          onChange={handleLanguagesChange}
          accentColor="#8A2CFF"
          textColor={sem.textPrimary}
          mutedColor={sem.textMuted}
          borderColor={sem.border}
          surfaceColor={sem.surface}
        />
      </SectionCard>
    </View>
  );
});
