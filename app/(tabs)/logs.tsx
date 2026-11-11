import { BASE_URL } from "@/src/components/BaseUrlApi";
import { RootState } from "@/src/store/store";
import { resolveImageUrl } from "@/src/utils/imageUtils";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import axios from "axios";
import { useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import moment from "moment";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSelector } from "react-redux";

export interface LogsScreenProps {
  embedded?: boolean;
  initialSubTab?: "pending" | "exited";
}

export default function LogsScreen({
  embedded = false,
  initialSubTab = "pending",
}: LogsScreenProps = {}) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<"pending" | "exited">(initialSubTab);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Lists
  const [pendingList, setPendingList] = useState<any[]>([]);
  const [exitedList, setExitedList] = useState<any[]>([]);
  const [pendingFilter, setPendingFilter] = useState<"all" | "own" | "visitor">("all");

  // Photo Viewer Modal
  const [photoViewerVisible, setPhotoViewerVisible] = useState(false);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState("");

  const { companyId, authToken } = useSelector((state: RootState) => state.auth);

  // Fetch Pending List via GET (boompendinglist)
  const fetchPending = async (query = "") => {
    setLoading(true);
    try {
      const res = await axios.get(BASE_URL + "boompendinglist", {
        params: {
          company_id: companyId || 23,
          truck: query,
          limit: 50,
          offset: 0,
        },
        headers: {
          "User-Agent": "DashboardApp",
        },
      });

      if (res.data.status === "success" || res.data.success) {
        setPendingList(res.data.data || []);
      } else {
        setPendingList([]);
      }
    } catch (e) {
      console.error("Error fetching pending logs:", e);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Exited List via GET (boomexitedlist) - Today Exited Only
  const fetchExited = async (query = "") => {
    setLoading(true);
    try {
      const today = moment().format("YYYY-MM-DD");
      const res = await axios.get(BASE_URL + "boomexitedlist", {
        params: {
          company_id: companyId || 23,
          from_date: today,
          to_date: today,
          truck: query,
          limit: 50,
          offset: 0,
        },
        headers: {
          "User-Agent": "DashboardApp",
        },
      });

      if (res.data.status === "success" || res.data.success) {
        setExitedList(res.data.data || []);
      } else {
        setExitedList([]);
      }
    } catch (e) {
      console.error("Error fetching exited logs:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    if (activeTab === "pending") {
      fetchPending(searchQuery);
    } else {
      fetchExited(searchQuery);
    }
  };

  useFocusEffect(
    useCallback(() => {
      handleRefresh();
    }, [activeTab, companyId])
  );

  useEffect(() => {
    handleRefresh();
  }, [activeTab]);

  const filteredPendingList = useMemo(() => {
    if (pendingFilter === "own") {
      return pendingList.filter(
        (v) => v.is_own === 1 || v.is_own === "1" || v.is_own === true
      );
    }
    if (pendingFilter === "visitor") {
      return pendingList.filter(
        (v) => v.is_own === 0 || v.is_own === "0" || v.is_own === false || !v.is_own
      );
    }
    return pendingList;
  }, [pendingList, pendingFilter]);

  const viewPhoto = (url: string) => {
    const resolved = resolveImageUrl(url);
    if (resolved) {
      setSelectedPhotoUrl(resolved);
      setPhotoViewerVisible(true);
    }
  };

  // Render vehicle item for Inside Quarry (pure details display, no exit trigger buttons)
  const renderPendingItem = ({ item }: { item: any }) => {
    const duration =
      item.duration_formatted ||
      (item.duration_minutes ? `${item.duration_minutes}m` : "--");
    const rawImg =
      item.entry_image_url || item.entry_image || item.image || item.photo;
    const imageUrl = resolveImageUrl(rawImg);
    const isOwn =
      item.is_own === 1 || item.is_own === "1" || item.is_own === true;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardMeta}>
            {imageUrl ? (
              <TouchableOpacity
                onPress={() => viewPhoto(imageUrl)}
                style={styles.thumbnailWrapper}
              >
                <Image source={{ uri: imageUrl }} style={styles.thumbnailImg} />
                <View style={styles.zoomBadge}>
                  <Ionicons name="expand" size={10} color="#fff" />
                </View>
              </TouchableOpacity>
            ) : (
              <View
                style={[
                  styles.typeIconContainer,
                  { backgroundColor: "rgba(15, 95, 60, 0.08)" },
                ]}
              >
                <MaterialCommunityIcons
                  name={
                    item.vehicle_type?.toLowerCase() === "bike"
                      ? "motorbike"
                      : item.vehicle_type?.toLowerCase() === "car"
                      ? "car"
                      : "truck"
                  }
                  size={22}
                  color="#2563eb"
                />
              </View>
            )}
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={styles.truckText}>{item.truck}</Text>
              <Text style={styles.typeText}>{item.vehicle_type || "Vehicle"}</Text>
            </View>
          </View>

          <View style={styles.badgeRow}>
            {isOwn ? (
              <View style={styles.ownBadge}>
                <Ionicons
                  name="star"
                  size={10}
                  color="#99731e"
                  style={{ marginRight: 2 }}
                />
                <Text style={styles.ownBadgeText}>Own Vehicle</Text>
              </View>
            ) : (
              <View style={styles.visitorBadge}>
                <Text style={styles.visitorBadgeText}>Visitor</Text>
              </View>
            )}
            <View style={styles.badgePending}>
              <Text style={styles.badgePendingText}>
                {item.status_label || "Inside Quarry"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.detailsGrid}>
          <View style={styles.detailBlock}>
            <Text style={styles.infoLabel}>Entry Date & Time</Text>
            <Text style={styles.infoValue}>
              {item.entry_datetime
                ? moment(item.entry_datetime).format("DD MMM YYYY, hh:mm A")
                : "--"}
            </Text>
          </View>

          <View style={styles.detailBlock}>
            <Text style={styles.infoLabel}>Duration Inside</Text>
            <Text
              style={[
                styles.infoValue,
                { color: "#2563eb", fontWeight: "700" },
              ]}
            >
              ⏱️ {duration}
            </Text>
          </View>

          {item.trip_reference_id && item.trip_reference_id !== "-" && (
            <View style={styles.detailBlock}>
              <Text style={styles.infoLabel}>Trip Reference</Text>
              <Text style={styles.infoValue}>{item.trip_reference_id}</Text>
            </View>
          )}

          {item.machine_id ? (
            <View style={styles.detailBlock}>
              <Text style={styles.infoLabel}>Machine ID</Text>
              <Text style={styles.infoValue}>#{item.machine_id}</Text>
            </View>
          ) : null}
        </View>
      </View>
    );
  };

  // Render vehicle item for Exited Logs
  const renderExitedItem = ({ item }: { item: any }) => {
    const duration =
      item.duration_formatted ||
      item.duration ||
      (item.duration_minutes ? `${item.duration_minutes}m` : "N/A");
    const rawEntryImg =
      item.entry_image_url || item.entry_image || item.image || item.photo;
    const rawExitImg = item.exit_image_url || item.exit_image;
    const entryImg = resolveImageUrl(rawEntryImg);
    const exitImg = resolveImageUrl(rawExitImg);
    const isOwn =
      item.is_own === 1 || item.is_own === "1" || item.is_own === true;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardMeta}>
            <View
              style={[
                styles.typeIconContainer,
                { backgroundColor: "rgba(40, 167, 69, 0.1)" },
              ]}
            >
              <MaterialCommunityIcons
                name="boom-gate-outline"
                size={20}
                color="#28a745"
              />
            </View>
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={styles.truckText}>{item.truck}</Text>
              <Text style={styles.typeText}>{item.vehicle_type || "Vehicle"}</Text>
            </View>
          </View>

          <View style={styles.badgeRow}>
            {isOwn ? (
              <View style={styles.ownBadge}>
                <Ionicons
                  name="star"
                  size={10}
                  color="#99731e"
                  style={{ marginRight: 2 }}
                />
                <Text style={styles.ownBadgeText}>Own Vehicle</Text>
              </View>
            ) : null}
            <View style={styles.badgeExited}>
              <Text style={styles.badgeExitedText}>
                {item.status_label || "Completed"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.detailsGrid}>
          <View style={styles.detailBlock}>
            <Text style={styles.infoLabel}>Entry Time</Text>
            <Text style={styles.infoValue}>
              {item.entry_datetime
                ? moment(item.entry_datetime).format("hh:mm A")
                : "--"}
            </Text>
          </View>
          <View style={styles.detailBlock}>
            <Text style={styles.infoLabel}>Exit Time</Text>
            <Text style={styles.infoValue}>
              {item.exit_datetime
                ? moment(item.exit_datetime).format("hh:mm A")
                : "--"}
            </Text>
          </View>
          <View style={styles.detailBlock}>
            <Text style={styles.infoLabel}>Date</Text>
            <Text style={styles.infoValue}>
              {item.exit_datetime
                ? moment(item.exit_datetime).format("DD MMM YYYY")
                : item.entry_datetime
                ? moment(item.entry_datetime).format("DD MMM YYYY")
                : "--"}
            </Text>
          </View>
          <View style={styles.detailBlock}>
            <Text style={styles.infoLabel}>Duration Inside</Text>
            <Text
              style={[
                styles.infoValue,
                { color: "#2563eb", fontWeight: "700" },
              ]}
            >
              {duration}
            </Text>
          </View>
        </View>

        {(entryImg || exitImg) && (
          <View style={styles.imageRow}>
            {entryImg && (
              <TouchableOpacity
                onPress={() => viewPhoto(entryImg)}
                style={styles.thumbnailContainer}
              >
                <Image source={{ uri: entryImg }} style={styles.thumbnail} />
                <View style={styles.thumbnailBadge}>
                  <Text style={styles.thumbnailBadgeText}>Entry</Text>
                </View>
              </TouchableOpacity>
            )}
            {exitImg && (
              <TouchableOpacity
                onPress={() => viewPhoto(exitImg)}
                style={styles.thumbnailContainer}
              >
                <Image source={{ uri: exitImg }} style={styles.thumbnail} />
                <View style={styles.thumbnailBadge}>
                  <Text style={styles.thumbnailBadgeText}>Exit</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {!embedded && (
        <>
          {/* Edge-to-Edge Status Bar Fill */}
          <View style={{ height: insets.top, backgroundColor: "#0f172a", width: "100%" }} />
          <StatusBar style="light" backgroundColor="#0f172a" />
          <View style={styles.header}>
            <Text style={styles.title}>Quarry Gate Logs</Text>
          </View>
        </>
      )}

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "pending" && styles.tabActive]}
          onPress={() => {
            setActiveTab("pending");
            setSearchQuery("");
          }}
        >
          <Text style={[styles.tabText, activeTab === "pending" && styles.tabTextActive]}>
            Inside Quarry ({pendingList.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "exited" && styles.tabActive]}
          onPress={() => {
            setActiveTab("exited");
            setSearchQuery("");
          }}
        >
          <Text style={[styles.tabText, activeTab === "exited" && styles.tabTextActive]}>
            Today Exited ({exitedList.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color="#777" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by registration number (e.g. TN 59)..."
          placeholderTextColor="#888"
          value={searchQuery}
          onChangeText={(txt) => {
            setSearchQuery(txt);
            if (activeTab === "pending") {
              fetchPending(txt);
            } else {
              fetchExited(txt);
            }
          }}
          autoCapitalize="characters"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              setSearchQuery("");
              if (activeTab === "pending") {
                fetchPending("");
              } else {
                fetchExited("");
              }
            }}
          >
            <Ionicons name="close-circle" size={18} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Chips for Inside Quarry Tab */}
      {activeTab === "pending" && pendingList.length > 0 && (
        <View style={styles.pendingFilterRow}>
          <TouchableOpacity
            style={[
              styles.pendingFilterChip,
              pendingFilter === "all" && styles.pendingFilterChipActive,
            ]}
            onPress={() => setPendingFilter("all")}
          >
            <Text
              style={[
                styles.pendingFilterText,
                pendingFilter === "all" && styles.pendingFilterTextActive,
              ]}
            >
              All ({pendingList.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.pendingFilterChip,
              pendingFilter === "own" && styles.pendingFilterChipActive,
            ]}
            onPress={() => setPendingFilter("own")}
          >
            <Ionicons
              name="star"
              size={12}
              color={pendingFilter === "own" ? "#2563eb" : "#b38a2c"}
              style={{ marginRight: 3 }}
            />
            <Text
              style={[
                styles.pendingFilterText,
                pendingFilter === "own" && styles.pendingFilterTextActive,
              ]}
            >
              Own (
              {
                pendingList.filter(
                  (v) =>
                    v.is_own === 1 || v.is_own === "1" || v.is_own === true
                ).length
              }
              )
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.pendingFilterChip,
              pendingFilter === "visitor" && styles.pendingFilterChipActive,
            ]}
            onPress={() => setPendingFilter("visitor")}
          >
            <Text
              style={[
                styles.pendingFilterText,
                pendingFilter === "visitor" && styles.pendingFilterTextActive,
              ]}
            >
              Visitor (
              {
                pendingList.filter(
                  (v) =>
                    !v.is_own || v.is_own === 0 || v.is_own === "0"
                ).length
              }
              )
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Today Exited Banner (Date selection removed, showing Today only) */}
      {activeTab === "exited" && (
        <View style={styles.todayBanner}>
          <View style={styles.todayBannerLeft}>
            <View style={styles.todayPulseDot} />
            <View>
              <Text style={styles.todayBannerTitle}>Today's Exited Records</Text>
              <Text style={styles.todayBannerDate}>
                {moment().format("dddd, D MMMM YYYY")}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.todayRefreshBtn}
            onPress={() => fetchExited(searchQuery)}
            disabled={loading}
          >
            <Ionicons name="refresh" size={15} color="#2563eb" />
            <Text style={styles.todayRefreshText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color="#2563eb" style={{ flex: 1, justifyContent: "center" }} />
      ) : (
        <FlatList
          data={activeTab === "pending" ? filteredPendingList : exitedList}
          renderItem={activeTab === "pending" ? renderPendingItem : renderExitedItem}
          keyExtractor={(item, index) => item.id?.toString() || index.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={handleRefresh} colors={["#2563eb"]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="clipboard-text-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No logs found matching parameters.</Text>
            </View>
          }
        />
      )}

      {/* PHOTO VIEWER MODAL */}
      <Modal
        visible={photoViewerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPhotoViewerVisible(false)}
      >
        <View style={styles.photoViewerOverlay}>
          <TouchableOpacity
            style={styles.closePhotoViewer}
            onPress={() => setPhotoViewerVisible(false)}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          >
            <Ionicons name="close-circle" size={40} color="#fff" />
          </TouchableOpacity>
          {selectedPhotoUrl ? (
            <Image
              source={{ uri: selectedPhotoUrl }}
              style={styles.photoViewerImage}
              resizeMode="contain"
            />
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fa",
  },
  header: {
    padding: 15,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e3a8a",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: "#2563eb",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#777",
  },
  tabTextActive: {
    color: "#2563eb",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    margin: 15,
    marginBottom: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 10,
    marginLeft: 8,
    color: "#333",
  },
  pendingFilterRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    marginBottom: 10,
    gap: 8,
  },
  pendingFilterChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pendingFilterChipActive: {
    backgroundColor: "rgba(37, 99, 235, 0.1)",
    borderColor: "#2563eb",
  },
  pendingFilterText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
  },
  pendingFilterTextActive: {
    color: "#2563eb",
    fontWeight: "700",
  },
  todayBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    marginHorizontal: 15,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0ede5",
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
  },
  todayBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  todayPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#28a745",
    marginRight: 10,
  },
  todayBannerTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1e3a8a",
  },
  todayBannerDate: {
    fontSize: 11,
    color: "#666",
    marginTop: 1,
  },
  todayRefreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(37, 99, 235, 0.08)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  todayRefreshText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2563eb",
  },
  listContent: {
    padding: 15,
    paddingBottom: 110,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 15,
    marginBottom: 15,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 180,
  },
  thumbnailWrapper: {
    position: "relative",
    width: 44,
    height: 44,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  thumbnailImg: {
    width: "100%",
    height: "100%",
  },
  zoomBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 4,
    padding: 1,
  },
  typeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  truckText: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#333",
  },
  typeText: {
    fontSize: 12,
    color: "#666",
    marginTop: 1,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  ownBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(212, 178, 98, 0.18)",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(212, 178, 98, 0.4)",
  },
  ownBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#99731e",
  },
  visitorBadge: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  visitorBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748b",
  },
  badgePending: {
    backgroundColor: "#ffebee",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  badgePendingText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#c62828",
  },
  badgeExited: {
    backgroundColor: "#e8f5e9",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  badgeExitedText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2e7d32",
  },
  cardDivider: {
    height: 1,
    backgroundColor: "#eee",
    marginVertical: 12,
  },
  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  detailBlock: {
    width: "50%",
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 11,
    color: "#999",
    textTransform: "uppercase",
  },
  infoValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
    marginTop: 2,
  },
  imageRow: {
    flexDirection: "row",
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingTop: 12,
  },
  thumbnailContainer: {
    position: "relative",
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  thumbnail: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  thumbnailBadge: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingVertical: 2,
    alignItems: "center",
  },
  thumbnailBadgeText: {
    color: "#fff",
    fontSize: 8,
    fontWeight: "600",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    marginTop: 20,
  },
  emptyText: {
    fontSize: 13,
    color: "#888",
    marginTop: 10,
  },
  photoViewerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  closePhotoViewer: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
  },
  photoViewerImage: {
    width: "90%",
    height: "70%",
    resizeMode: "contain",
  },
});
