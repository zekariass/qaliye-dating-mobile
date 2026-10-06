import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { CountrySelectPicker } from '@/components/catalog/CountrySelectPicker';
import { EthnicityMultiSelectPicker } from '@/components/catalog/EthnicityMultiSelectPicker';
import { type SemanticTheme } from '@/constants/semantic-colors';
import type { EthnicityOption } from '@/types/catalog';
import { translateProfileOption } from '@/utils/profileOptions';
import {
    type EditProfileDraft,
    EDUCATION_OPTIONS,
    FAMILY_INVOLVEMENT_OPTIONS,
    GENDER_OPTIONS,
    LONG_DISTANCE_OPTIONS,
    MARITAL_STATUS_OPTIONS,
    MARRIAGE_TIMELINE_OPTIONS,
    RELATIONSHIP_INTENTION_OPTIONS,
    RELIGION_IMPORTANCE_OPTIONS,
    RELIGION_OPTIONS,
    WILLING_TO_RELOCATE_OPTIONS,
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

// Thin wrapper: display strings are already labels (no i18n translation needed)
const identityLabel = (opt: string) => opt;

export const EditDetailsTab = memo(function EditDetailsTab({ draft, onChange, onChangeEthnicities, sem }: Props) {
  const { t } = useTranslation();
  const { basics, personal, marriagePrefs } = draft;
  const genderLabels = { MALE: t('profile.edit.male'), FEMALE: t('profile.edit.female') } as const;
  const optionLabel = (opt: string) => translateProfileOption(opt, t);

  return (
    <View>
      {/* ─── Basic Information ─── */}
      <SectionCard sem={sem}>
        <SectionTitle title={t('profile.edit.basicInformation')} sem={sem} />

        <RowPair>
          <LabeledField label={t('profile.edit.displayName')} sem={sem}>
            <TextInputField
              value={basics.displayName}
              onChangeText={(v) => onChange('basics.displayName', v)}
              sem={sem}
              placeholder={t('profile.edit.displayNamePlaceholder')}
            />
          </LabeledField>
          <LabeledField label={t('profile.edit.gender')} sem={sem}>
            <SelectField
              value={basics.gender === 'MALE' ? genderLabels.MALE : basics.gender === 'FEMALE' ? genderLabels.FEMALE : basics.gender}
              options={GENDER_OPTIONS.map((g) => genderLabels[g as keyof typeof genderLabels] ?? g)}
              onSelect={(v) => onChange('basics.gender', v === genderLabels.MALE ? 'MALE' : 'FEMALE')}
              sem={sem}
              placeholder={t('profile.edit.gender')}
            />
          </LabeledField>
        </RowPair>

        <RowPair>
          <LabeledField label={t('profile.edit.dateOfBirth')} sem={sem}>
            <DatePickerField
              value={basics.dateOfBirth}
              onSelect={(v) => onChange('basics.dateOfBirth', v)}
              sem={sem}
              placeholder={t('profile.edit.dobPlaceholder')}
            />
          </LabeledField>
          <LabeledField label={t('profile.edit.height')} sem={sem}>
            <TextInputField
              value={basics.heightCm ? String(basics.heightCm) : ''}
              onChangeText={(v) => onChange('basics.heightCm', v.replace(/[^0-9]/g, ''))}
              sem={sem}
              leftIcon="resize-outline"
              placeholder={t('profile.edit.height')}
              rightElement={
                <Text className="text-base ml-1" style={{ color: sem.textMuted }}>
                  {t('profile.edit.heightUnit')}
                </Text>
              }
            />
          </LabeledField>
        </RowPair>

      </SectionCard>

      {/* ─── Heritage ─── */}
      <SectionCard sem={sem}>
        <SectionTitle title={t('profile.edit.heritage')} sem={sem} />

        <LabeledField label={t('profile.edit.ethnicityBackground')} sem={sem} flex={false}>
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

        <LabeledField label={t('profile.edit.nationality')} sem={sem} flex={false}>
          <CountrySelectPicker
            value={personal.nationality || null}
            onChange={(code) => onChange('personal.nationality', code)}
            placeholder={t('profile.edit.selectNationality')}
            accentColor={sem.accent}
            textColor={sem.textPrimary}
            mutedColor={sem.textMuted}
            borderColor={sem.border}
            surfaceColor={sem.surface}
            surfaceMutedColor={sem.surfaceMuted}
          />
        </LabeledField>

        <LabeledField label={t('profile.edit.religion')} sem={sem}>
          <SelectField
            value={personal.religion}
            options={RELIGION_OPTIONS}
            getOptionLabel={optionLabel}
            onSelect={(v) => onChange('personal.religion', v)}
            sem={sem}
            leftIcon="mci:hands-pray"
            placeholder={t('profile.edit.religion')}
          />
        </LabeledField>
      </SectionCard>

      {/* ─── Education & Work ─── */}
      <SectionCard sem={sem}>
        <SectionTitle title={t('profile.edit.educationWork')} sem={sem} />

        <LabeledField label={t('profile.edit.educationLevel')} sem={sem} flex={false}>
          <SelectField
            value={personal.educationLevel}
            options={EDUCATION_OPTIONS}
            getOptionLabel={optionLabel}
            onSelect={(v) => onChange('personal.educationLevel', v)}
            sem={sem}
            leftIcon="school-outline"
            placeholder={t('profile.edit.educationLevel')}
          />
        </LabeledField>
        <LabeledField label={t('profile.edit.occupation')} sem={sem} flex={false}>
          <TextInputField
            value={personal.occupation}
            onChangeText={(v) => onChange('personal.occupation', v)}
            sem={sem}
            leftIcon="briefcase-outline"
            placeholder={t('profile.edit.occupationPlaceholder')}
          />
        </LabeledField>
      </SectionCard>

      {/* ─── Relationship ─── */}
      <SectionCard sem={sem}>
        <SectionTitle title={t('profile.edit.relationship')} sem={sem} />

        <RowPair>
          <LabeledField label={t('profile.edit.relationshipIntention')} sem={sem}>
            <SelectField
              value={personal.relationshipIntention}
              options={RELATIONSHIP_INTENTION_OPTIONS}
              getOptionLabel={optionLabel}
              onSelect={(v) => onChange('personal.relationshipIntention', v)}
              sem={sem}
              leftIcon="heart-outline"
              placeholder={t('profile.edit.intentionPlaceholder')}
            />
          </LabeledField>
          <LabeledField label={t('profile.edit.maritalStatus')} sem={sem}>
            <SelectField
              value={personal.maritalStatus}
              options={MARITAL_STATUS_OPTIONS}
              getOptionLabel={optionLabel}
              onSelect={(v) => onChange('personal.maritalStatus', v)}
              sem={sem}
              leftIcon="person-circle-outline"
              placeholder={t('profile.edit.maritalStatus')}
            />
          </LabeledField>
        </RowPair>

        <RowPair>
          <LabeledField label={t('profile.edit.hasChildrenQuestion')} sem={sem}>
            <SelectField
              value={personal.hasChildren}
              options={YES_NO_OPTIONS}
              getOptionLabel={optionLabel}
              onSelect={(v) => onChange('personal.hasChildren', v)}
              sem={sem}
              placeholder={t('profile.edit.hasChildrenPlaceholder')}
            />
          </LabeledField>
          <LabeledField label={t('profile.edit.wantsChildrenQuestion')} sem={sem}>
            <SelectField
              value={personal.wantsChildren}
              options={YES_NO_OPTIONS}
              getOptionLabel={optionLabel}
              onSelect={(v) => onChange('personal.wantsChildren', v)}
              sem={sem}
              placeholder={t('profile.edit.wantsChildrenPlaceholder')}
            />
          </LabeledField>
        </RowPair>
      </SectionCard>

      {/* ─── Marriage & Relationship Preferences ─── */}
      <SectionCard sem={sem}>
        <SectionTitle title={t('profile.marriagePrefs.sectionTitle')} sem={sem} />

        <LabeledField label={t('profile.marriagePrefs.marriageTimeline')} sem={sem} flex={false}>
          <SelectField
            value={marriagePrefs.marriageTimeline}
            options={MARRIAGE_TIMELINE_OPTIONS as unknown as string[]}
            getOptionLabel={identityLabel}
            onSelect={(v) => onChange('marriagePrefs.marriageTimeline', v)}
            sem={sem}
            leftIcon="calendar-outline"
            placeholder={t('profile.marriagePrefs.notSpecified')}
          />
        </LabeledField>

        <LabeledField label={t('profile.marriagePrefs.longDistance')} sem={sem} flex={false}>
          <SelectField
            value={marriagePrefs.longDistanceRelationship}
            options={LONG_DISTANCE_OPTIONS as unknown as string[]}
            getOptionLabel={identityLabel}
            onSelect={(v) => onChange('marriagePrefs.longDistanceRelationship', v)}
            sem={sem}
            leftIcon="airplane-outline"
            placeholder={t('profile.marriagePrefs.notSpecified')}
          />
        </LabeledField>

        <LabeledField label={t('profile.marriagePrefs.familyInvolvement')} sem={sem} flex={false}>
          <SelectField
            value={marriagePrefs.familyInvolvement}
            options={FAMILY_INVOLVEMENT_OPTIONS as unknown as string[]}
            getOptionLabel={identityLabel}
            onSelect={(v) => onChange('marriagePrefs.familyInvolvement', v)}
            sem={sem}
            leftIcon="people-outline"
            placeholder={t('profile.marriagePrefs.notSpecified')}
          />
        </LabeledField>

        <LabeledField label={t('profile.marriagePrefs.religionImportance')} sem={sem} flex={false}>
          <SelectField
            value={marriagePrefs.religionImportance}
            options={RELIGION_IMPORTANCE_OPTIONS as unknown as string[]}
            getOptionLabel={identityLabel}
            onSelect={(v) => onChange('marriagePrefs.religionImportance', v)}
            sem={sem}
            leftIcon="leaf-outline"
            placeholder={t('profile.marriagePrefs.notSpecified')}
          />
        </LabeledField>

        <LabeledField label={t('profile.marriagePrefs.willingToRelocate')} sem={sem} flex={false}>
          <SelectField
            value={marriagePrefs.willingToRelocate}
            options={WILLING_TO_RELOCATE_OPTIONS as unknown as string[]}
            getOptionLabel={identityLabel}
            onSelect={(v) => onChange('marriagePrefs.willingToRelocate', v)}
            sem={sem}
            leftIcon="location-outline"
            placeholder={t('profile.marriagePrefs.notSpecified')}
          />
        </LabeledField>
      </SectionCard>
    </View>
  );
});
