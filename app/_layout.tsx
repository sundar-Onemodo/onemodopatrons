import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { Provider } from 'react-redux';

import { useColorScheme } from '@/hooks/useColorScheme';
import { persistor, store } from '@/src/store/store';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { PersistGate } from 'redux-persist/integration/react';
import MainLayout from './mainLayout';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [rehydrated, setRehydrated] = useState(false);

  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <Provider store={store}>
      <PersistGate
        loading={
          <View style={{ flex: 1, backgroundColor: '#070D1E', justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#3B82F6" />
          </View>
        }
        persistor={persistor}
        onBeforeLift={() => setRehydrated(true)}
      >
        {rehydrated && (
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <MainLayout />
            <StatusBar style="light" backgroundColor="#070D1E" />
          </ThemeProvider>
        )}
      </PersistGate>
    </Provider>
  );
}
