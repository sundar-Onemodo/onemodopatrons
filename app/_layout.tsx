import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { Provider } from 'react-redux';

import { useColorScheme } from '@/hooks/useColorScheme';
import { persistor, store } from '@/src/store/store';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { PersistGate } from 'redux-persist/integration/react';
import MainLayout from './mainLayout';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [rehydrated, setRehydrated] = useState(false);

  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) {
    return null;
  }

  return (
    <Provider store={store}>
      <PersistGate
        loading={
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" />
          </View>
        }
        persistor={persistor}
        onBeforeLift={() => setRehydrated(true)}
      >
        {rehydrated && (
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <MainLayout />
            <StatusBar style="auto" />
          </ThemeProvider>
        )}
      </PersistGate>
    </Provider>
  );
}
