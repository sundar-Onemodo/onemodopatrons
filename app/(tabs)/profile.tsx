import { BASE_URL } from "@/src/components/BaseUrlApi";
import { resetAuth } from "@/src/store/authSlice";
import { RootState } from "@/src/store/store";
import { Entypo, Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import {
  Alert,
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";

export default function Profile() {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const { phNumber, emailId, username, signupCountry, authToken } = useSelector(
    (state: RootState) => state.auth
  );

  const spinValue = new Animated.Value(0);

  // Animation for the refresh button
  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const startSpin = () => {
    spinValue.setValue(0);
    Animated.timing(spinValue, {
      toValue: 1,
      duration: 1000,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start();
  };

  const handleLogout = async () => {
    Alert.alert("Confirm Logout", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            const formData = new FormData();
            formData.append("token", authToken || "");
            await axios.post(BASE_URL + "employeelogout", formData, {
              headers: {
                "Content-Type": "multipart/form-data",
                "User-Agent": "DashboardApp",
              },
            });
          } catch (e) {
            console.error("Logout API call error:", e);
          } finally {
            await AsyncStorage.removeItem("authToken");
            dispatch(resetAuth());
            router.replace("/showloginscreen");
          }
        },
      },
    ]);
  };

  const getInitial = (name: string) => {
    return name ? name.charAt(0).toUpperCase() : "?";
  };

  return (
    <View style={styles.container}>
      {/* Edge-to-Edge Status Bar Fill */}
      <View style={{ height: insets.top, backgroundColor: "#0f5f3c", width: "100%" }} />
      <StatusBar style="light" backgroundColor="#0f5f3c" />
      <LinearGradient
        colors={["#0f5f3c", "#0a3d27"]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Operator Profile</Text>
        <TouchableOpacity onPress={startSpin}>
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <Feather name="refresh-ccw" size={20} color="#fff" />
          </Animated.View>
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Profile Card Header */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitial(username || "")}</Text>
            </View>
            <View style={styles.avatarBadge}>
              <MaterialCommunityIcons name="shield-check" size={14} color="#fff" />
            </View>
          </View>
          <Text style={styles.username}>{username || "Gate Operator"}</Text>
          <Text style={styles.userTitle}>Gate Terminal Supervisor</Text>
        </View>

        {/* Credentials Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Terminal Credentials</Text>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoItem}>
              <View style={styles.infoIconContainer}>
                <Ionicons name="id-card" size={18} color="#0f5f3c" />
              </View>
              <Text style={styles.infoLabel}>Operator ID</Text>
              <Text style={styles.infoValue} numberOfLines={1}>
                {emailId || "--"}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoItem}>
              <View style={styles.infoIconContainer}>
                <Ionicons name="person" size={18} color="#0f5f3c" />
              </View>
              <Text style={styles.infoLabel}>Username</Text>
              <Text style={styles.infoValue}>{username || "--"}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoItem}>
              <View style={styles.infoIconContainer}>
                <Ionicons name="call" size={18} color="#0f5f3c" />
              </View>
              <Text style={styles.infoLabel}>Terminal Phone</Text>
              <Text style={styles.infoValue}>
                {phNumber ? `+91 ${phNumber}` : "--"}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoItem}>
              <View style={{ flexDirection: "row", width: "100%", alignItems: "center", justifyContent: "space-between" }}>
                <View style={{ width: "40%", flexDirection: "row", alignItems: "center" }}>
                  <View style={styles.infoIconContainer}>
                    <Ionicons name="location" size={18} color="#0f5f3c" />
                  </View>
                  <Text style={styles.infoLabel}>Site Location</Text>
                </View>
                <View style={{ width: "60%" }}>
                  <Text style={styles.infoValue} ellipsizeMode="tail" numberOfLines={1}>
                    {signupCountry || "Secure Quarry Terminal"}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Terminal Operations Activity list */}
        <View style={styles.section1}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Terminal Actions</Text>
          </View>

          <View style={styles.infoCard}>
            <TouchableOpacity
              style={styles.activityItem}
              onPress={() => router.push("/(tabs)/boom" as any)}
            >
              <View style={styles.activityIcon}>
                <MaterialCommunityIcons name="boom-gate" size={20} color="#0f5f3c" />
              </View>
              <Text style={styles.activityText}>Gate Control Panel</Text>
              <Entypo name="chevron-right" size={20} color="#999" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.activityItem}
              onPress={() => router.push("/(tabs)/logs" as any)}
            >
              <View style={[styles.activityIcon, { backgroundColor: "rgba(30, 136, 229, 0.1)" }]}>
                <MaterialCommunityIcons name="file-document" size={20} color="#1e88e5" />
              </View>
              <Text style={styles.activityText}>Activity logs history</Text>
              <Entypo name="chevron-right" size={20} color="#999" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.activityItem}
              onPress={() => router.push("/(tabs)/own-vehicles" as any)}
            >
              <View style={[styles.activityIcon, { backgroundColor: "rgba(212, 178, 98, 0.1)" }]}>
                <MaterialCommunityIcons name="car-cog" size={20} color="#d4b262" />
              </View>
              <Text style={styles.activityText}>Map Company Vehicles</Text>
              <Entypo name="chevron-right" size={20} color="#999" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.activityItem}
              onPress={() => router.push("/showpayslip" as any)}
            >
              <View style={[styles.activityIcon, { backgroundColor: "rgba(124, 77, 255, 0.1)" }]}>
                <MaterialCommunityIcons name="file-percent" size={20} color="#7c4dff" />
              </View>
              <Text style={styles.activityText}>Operator PaySlips</Text>
              <Entypo name="chevron-right" size={20} color="#999" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.activityItem} onPress={handleLogout}>
              <View style={[styles.activityIcon, { backgroundColor: "rgba(244, 67, 54, 0.1)" }]}>
                <Ionicons name="log-out" size={20} color="#F44336" />
              </View>
              <Text style={[styles.activityText, { color: "#F44336" }]}>Log Out Terminal</Text>
              <Entypo name="chevron-right" size={20} color="#999" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fa",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    elevation: 4,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 15,
  },
  profileSection: {
    alignItems: "center",
    paddingVertical: 25,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 12,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(15, 95, 60, 0.15)",
    borderWidth: 2,
    borderColor: "#0f5f3c",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#0f5f3c",
  },
  avatarBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#d4b262",
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  username: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  userTitle: {
    fontSize: 13,
    color: "#666",
    fontWeight: "500",
  },
  section: {
    marginBottom: 25,
  },
  section1: {
    marginBottom: 120,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#333",
  },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  infoIconContainer: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(15, 95, 60, 0.08)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  infoLabel: {
    flex: 1,
    fontSize: 13,
    color: "#666",
    fontWeight: "600",
  },
  infoValue: {
    flex: 2,
    fontSize: 13,
    color: "#333",
    fontWeight: "700",
    textAlign: "right",
  },
  divider: {
    height: 1,
    backgroundColor: "#f0f0f0",
    marginVertical: 4,
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  activityIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(15, 95, 60, 0.08)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  activityText: {
    flex: 1,
    fontSize: 13,
    color: "#333",
    fontWeight: "600",
  },
});