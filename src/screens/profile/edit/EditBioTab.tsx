import { memo } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { type SemanticTheme } from '@/constants/semantic-colors';
import { type EditProfileDraft } from '../mockEditProfile';
import {
    LabeledField,
    SectionCard,
    SectionTitle,
    TextAreaField,
} from './FormComponents';

type Props = {
  draft: EditProfileDraft;
  onChange: (path: string, value: string) => void;
  sem: SemanticTheme;
};

export const EditBioTab = memo(function EditBioTab({ draft, onChange, sem }: Props) {
  const { t } = useTranslation();
  const { personal } = draft;

  return (
    <View>
      <SectionCard sem={sem}>
        <SectionTitle title={t('profile.bio.aboutYou')} sem={sem} />

        <LabeledField label={t('profile.tabs.bio')} sem={sem} flex={false}>
          <TextAreaField
            value={personal.bio}
            onChangeText={(v) => onChange('personal.bio', v)}
            sem={sem}
            maxLength={500}
            placeholder={t('profile.bio.placeholder')}
          />
        </LabeledField>
      </SectionCard>
    </View>
  );
});
