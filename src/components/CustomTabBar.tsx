import { Feather, Ionicons, SimpleLineIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { usePathname, useRouter } from "expo-router";
import React from "react";
import {
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const tabs = [
  { name: "index", label: "Home", icon: "home-outline" },
  { name: "search", label: "Search", icon: "search" },
  { name: "notifications", label: "Alerts", icon: "bell" },
  { name: "settings", label: "Settings", icon: "settings" },
  { name: "profile", label: "Profile", icon: "user" },
];

export default function CustomTabBar() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <View style={[styles.container, { bottom: insets.bottom + 10 }]}>
      <BlurView intensity={80} tint="light" style={styles.blurContainer}>
        {tabs.map((tab, index) => {
          const isFocused =
            pathname === `/(tabs)/${tab.name}` ||
            (tab.name === "index" && pathname === "/");

          return (
            <TouchableOpacity
              key={index}
              style={[styles.tabButton, isFocused && styles.activeTab]}
              onPress={() => router.push(`/(tabs)/${tab.name}` as any)}
              activeOpacity={0.8}
            >
              {tab.icon === "user" ? (
                <SimpleLineIcons
                  name={tab.icon}
                  size={20}
                  color={isFocused ? "#fff" : "#666"}
                />
              ) : tab.icon === "bell" ? (
                <Feather
                  name={tab.icon}
                  size={20}
                  color={isFocused ? "#fff" : "#666"}
                />
              ) : (
                <Ionicons
                  name={tab.icon as any}
                  size={20}
                  color={isFocused ? "#fff" : "#666"}
                />
              )}
              {isFocused && <Text style={styles.tabLabel}>{tab.label}</Text>}
            </TouchableOpacity>
          );
        })}
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 20,
    right: 20,
    height: 70,
    borderRadius: 35,
    backgroundColor: "transparent",
    ...Platform.select({
      android: {
        elevation: 10,
      },
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 8,
      },
    }),
  },
  blurContainer: {
    flex: 1,
    flexDirection: "row",
    borderRadius: 35,
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
  },
  tabButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 25,
  },
  activeTab: {
    backgroundColor: "#367cff", // Active pill background
  },
  tabLabel: {
    color: "#fff",
    fontSize: 14,
    marginLeft: 6,
    fontWeight: "600",
  },
});
