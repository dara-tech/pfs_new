import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { appColors } from '../theme';

const defaultColors = {
  fill: appColors.primary,
  background: appColors.border,
};

/**
 * Shared animated progress bar (0–100). Animates width over ~350ms.
 */
export default function AnimatedProgressBar({
  progress = 0,
  duration = 350,
  height = 8,
  borderRadius = 4,
  fillColor = defaultColors.fill,
  backgroundColor = defaultColors.background,
  style,
}) {
  const anim = useRef(new Animated.Value(progress)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: progress,
      duration,
      useNativeDriver: false,
    }).start();
  }, [progress, duration]);

  return (
    <View style={[styles.outer, { height, borderRadius, backgroundColor }, style]}>
      <Animated.View
        style={[
          styles.fill,
          {
            height,
            borderRadius,
            backgroundColor: fillColor,
            width: anim.interpolate({
              inputRange: [0, 100],
              outputRange: ['0%', '100%'],
            }),
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});
