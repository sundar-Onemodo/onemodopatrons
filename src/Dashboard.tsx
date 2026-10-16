import { BASE_URL } from "@/src/components/BaseUrlApi";
import { RootState } from "@/src/store/store";
import {
  fetchAndSaveBoomSettings,
  triggerRemoteDoorOpen,
} from "@/src/utils/doorController";
import { resolveImageUrl } from "@/src/utils/imageUtils";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import axios from "axios";
import { router } from "expo-router";
import moment from "moment";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSelector } from "react-redux";

const { width } = Dimensions.get("window");

const Dashboard = () => {
  const [loading, setLoading] = useState(false);
  const [gateOperating, setGateOperating] = useState<"open" | "close" | null>(null);
  const [gateNotice, setGateNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [stats, setStats] = useState({
    inside: 0,
    exitedToday: 0,
    totalToday: 0,
  });
  const [recentEntries, setRecentEntries] = useState<any[]>([]);

  const { companyId, authToken } = useSelector((state: RootState) => state.auth);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      // 1. Fetch Inside Quarry via GET
      const pendingRes = await axios.get(BASE_URL + "boompendinglist", {
        params: {
          company_id: companyId || 23,
          limit: 50,
          offset: 0,
        },
        headers: {
          "User-Agent": "DashboardApp",
        },
      });

      let pendingCount = 0;
      let pendingList = [];
      if (pendingRes.data.status === "success" || pendingRes.data.success) {
        pendingList = pendingRes.data.data || [];
        pendingCount = pendingRes.data.total_count !== undefined ? pendingRes.data.total_count : pendingList.length;
      }

      // 2. Fetch Exited Today via GET
      const exitedRes = await axios.get(BASE_URL + "boomexitedlist", {
        params: {
          company_id: companyId || 23,
          from_date: moment().format("YYYY-MM-DD"),
          to_date: moment().format("YYYY-MM-DD"),
          limit: 50,
          offset: 0,
        },
        headers: {
          "User-Agent": "DashboardApp",
        },
      });

      let exitedCount = 0;
      if (exitedRes.data.status === "success" || exitedRes.data.success) {
        const exitedList = exitedRes.data.data || [];
        exitedCount = exitedRes.data.total_count !== undefined ? exitedRes.data.total_count : exitedList.length;
      }

      setStats({
        inside: pendingCount,
        exitedToday: exitedCount,
        totalToday: pendingCount + exitedCount,
      });

      setRecentEntries(pendingList.slice(0, 5));

    } catch (e) {
      console.error("Dashboard metrics load failed:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    if (companyId) {
      fetchAndSaveBoomSettings(companyId, authToken || undefined);
    }
  }, [companyId, authToken]);



  const handleOpenBoom = async () => {
    setGateOperating("open");
    setGateNotice(null);
    try {
      const res = await triggerRemoteDoorOpen({
        companyId: companyId || 23,
        action: "Dashboard Manual Gate Open",
      });

      if (res.success) {
        setGateNotice({
          type: "success",
          message: "Boom Gate OPEN signal sent successfully ✅",
        });
      } else {
        setGateNotice({
          type: "error",
          message: `Failed to open gate: ${res.error || "Controller unreachable on local network"}`,
        });
      }
    } catch (err: any) {
      setGateNotice({
        type: "error",
        message: `Error opening gate: ${err.message || "Failed"}`,
      });
    } finally {
      setGateOperating(null);
    }
  };

  const renderActivityItem = ({ item, index }: { item: any; index: number }) => {
    const duration = item.duration_formatted || (item.duration_minutes ? `${item.duration_minutes}m` : "--");
    const rawImg = item.entry_image_url || item.entry_image || item.image || item.photo;
    const imgUrl = resolveImageUrl(rawImg);

    return (
      <View style={styles.activityCard}>
        <View style={styles.activityRow}>
          <View style={styles.activityIndexContainer}>
            <Text style={styles.activityIndex}>{index + 1}</Text>
          </View>
          {imgUrl ? (
            <Image source={{ uri: imgUrl }} style={styles.activityThumb} />
          ) : null}
          <View style={styles.activityDetails}>
            <Text style={styles.activityTitle}>{item.truck}</Text>
            <Text style={styles.activitySub}>{item.vehicle_type}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <View style={styles.activityBadge}>
              <Text style={styles.activityBadgeText}>
                In: {item.entry_datetime ? moment(item.entry_datetime).format("hh:mm A") : "--"}
              </Text>
            </View>
            <Text style={styles.activityDurationText}>⏱️ {duration}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#0f5f3c" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Operations Control Panel</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchMetrics} disabled={loading}>
          <Ionicons name="refresh" size={22} color="#0f5f3c" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Main Banner */}
        <View style={styles.banner}>
          <MaterialCommunityIcons name="shield-lock-outline" size={48} color="#d4b262" />
          <Text style={styles.bannerText}>Quarry Gate Secure Terminal</Text>
          <Text style={styles.bannerSub}>Monitor real-time vehicle flow, boom gate operations, and authorization logs.</Text>
        </View>

        {/* Boom Gate Direct Remote Controls Card */}
        <View style={styles.gateControlCard}>
          <View style={styles.gateControlHeader}>
            <MaterialCommunityIcons name="boom-gate" size={22} color="#0f5f3c" />
            <Text style={styles.gateControlTitle}>Boom Gate Direct Control</Text>
          </View>

          {gateNotice && (
            <View
              style={[
                styles.gateNoticeBox,
                {
                  backgroundColor: gateNotice.type === "success" ? "#e8f5e9" : "#ffebee",
                  borderColor: gateNotice.type === "success" ? "#c8e6c9" : "#ffcdd2",
                },
              ]}
            >
              <Ionicons
                name={gateNotice.type === "success" ? "checkmark-circle" : "alert-circle"}
                size={18}
                color={gateNotice.type === "success" ? "#2e7d32" : "#c62828"}
              />
              <Text
                style={[
                  styles.gateNoticeText,
                  { color: gateNotice.type === "success" ? "#2e7d32" : "#c62828" },
                ]}
              >
                {gateNotice.message}
              </Text>
            </View>
          )}

          <View style={styles.gateControlButtonsRow}>
            {/* Direct Open Button */}
            <TouchableOpacity
              style={[
                styles.gateBtn,
                styles.gateOpenBtn,
                gateOperating ? { opacity: 0.7 } : null,
              ]}
              onPress={handleOpenBoom}
              disabled={!!gateOperating}
              activeOpacity={0.8}
            >
              {gateOperating === "open" ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <MaterialCommunityIcons name="boom-gate-up" size={20} color="#fff" />
                  <Text style={styles.gateBtnText}>Open Boom Barrier</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Grid */}
        <Text style={styles.sectionTitle}>Gate Metrics (Today)</Text>
        <View style={styles.metricsGrid}>
          <View style={[styles.metricCard, { borderLeftColor: "#28a745" }]}>
            <Text style={styles.metricVal}>{stats.totalToday}</Text>
            <Text style={styles.metricLabel}>Total Trips Logged</Text>
          </View>
          <View style={[styles.metricCard, { borderLeftColor: "#dc3545" }]}>
            <Text style={styles.metricVal}>{stats.inside}</Text>
            <Text style={styles.metricLabel}>Active inside Quarry</Text>
          </View>
          <View style={[styles.metricCard, { borderLeftColor: "#007bff" }]}>
            <Text style={styles.metricVal}>{stats.exitedToday}</Text>
            <Text style={styles.metricLabel}>Exited Quarry</Text>
          </View>
        </View>

        {/* Live Terminal Flow */}
        <View style={styles.listHeaderRow}>
          <Text style={styles.sectionTitle}>Inside Quarry (Live Preview)</Text>
          {loading && <ActivityIndicator size="small" color="#0f5f3c" />}
        </View>

        {recentEntries.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="shield-checkmark-outline" size={44} color="#aaa" />
            <Text style={styles.emptyText}>No vehicles currently registered inside quarry.</Text>
          </View>
        ) : (
          <FlatList
            data={recentEntries}
            renderItem={renderActivityItem}
            keyExtractor={(item, index) => item.id?.toString() || index.toString()}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          />
        )}

        {/* Navigations Shortcuts */}
        <View style={styles.shortcutsCard}>
          <Text style={styles.shortcutTitle}>Operations Quick Redirects</Text>
          <View style={styles.shortcutRow}>
            <TouchableOpacity
              style={[styles.shortcutBtn, { backgroundColor: "#e8f5e9" }]}
              onPress={() => router.push("/(tabs)/boom" as any)}
            >
              <MaterialCommunityIcons name="boom-gate" size={20} color="#0f5f3c" />
              <Text style={[styles.shortcutBtnText, { color: "#0f5f3c" }]}>Gate Control</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.shortcutBtn, { backgroundColor: "#e3f2fd" }]}
              onPress={() => router.push("/(tabs)/logs" as any)}
            >
              <MaterialCommunityIcons name="file-document" size={20} color="#007bff" />
              <Text style={[styles.shortcutBtnText, { color: "#007bff" }]}>Activity Logs</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

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
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  backBtn: {
    padding: 5,
  },
  refreshBtn: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  scrollContent: {
    padding: 15,
    paddingBottom: 40,
  },
  banner: {
    backgroundColor: "#0f5f3c",
    borderRadius: 16,
    padding: 22,
    alignItems: "center",
    marginBottom: 25,
    elevation: 3,
  },
  bannerText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginTop: 10,
  },
  bannerSub: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#333",
    marginBottom: 12,
  },
  metricsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 25,
  },
  metricCard: {
    width: (width - 45) / 3,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 4,
    elevation: 2,
  },
  metricVal: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
  },
  metricLabel: {
    fontSize: 10,
    color: "#666",
    marginTop: 4,
  },
  listHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  activityCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    elevation: 1.5,
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  activityIndexContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#f0f2f5",
    justifyContent: "center",
    alignItems: "center",
  },
  activityIndex: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#555",
  },
  activityThumb: {
    width: 32,
    height: 32,
    borderRadius: 6,
    marginLeft: 8,
  },
  activityDetails: {
    flex: 1,
    marginLeft: 10,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  activitySub: {
    fontSize: 11,
    color: "#666",
    marginTop: 2,
  },
  activityBadge: {
    backgroundColor: "#f5f5f5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  activityBadgeText: {
    fontSize: 10,
    color: "#555",
    fontWeight: "500",
  },
  activityDurationText: {
    fontSize: 10,
    color: "#0f5f3c",
    fontWeight: "600",
    marginTop: 2,
  },
  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 30,
    alignItems: "center",
    elevation: 1,
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 12,
    color: "#777",
    marginTop: 10,
    textAlign: "center",
  },
  shortcutsCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 15,
    marginTop: 20,
    elevation: 2,
  },
  shortcutTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#333",
    marginBottom: 12,
  },
  shortcutRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  shortcutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    paddingVertical: 10,
    marginHorizontal: 5,
    borderRadius: 8,
  },
  shortcutBtnText: {
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 6,
  },
  gateControlCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  gateControlHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  gateControlTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1e293b",
    marginLeft: 8,
  },
  gateNoticeBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    gap: 8,
  },
  gateNoticeText: {
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  gateControlButtonsRow: {
    flexDirection: "row",
    gap: 12,
  },
  gateBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    gap: 6,
  },
  gateOpenBtn: {
    backgroundColor: "#0f5f3c",
  },
  gateBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
});

export default Dashboard;