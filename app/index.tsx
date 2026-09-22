import { RootState } from "@/src/store/store";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSelector } from "react-redux";

export default function IndexScreen() {
  const router = useRouter();
  const { authToken } = useSelector((state: RootState) => state.auth);
  const [rehydrated, setRehydrated] = useState(false);

  // Animation refs
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0.6)).current;

  // Smooth zoom-in & zoom-out pulsing animation
  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.4,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(opacityAnim, {
            toValue: 0.15,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0.6,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();
  }, []);

  // Simulate redux-persist rehydration & verify session
  useEffect(() => {
    const timeout = setTimeout(() => setRehydrated(true), 1500);
    return () => clearTimeout(timeout);
  }, []);

  // Navigation
  useEffect(() => {
    if (!rehydrated) return;

    if (authToken) {
      setTimeout(() => {
        router.replace("/(tabs)");
      }, 1500);
    } else {
      setTimeout(() => {
        router.replace("/showloginscreen");
      }, 1500);
    }
  }, [rehydrated, authToken]);

  return (
    <LinearGradient colors={["#0f5f3c", "#0a3d27"]} style={styles.container}>
      <View style={styles.markerContainer}>
        {/* Pulsating animated circle */}
        <Animated.View
          style={[
            styles.pulse,
            {
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        />

        {/* Shield Lock Icon */}
        <View style={styles.iconWrapper}>
          <MaterialCommunityIcons name="shield-lock" size={64} color="#d4b262" />
        </View>
      </View>

      {/* Welcome Terminal Text */}
      <View style={styles.textContainer}>
        <Text style={styles.title}>PATRONS GATE</Text>
        <Text style={styles.subTitle}>Securing Gate Terminal Access...</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  markerContainer: {
    width: 180,
    height: 180,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  pulse: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(212, 178, 98, 0.2)",
  },
  iconWrapper: {
    justifyContent: "center",
    alignItems: "center",
  },
  textContainer: {
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    letterSpacing: 2,
  },
  subTitle: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.7)",
    marginTop: 6,
    letterSpacing: 0.5,
  },
});
