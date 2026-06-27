import { memo } from 'react';
import { View } from 'react-native';

import { type SemanticTheme } from '@/constants/semantic-colors';
import { AccountStatusCard } from './AccountStatusCard';

type Props = {
  sem: SemanticTheme;
};

export const EditStatusTab = memo(function EditStatusTab({ sem }: Props) {
  return (
    <View>
      <AccountStatusCard sem={sem} />
    </View>
  );
});
