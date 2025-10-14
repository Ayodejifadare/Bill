import React from 'react';
import { Text, TextProps } from 'react-native';
import { useTextStyle, TextVariant } from '../theme/typography';

type Props = TextProps & { variant?: TextVariant };

export function ThemedText({ variant = 'base', style, ...props }: Props) {
  const textStyle = useTextStyle(variant, (style as any));
  return <Text {...props} style={textStyle} />;
}

