import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { LanguageMultiSelectPicker } from '@/components/catalog/LanguageMultiSelectPicker';
import { InterestPicker } from '@/components/profile/InterestPicker';
import { type SemanticTheme } from '@/constants/semantic-colors';
import type { LanguageOption } from '@/types/catalog';
import { translateProfileOption } from '@/utils/profileOptions';
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
  const { t } = useTranslation();
  const { lifestyle } = draft;
  const optionLabel = (opt: string) => translateProfileOption(opt, t);

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
        <SectionTitle title={t('profile.edit.habits')} sem={sem} />

        <RowPair>
          <LabeledField label={t('profile.edit.smoking')} sem={sem}>
            <SelectField
              value={lifestyle.smoking}
              options={SMOKING_OPTIONS}
              getOptionLabel={optionLabel}
              onSelect={(v) => onChange('lifestyle.smoking', v)}
              sem={sem}
              leftIcon="ban-outline"
              placeholder={t('profile.edit.smoking')}
            />
          </LabeledField>
          <LabeledField label={t('profile.edit.drinking')} sem={sem}>
            <SelectField
              value={lifestyle.drinking}
              options={DRINKING_OPTIONS}
              getOptionLabel={optionLabel}
              onSelect={(v) => onChange('lifestyle.drinking', v)}
              sem={sem}
              leftIcon="wine-outline"
              placeholder={t('profile.edit.drinking')}
            />
          </LabeledField>
        </RowPair>

        <LabeledField label={t('profile.edit.fitness')} sem={sem} flex={false}>
          <View className="w-1/2 pr-1.5">
            <SelectField
              value={lifestyle.activityLevel}
              options={ACTIVITY_OPTIONS}
              getOptionLabel={optionLabel}
              onSelect={(v) => onChange('lifestyle.activityLevel', v)}
              sem={sem}
              leftIcon="fitness-outline"
              placeholder={t('profile.edit.fitness')}
            />
          </View>
        </LabeledField>
      </SectionCard>

      {/* ─── Interests ─── */}
      <SectionCard sem={sem}>
        <SectionTitle title={t('profile.edit.interests')} sem={sem} />
        <InterestPicker
          selected={lifestyle.interests}
          onToggle={handleToggleInterest}
          sem={sem}
        />
      </SectionCard>

      {/* ─── Languages ─── */}
      <SectionCard sem={sem}>
        <SectionTitle title={t('profile.edit.languages')} sem={sem} />
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
