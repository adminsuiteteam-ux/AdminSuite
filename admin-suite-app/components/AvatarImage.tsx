import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { Image, ImageStyle } from 'expo-image';
import { getMediaUrl } from '@/services/api';

const VIBRANT_PALETTE = [
  '#4f46e5', // indigo
  '#2563eb', // blue
  '#0d9488', // teal
  '#059669', // emerald
  '#d97706', // amber
  '#ea580c', // orange
  '#e11d48', // rose
  '#7c3aed', // violet
  '#0284c7', // light blue
  '#db2777', // pink
];

function getColorForString(str: string): string {
  if (!str) return VIBRANT_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % VIBRANT_PALETTE.length;
  return VIBRANT_PALETTE[index];
}

export interface AvatarImageProps {
  uri?: string | null;
  size?: number;
  initials?: string;
  name?: string;
  style?: StyleProp<ImageStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  fallbackBg?: string;
  fallbackTextColor?: string;
  priority?: 'low' | 'normal' | 'high';
  contentFit?: 'cover' | 'contain';
}

export function AvatarImage({
  uri,
  size = 40,
  initials,
  name,
  style,
  containerStyle,
  textStyle,
  fallbackBg,
  fallbackTextColor = '#ffffff',
  priority = 'normal',
  contentFit = 'cover',
}: AvatarImageProps) {
  const [hasError, setHasError] = useState(false);

  // Compute initials
  const resolvedInitials = useMemo(() => {
    if (initials && initials.trim()) {
      return initials.trim().slice(0, 2).toUpperCase();
    }
    if (name && name.trim()) {
      const parts = name.trim().split(/\s+/).filter(Boolean);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return parts[0].slice(0, 2).toUpperCase();
    }
    return 'US';
  }, [initials, name]);

  const effectiveBg = useMemo(() => {
    if (fallbackBg) return fallbackBg;
    return getColorForString(name || initials || 'user');
  }, [fallbackBg, name, initials]);

  // Request high-res retina thumbnail optimized for avatar size
  const optimizedUri = useMemo(() => {
    if (!uri || typeof uri !== 'string' || !uri.trim()) return '';
    const pixelDensitySize = Math.max(80, Math.round(size * 2));
    return getMediaUrl(uri, {
      width: pixelDensitySize,
      height: pixelDensitySize,
      crop: 'fill',
    });
  }, [uri, size]);

  const fontSize = Math.max(10, Math.round(size * 0.38));
  const borderRadius = Math.round(size / 2);

  if (!optimizedUri || hasError) {
    return (
      <View
        style={[
          styles.container,
          {
            width: size,
            height: size,
            borderRadius,
            backgroundColor: effectiveBg,
          },
          containerStyle,
        ]}
      >
        <Text
          style={[
            styles.initialsText,
            {
              fontSize,
              color: fallbackTextColor,
            },
            textStyle,
          ]}
          numberOfLines={1}
        >
          {resolvedInitials}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius,
          backgroundColor: effectiveBg + '22',
        },
        containerStyle,
      ]}
    >
      <Image
        source={{ uri: optimizedUri }}
        style={[
          {
            width: size,
            height: size,
            borderRadius,
          },
          style,
        ]}
        contentFit={contentFit}
        transition={120}
        cachePolicy="memory-disk"
        priority={priority}
        onError={() => setHasError(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  initialsText: {
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
  },
});

export default AvatarImage;
