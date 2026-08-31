import { Stack } from 'expo-router';

export default function MainLayout() {

  return (
    <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="showloginscreen" options={{ headerShown: false }} />
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="showcreatepassword" options={{ headerShown: false }} />
      <Stack.Screen name="showattendancescreen" options={{ headerShown: false }} />
      <Stack.Screen name="showdashboard" options={{ headerShown: false }} />
      <Stack.Screen name="showadpopup" options={{ headerShown: false }} />
      <Stack.Screen name="showpayslip" options={{ headerShown: false }} />
      <Stack.Screen name="showvehiclescanner" options={{ headerShown: false }} />

    </Stack>
  );
}
