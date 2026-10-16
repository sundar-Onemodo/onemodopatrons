import { RootState } from "@/src/store/store";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSelector } from "react-redux";

const { width } = Dimensions.get("window");

export default function IndexScreen() {
  const router = useRouter();
  const { authToken } = useSelector((state: RootState) => state.auth);
  const [rehydrated, setRehydrated] = useState(false);

  // Animation values
  const entranceScale = useRef(new Animated.Value(0.6)).current;
  const entranceOpacity = useRef(new Animated.Value(0)).current;
  const pulseRingScale = useRef(new Animated.Value(1)).current;
  const pulseRingOpacity = useRef(new Animated.Value(0.5)).current;
  const pulseRing2Scale = useRef(new Animated.Value(0.8)).current;
  const pulseRing2Opacity = useRef(new Animated.Value(0.3)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(20)).current;
  const footerOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1. Entrance animation (Icon Pop & Fade in)
    Animated.parallel([
      Animated.spring(entranceScale, {
        toValue: 1,
        friction: 6,
        tension: 45,
        useNativeDriver: true,
      }),
      Animated.timing(entranceOpacity, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();

    // 2. Delayed entrance for Text & Tagline
    Animated.sequence([
      Animated.delay(350),
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 800,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(textTranslateY, {
          toValue: 0,
          duration: 800,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(footerOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    // 3. Continuous Breathing / Floating Animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -8,
          duration: 1600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // 4. Continuous Ambient Glow Pulse Rings
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseRingScale, {
            toValue: 1.45,
            duration: 1800,
            easing: Easing.out(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(pulseRingScale, {
            toValue: 1,
            duration: 1800,
            easing: Easing.in(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(pulseRingOpacity, {
            toValue: 0.1,
            duration: 1800,
            easing: Easing.out(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(pulseRingOpacity, {
            toValue: 0.55,
            duration: 1800,
            easing: Easing.in(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(pulseRing2Scale, {
            toValue: 1.7,
            duration: 2200,
            easing: Easing.out(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(pulseRing2Scale, {
            toValue: 0.9,
            duration: 2200,
            easing: Easing.in(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(pulseRing2Opacity, {
            toValue: 0.05,
            duration: 2200,
            easing: Easing.out(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(pulseRing2Opacity, {
            toValue: 0.35,
            duration: 2200,
            easing: Easing.in(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();
  }, []);

  // Simulate redux-persist rehydration & verify session
  useEffect(() => {
    const timeout = setTimeout(() => setRehydrated(true), 2000);
    return () => clearTimeout(timeout);
  }, []);

  // Smooth Navigation handoff
  useEffect(() => {
    if (!rehydrated) return;

    const navTimer = setTimeout(() => {
      if (authToken) {
        router.replace("/(tabs)");
      } else {
        router.replace("/showloginscreen");
      }
    }, 400);

    return () => clearTimeout(navTimer);
  }, [rehydrated, authToken]);

  return (
    <LinearGradient
      colors={["#03140c", "#072c1a", "#0b3d24", "#03150d"]}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <StatusBar barStyle="light-content" backgroundColor="#03140c" />

      <View style={styles.centerStage}>
        {/* Background Ambient Aura Glow */}
        <Animated.View
          style={[
            styles.outerGlowRing,
            {
              transform: [{ scale: pulseRing2Scale }],
              opacity: pulseRing2Opacity,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.innerGlowRing,
            {
              transform: [{ scale: pulseRingScale }],
              opacity: pulseRingOpacity,
            },
          ]}
        />

        {/* Hero App Icon with 3D Float and Entrance Animation */}
        <Animated.View
          style={[
            styles.iconWrapper,
            {
              opacity: entranceOpacity,
              transform: [
                { scale: entranceScale },
                { translateY: floatAnim },
              ],
            },
          ]}
        >
          <View style={styles.iconFrame}>
            <Image
              source={require("@/assets/images/app_icon.png")}
              style={styles.iconImage}
              resizeMode="cover"
            />
          </View>
        </Animated.View>

        {/* Brand Text Section */}
        <Animated.View
          style={[
            styles.textContainer,
            {
              opacity: textOpacity,
              transform: [{ translateY: textTranslateY }],
            },
          ]}
        >
          {/* Badge Tag */}
          <View style={styles.badgePill}>
            <View style={styles.badgeDot} />
            <Text style={styles.badgeText}>SMART GATE CONTROL</Text>
          </View>

          <Text style={styles.brandTitle}>PATRONS GATE</Text>
          <Text style={styles.brandSubtitle}>
            Automated Quarry Terminal System
          </Text>
        </Animated.View>
      </View>

      {/* Modern Footer Loader Indicator */}
      <Animated.View style={[styles.footer, { opacity: footerOpacity }]}>
        <View style={styles.loaderBarContainer}>
          <View style={styles.loaderBarActive} />
        </View>
        <Text style={styles.loadingText}>Initializing secure connection...</Text>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  centerStage: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  outerGlowRing: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.2)",
  },
  innerGlowRing: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(212, 178, 98, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(212, 178, 98, 0.3)",
  },
  iconWrapper: {
    marginBottom: 24,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      android: {
        elevation: 18,
      },
      ios: {
        shadowColor: "#10b981",
        shadowOpacity: 0.45,
        shadowOffset: { width: 0, height: 12 },
        shadowRadius: 24,
      },
    }),
  },
  iconFrame: {
    width: 140,
    height: 140,
    borderRadius: 32,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.2)",
    backgroundColor: "rgba(0, 0, 0, 0.25)",
  },
  iconImage: {
    width: "100%",
    height: "100%",
  },
  textContainer: {
    alignItems: "center",
    paddingHorizontal: 24,
  },
  badgePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.35)",
    marginBottom: 10,
    gap: 6,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10b981",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#34d399",
    letterSpacing: 1.2,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: "#ffffff",
    letterSpacing: 3,
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.6)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  brandSubtitle: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.72)",
    marginTop: 6,
    letterSpacing: 0.6,
    textAlign: "center",
  },
  footer: {
    position: "absolute",
    bottom: 45,
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 40,
  },
  loaderBarContainer: {
    width: 120,
    height: 3,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 10,
  },
  loaderBarActive: {
    width: "60%",
    height: "100%",
    backgroundColor: "#34d399",
    borderRadius: 2,
  },
  loadingText: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.55)",
    letterSpacing: 0.4,
  },
});
