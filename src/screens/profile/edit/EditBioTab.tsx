import { memo } from 'react';
import { View } from 'react-native';

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
  const { personal } = draft;

  return (
    <View>
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
      </SectionCard>
    </View>
  );
});
