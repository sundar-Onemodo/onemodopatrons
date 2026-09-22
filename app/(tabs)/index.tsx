import { BASE_URL } from "@/src/components/BaseUrlApi";
import { resetAuth } from "@/src/store/authSlice";
import { RootState } from "@/src/store/store";
import { resolveImageUrl } from "@/src/utils/imageUtils";
import { AntDesign, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import moment from "moment";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";

const { width } = Dimensions.get("window");

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [pendingCount, setPendingCount] = useState(0);
  const [exitedCount, setExitedCount] = useState(0);
  const [recentVehicles, setRecentVehicles] = useState<any[]>([]);
  const [time, setTime] = useState(moment().format("HH:mm A"));
  const locationName = "Secure Gate Terminal";
  const [loading, setLoading] = useState(false);

  const dispatch = useDispatch();
  const { authToken, username, companyId } = useSelector(
    (state: RootState) => state.auth
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(moment().format("HH:mm A"));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch stats and recent entries via GET
  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Pending List (inside quarry) via GET
      const pendingRes = await axios.get(BASE_URL + "boompendinglist", {
        params: {
          company_id: companyId || 23,
          limit: 10,
          offset: 0,
        },
        headers: { "User-Agent": "DashboardApp" },
      });

      let pendingList = [];
      if (pendingRes.data.status === "success" || pendingRes.data.success) {
        pendingList = pendingRes.data.data || [];
        setPendingCount(pendingRes.data.total_count !== undefined ? pendingRes.data.total_count : pendingList.length);
      }

      // 2. Fetch Exited List (today's completed logs) via GET
      const exitedRes = await axios.get(BASE_URL + "boomexitedlist", {
        params: {
          company_id: companyId || 23,
          from_date: moment().format("YYYY-MM-DD"),
          to_date: moment().format("YYYY-MM-DD"),
          limit: 50,
          offset: 0,
        },
        headers: { "User-Agent": "DashboardApp" },
      });

      if (exitedRes.data.status === "success" || exitedRes.data.success) {
        const exitedList = exitedRes.data.data || [];
        setExitedCount(exitedRes.data.total_count !== undefined ? exitedRes.data.total_count : exitedList.length);
      }

      // Preview recent 4 inside vehicles
      setRecentVehicles(pendingList.slice(0, 4));

    } catch (error) {
      console.error("Error loading dashboard metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, [companyId])
  );

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

  const getInitial = (name: string) =>
    name ? name.charAt(0).toUpperCase() : "?";

  return (
    <View style={styles.safeArea}>
      {/* Edge-to-Edge Status Bar Fill */}
      <View style={{ height: insets.top, backgroundColor: "#0f5f3c", width: "100%" }} />
      <StatusBar style="light" backgroundColor="#0f5f3c" />
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.headerContainer}>
          <View style={styles.profileContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitial(username || "")}</Text>
            </View>
            <View style={styles.profileTextContainer}>
              <Text style={styles.greeting}>Hello, {username || "Operator"}</Text>
              <Text style={styles.locationText} numberOfLines={1}>
                📍 {locationName}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <AntDesign name="logout" size={20} color="#F44336" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Time and Date */}
        <LinearGradient
          colors={["#0f5f3c", "#1e6042"]}
          style={styles.timeCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.timeCardContent}>
            <View>
              <Text style={styles.clockText}>{time}</Text>
              <Text style={styles.dateText}>
                {moment().format("dddd, D MMMM YYYY")}
              </Text>
            </View>
            <MaterialCommunityIcons
              name="clock-time-four-outline"
              size={44}
              color="rgba(255, 255, 255, 0.8)"
            />
          </View>
        </LinearGradient>

        {/* Gate Barrier Control Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.pulseContainer}>
            <View style={styles.pulseDot} />
            <View style={styles.pulseRing} />
          </View>
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={styles.statusTitle}>Automated Barrier System</Text>
            <Text style={styles.statusSub}>Operational • LAN Connected</Text>
          </View>
          <TouchableOpacity
            style={styles.quickGateBtn}
            onPress={() => router.push("/(tabs)/boom" as any)}
          >
            <MaterialCommunityIcons name="boom-gate-up" size={18} color="#fff" />
            <Text style={styles.quickGateText}>Gate</Text>
          </TouchableOpacity>
        </View>

        {/* Counts Row */}
        <View style={styles.countsRow}>
          <TouchableOpacity
            style={[styles.countCard, { borderLeftColor: "#0f5f3c" }]}
            onPress={() => router.push("/(tabs)/logs" as any)}
            activeOpacity={0.8}
          >
            <View style={styles.countCardHeader}>
              <Text style={styles.countTitle}>Vehicles Inside</Text>
              <View style={[styles.countBadge, { backgroundColor: "rgba(15, 95, 60, 0.1)" }]}>
                <MaterialCommunityIcons name="car-multiple" size={18} color="#0f5f3c" />
              </View>
            </View>
            <Text style={[styles.countValue, { color: "#0f5f3c" }]}>{pendingCount}</Text>
            <Text style={styles.countSub}>Currently on-site</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.countCard, { borderLeftColor: "#28a745" }]}
            onPress={() => router.push("/(tabs)/logs" as any)}
            activeOpacity={0.8}
          >
            <View style={styles.countCardHeader}>
              <Text style={styles.countTitle}>Exited Today</Text>
              <View style={[styles.countBadge, { backgroundColor: "rgba(40, 167, 69, 0.1)" }]}>
                <MaterialCommunityIcons name="check-circle-outline" size={18} color="#28a745" />
              </View>
            </View>
            <Text style={[styles.countValue, { color: "#28a745" }]}>{exitedCount}</Text>
            <Text style={styles.countSub}>Successfully completed</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Operations</Text>
        <View style={styles.actionGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push("/(tabs)/boom" as any)}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: "rgba(15, 95, 60, 0.1)" }]}>
              <MaterialCommunityIcons name="boom-gate-up" size={24} color="#0f5f3c" />
            </View>
            <Text style={styles.actionText}>Gate Entry</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push("/(tabs)/boom" as any)}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: "rgba(255, 152, 0, 0.1)" }]}>
              <MaterialCommunityIcons name="barcode-scan" size={24} color="#ff9800" />
            </View>
            <Text style={styles.actionText}>Scan & Exit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push("/(tabs)/logs" as any)}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: "rgba(33, 150, 243, 0.1)" }]}>
              <MaterialCommunityIcons name="file-document-outline" size={24} color="#2196f3" />
            </View>
            <Text style={styles.actionText}>View Logs</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push("/(tabs)/own-vehicles" as any)}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: "rgba(156, 39, 176, 0.1)" }]}>
              <MaterialCommunityIcons name="car-cog" size={24} color="#9c27b0" />
            </View>
            <Text style={styles.actionText}>Own Vehicles</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Entries Preview */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Vehicles Inside Quarry</Text>
          <TouchableOpacity onPress={() => router.push("/(tabs)/logs" as any)}>
            <Text style={styles.seeAllLink}>See All ({pendingCount})</Text>
          </TouchableOpacity>
        </View>

        {recentVehicles.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="car-outline" size={40} color="#999" />
            <Text style={styles.emptyText}>No vehicles currently inside</Text>
          </View>
        ) : (
          recentVehicles.map((item, index) => {
            const duration = item.duration_formatted || (item.duration_minutes ? `${item.duration_minutes}m` : "");
            const rawImg = item.entry_image_url || item.entry_image || item.image || item.photo;
            const imgUrl = resolveImageUrl(rawImg);
            return (
              <View key={item.id || index} style={styles.recentCard}>
                <View style={styles.recentContent}>
                  {imgUrl ? (
                    <Image source={{ uri: imgUrl }} style={styles.recentImg} />
                  ) : (
                    <View style={styles.recentIcon}>
                      <MaterialCommunityIcons
                        name={
                          item.vehicle_type?.toLowerCase() === "bike"
                            ? "motorbike"
                            : item.vehicle_type?.toLowerCase() === "car"
                            ? "car"
                            : "truck"
                        }
                        size={22}
                        color="#0f5f3c"
                      />
                    </View>
                  )}
                  <View style={styles.recentInfo}>
                    <Text style={styles.recentTruckText}>{item.truck}</Text>
                    <Text style={styles.recentTypeText}>{item.vehicle_type}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <View style={styles.recentTimeBadge}>
                      <Text style={styles.recentTimeText}>
                        {item.entry_datetime ? moment(item.entry_datetime).format("hh:mm A") : ""}
                      </Text>
                    </View>
                    {duration ? (
                      <Text style={styles.recentDurationText}>⏱️ {duration}</Text>
                    ) : null}
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f5f7fa",
  },
  scrollContainer: {
    padding: 15,
    paddingBottom: Platform.OS === "ios" ? 110 : 130,
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  profileContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#d4b262",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    elevation: 2,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  profileTextContainer: {
    flex: 1,
  },
  greeting: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  locationText: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },
  logoutButton: {
    alignItems: "center",
    padding: 5,
  },
  logoutText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#F44336",
    marginTop: 2,
  },
  timeCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  timeCardContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  clockText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
  },
  dateText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 4,
  },
  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
  },
  pulseContainer: {
    justifyContent: "center",
    alignItems: "center",
    width: 20,
    height: 20,
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#28a745",
    zIndex: 2,
  },
  pulseRing: {
    position: "absolute",
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(40, 167, 69, 0.4)",
    zIndex: 1,
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  statusSub: {
    fontSize: 12,
    color: "#777",
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f5f3c",
    marginBottom: 12,
    marginTop: 10,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 15,
    marginBottom: 10,
  },
  seeAllLink: {
    color: "#0f5f3c",
    fontWeight: "600",
    fontSize: 13,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  statItem: {
    width: (width - 45) / 2,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 15,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
  },
  statValue: {
    fontSize: 28,
    fontWeight: "bold",
    marginVertical: 4,
  },
  statDesc: {
    fontSize: 10,
    color: "#999",
  },
  actionsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  actionButton: {
    width: (width - 50) / 3,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
  },
  quickGateBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0f5f3c",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  quickGateText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
    marginLeft: 4,
  },
  countsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    gap: 10,
  },
  countCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
  },
  countCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  countTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
  },
  countBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  countValue: {
    fontSize: 26,
    fontWeight: "bold",
    marginVertical: 4,
  },
  countSub: {
    fontSize: 10,
    color: "#999",
  },
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 15,
    gap: 10,
  },
  actionCard: {
    width: (width - 40) / 4,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
  },
  actionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  actionText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
  },
  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 30,
    alignItems: "center",
    justifyContent: "center",
    elevation: 1,
  },
  emptyText: {
    fontSize: 13,
    color: "#888",
    marginTop: 10,
  },
  recentCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
  },
  recentContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  recentImg: {
    width: 36,
    height: 36,
    borderRadius: 8,
    marginRight: 2,
  },
  recentIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(15, 95, 60, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  recentInfo: {
    flex: 1,
    marginLeft: 12,
  },
  recentTruckText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  recentTypeText: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  recentTimeBadge: {
    backgroundColor: "#f0f2f5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  recentTimeText: {
    fontSize: 11,
    color: "#555",
    fontWeight: "500",
  },
  recentDurationText: {
    fontSize: 10,
    color: "#0f5f3c",
    fontWeight: "600",
    marginTop: 3,
  },
});
