import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import RenderHtml from 'react-native-render-html';

type Props = {
  html: string;
  color: string;
  secondaryColor?: string;
  fontSize?: number;
};

export function HtmlText({ html, color, secondaryColor, fontSize = 14 }: Props) {
  const { width } = useWindowDimensions();

  const tagsStyles = useMemo(
    () => ({
      h1: { color, fontSize: fontSize + 6, fontWeight: '700' as const, marginBottom: 8 },
      h2: { color, fontSize: fontSize + 4, fontWeight: '700' as const, marginBottom: 8 },
      h3: { color, fontSize: fontSize + 2, fontWeight: '700' as const, marginBottom: 6 },
      h4: { color, fontSize: fontSize + 1, fontWeight: '700' as const, marginBottom: 4 },
      p: { color, fontSize, lineHeight: fontSize * 1.5, marginBottom: 8 },
      strong: { color, fontWeight: '700' as const },
      b: { color, fontWeight: '700' as const },
      em: { color, fontStyle: 'italic' as const },
      i: { color, fontStyle: 'italic' as const },
      u: { color, textDecorationLine: 'underline' as const },
      li: { color, fontSize, lineHeight: fontSize * 1.5 },
      div: { marginBottom: 8 },
      hr: { borderBottomWidth: 1, borderBottomColor: (secondaryColor ?? color) + '30', marginVertical: 8 },
    }),
    [color, secondaryColor, fontSize],
  );

  const baseStyle = useMemo(
    () => ({ color, fontSize, lineHeight: fontSize * 1.5 }),
    [color, fontSize],
  );

  return (
    <RenderHtml
      contentWidth={width}
      source={{ html }}
      tagsStyles={tagsStyles}
      baseStyle={baseStyle}
    />
  );
}
