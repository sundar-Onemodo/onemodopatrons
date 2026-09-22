// app/(tabs)/_layout.tsx
import { MaterialCommunityIcons, SimpleLineIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const CustomTabBar = ({ state, descriptors, navigation }: any) => {
  return (
    <View style={styles.tabContainer}>
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const label = options.tabBarLabel ?? options.title ?? route.name;
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const iconColor = '#fff';

        let icon;
        if (route.name === 'index') {
          icon = <MaterialCommunityIcons name="view-dashboard-outline" size={22} color={iconColor} />;
        } else if (route.name === 'boom') {
          icon = <MaterialCommunityIcons name="boom-gate-outline" size={22} color={iconColor} />;
        } else if (route.name === 'logs') {
          icon = <MaterialCommunityIcons name="file-document-outline" size={22} color={iconColor} />;
        } else if (route.name === 'own-vehicles') {
          icon = <MaterialCommunityIcons name="car-cog" size={22} color={iconColor} />;
        } else {
          icon = <SimpleLineIcons name="user" size={20} color={iconColor} />;
        }

        return (
          <TouchableOpacity
            key={index}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarTestID}
            onPress={onPress}
            style={
              isFocused ? [styles.tabButton, styles.activeTab] : styles.tabButton
            }
          >
            {icon}
            {isFocused && <Text style={styles.tabText}>{label}</Text>}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Dashboard' }} />
      <Tabs.Screen name="boom" options={{ title: 'Gate Control' }} />
      <Tabs.Screen name="logs" options={{ title: 'Logs' }} />
      <Tabs.Screen name="own-vehicles" options={{ title: 'Own Vehicles' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#0f5f3c',
    borderRadius: 35,
    padding: 6,
    margin: 8,
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 15 : 20,
    left: 10,
    right: 10,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 25,
  },
  activeTab: {
    backgroundColor: '#d4b262',
  },
  tabText: {
    color: '#fff',
    marginLeft: 6,
    fontWeight: '600',
    fontSize: 12,
  },
});