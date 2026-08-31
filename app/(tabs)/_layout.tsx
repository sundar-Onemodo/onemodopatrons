// app/_layout.tsx or wherever you define the Tabs
import { FontAwesome, Ionicons, MaterialCommunityIcons, SimpleLineIcons } from '@expo/vector-icons';
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

        const iconColor = isFocused ? '#fff' : '#fff';

        let icon;
        if (route.name === 'index') {
          icon = <Ionicons name="home" size={20} color={iconColor} />;
        } else if (route.name === 'attendance') {
          icon = <FontAwesome name="calendar" size={20} color={iconColor} />;
        } 
        else if (route.name === 'boom') {
          icon =
        <MaterialCommunityIcons name="boom-gate-outline" size={22} color={iconColor} />
        }
        else {
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
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="attendance" options={{ title: 'Attendance' }} />
      <Tabs.Screen name="boom" options={{ title: 'boom' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#0f5f3c',
    borderRadius: 40,
    padding: 8,
    margin: 5,
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 10 : 20,
    left: 20,
    right: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 30,
  },
  activeTab: {
    backgroundColor: '#d4b262',
  },
  tabText: {
    color: '#fff',
    marginLeft: 8,
    fontWeight: '600',
  },
});