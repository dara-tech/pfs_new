import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { appColors } from '../theme';

const defaultColors = {
  completed: appColors.primary,
  current: appColors.primaryDark,
  currentBorder: appColors.primary,
  upcoming: appColors.border,
};

/**
 * Shared step indicator: N dots; completed show checkmark, current highlighted, upcoming muted.
 */
export default function StepDots({
  total,
  currentIndex,
  size = 18,
  gap = 6,
  completedColor = defaultColors.completed,
  currentColor = defaultColors.current,
  currentBorderColor = defaultColors.currentBorder,
  upcomingColor = defaultColors.upcoming,
}) {
  return (
    <View style={[styles.row, { gap }]}>
      {Array.from({ length: total }, (_, i) => {
        const isCompleted = i < currentIndex;
        const isCurrent = i === currentIndex;
        return (
          <View
            key={i}
            style={[
              styles.dot,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
              },
              isCompleted && { backgroundColor: completedColor },
              isCurrent && {
                backgroundColor: currentColor,
                borderWidth: 2,
                borderColor: currentBorderColor,
              },
              !isCompleted && !isCurrent && { backgroundColor: upcomingColor },
            ]}
          >
            {isCompleted ? <Ionicons name="checkmark" size={size * 0.55} color={appColors.white} /> : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
