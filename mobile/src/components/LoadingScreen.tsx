import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAppTheme } from '../context/ThemeContext';

export const LoadingScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const styles = useStyles();

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.neon} />
    </View>
  );
};

const useStyles = () => {
  const { colors } = useAppTheme();
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.darkBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
};
