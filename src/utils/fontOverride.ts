import { Platform, Text } from 'react-native';

export function applyFontOverride() {
  if (Platform.OS === 'web') return;

  const defaultProps = (Text as any).defaultProps ?? {};
  (Text as any).defaultProps = {
    ...defaultProps,
    style: [{ fontFamily: 'Inter_400Regular' }, defaultProps.style],
  };
}
