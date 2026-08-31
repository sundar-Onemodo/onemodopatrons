import { RootState } from "@/src/store/store";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
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
  const [locationName, setLocationName] = useState("Fetching location...");

  // Animation refs
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0.6)).current;

  // Smooth zoom-in & zoom-out pulsing animation
  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.6,
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
            toValue: 0.2,
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

  // Get current location once
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission to access location was denied");
        setLocationName("Permission denied");
        return;
      }

      try {
        const loc = await Location.getCurrentPositionAsync({});
        const [place] = await Location.reverseGeocodeAsync(loc.coords);

        if (place) {
          const name = `${place.name || ""}, ${place.city || ""}, ${
            place.region || ""
          }, ${place.country || ""}`;
          setLocationName(name);
        } else {
          setLocationName("Unable to fetch location");
        }
      } catch (err) {
        console.error("Location error:", err);
        setLocationName("Error fetching location");
      }
    })();
  }, []);

  // Simulate redux-persist rehydration
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
      }, 2000);
    } else {
      setTimeout(() => {
        router.replace("/showloginscreen");
      }, 2000);
    }
  }, [rehydrated, authToken]);

  return (
    <LinearGradient colors={["#ffffff", "#f9f9f9"]} style={styles.container}>
      <View style={styles.mapMarkerContainer}>
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

        {/* Location Pin */}
        <View style={styles.pinWrapper}>
          <MaterialIcons name="location-pin" size={60} color="#ff4d4d" />
        </View>
      </View>

      {/* Location Text */}
      <View style={styles.textContainer}>
        <Text style={styles.subTitle}>Your Location</Text>
        <View style={styles.row}>
          <MaterialIcons name="location-on" size={20} color="#ff4d4d" />
          <Text style={styles.title}>Work</Text>
        </View>
        <Text style={styles.address} numberOfLines={2}>
          {locationName}
        </Text>
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
  mapMarkerContainer: {
    width: 180,
    height: 180,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 40,
  },
  pulse: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(255,77,77,0.3)",
  },
  pinWrapper: {
    justifyContent: "center",
    alignItems: "center",
  },
  textContainer: {
    alignItems: "center",
    paddingHorizontal: 20,
  },
  subTitle: {
    fontSize: 14,
    color: "#999",
    letterSpacing: 1,
    marginBottom: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#000",
    marginLeft: 4,
  },
  address: {
    fontSize: 14,
    color: "#555",
    textAlign: "center",
  },
});
