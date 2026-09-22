import { BASE_URL } from "@/src/components/BaseUrlApi";
import { GateStatusModal, GateStatusModalProps } from "@/src/components/GateStatusModal";
import { RootState } from "@/src/store/store";
import { triggerRemoteDoorOpen } from "@/src/utils/doorController";
import { resolveImageUrl } from "@/src/utils/imageUtils";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import axios from "axios";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import moment from "moment";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useSelector } from "react-redux";

const toUrlEncoded = (obj: any) => {
  return Object.keys(obj)
    .map((key) => encodeURIComponent(key) + "=" + encodeURIComponent(obj[key]))
    .join("&");
};

export default function LogsScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<"pending" | "exited">("pending");
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Lists
  const [pendingList, setPendingList] = useState<any[]>([]);
  const [exitedList, setExitedList] = useState<any[]>([]);

  // Dates for Exited List Filter
  const [fromDate, setFromDate] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)); // 7 days ago
  const [toDate, setToDate] = useState(new Date());
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  // Exit Workflow State
  const [exitModalVisible, setExitModalVisible] = useState(false);
  const [exitVehicle, setExitVehicle] = useState<any>(null);
  const [exitImage, setExitImage] = useState<any>(null);
  const [exitBarcode, setExitBarcode] = useState<string>("");

  // Exit Modal / Scanner
  const [scannerVisible, setScannerVisible] = useState(false);
  const [scanningVehicle, setScanningVehicle] = useState<any>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  // Photo Viewer Modal
  const [photoViewerVisible, setPhotoViewerVisible] = useState(false);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState("");

  // Premium Status Modal
  const [statusModal, setStatusModal] = useState<GateStatusModalProps>({
    visible: false,
    type: "exit_success",
    title: "",
    onClose: () => setStatusModal((prev) => ({ ...prev, visible: false })),
  });

  const { companyId, authToken } = useSelector((state: RootState) => state.auth);

  // Fetch Pending List via GET
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

  // Fetch Exited List via GET
  const fetchExited = async (query = "") => {
    setLoading(true);
    try {
      const res = await axios.get(BASE_URL + "boomexitedlist", {
        params: {
          company_id: companyId || 23,
          from_date: moment(fromDate).format("YYYY-MM-DD"),
          to_date: moment(toDate).format("YYYY-MM-DD"),
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
    }, [activeTab, fromDate, toDate, companyId])
  );

  // Compress Image
  const compressImage = async (uri: string) => {
    const manipResult = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 800 } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
    );
    return manipResult;
  };

  // Capture Exit Image
  const captureExitImage = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setStatusModal({
        visible: true,
        type: "error",
        title: "Permission Required",
        subtitle: "Camera access is required to capture exit vehicle photo.",
        onClose: () => setStatusModal((prev) => ({ ...prev, visible: false })),
      });
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });

    if (!result.canceled) {
      setLoading(true);
      try {
        const compressed = await compressImage(result.assets[0].uri);
        setExitImage({ uri: compressed.uri });
      } catch (err) {
        setStatusModal({
          visible: true,
          type: "error",
          title: "Image Error",
          subtitle: "Failed to process exit vehicle photo.",
          onClose: () => setStatusModal((prev) => ({ ...prev, visible: false })),
        });
      } finally {
        setLoading(false);
      }
    }
  };

  // Trigger Exit Call
  const triggerExit = async (vehicle: any, barcode?: string, imageObj?: any) => {
    setLoading(true);
    const now = moment().format("YYYY-MM-DD HH:mm:ss");
    try {
      const formData = new FormData();
      if (barcode) {
        formData.append("barcode", String(barcode).trim());
      }

      if (imageObj?.uri) {
        formData.append("exit_image", {
          uri: imageObj.uri,
          type: "image/jpeg",
          name: "exit.jpg",
        } as any);
      }

      if (authToken) {
        formData.append("token", authToken);
      }

      const res = await axios.post(
        BASE_URL + "boomexit",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            "User-Agent": "DashboardApp",
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
        }
      );

      if (res.data.status === "success" || res.data.success) {
        const truckName = res.data?.data?.truck || vehicle?.truck || "Vehicle";

        const doorResult = await triggerRemoteDoorOpen({
          truck: truckName,
          action: "Vehicle Exit & Open Gate",
          type: "exit",
          companyId: companyId || 23,
        });

        setExitModalVisible(false);
        setExitVehicle(null);
        setExitImage(null);
        setExitBarcode("");

        setStatusModal({
          visible: true,
          type: "exit_success",
          title: "Vehicle Exit Completed",
          subtitle: res.data.message || `Vehicle ${truckName} marked as exited.`,
          truck: truckName,
          vehicleType: vehicle?.vehicle_type,
          duration:
            vehicle?.duration_formatted ||
            (vehicle?.duration_minutes
              ? `${vehicle.duration_minutes}m`
              : undefined),
          imageUri: imageObj?.uri,
          barrierSuccess: doorResult.success,
          barrierMessage: doorResult.success
            ? "Boom barrier OPEN command triggered successfully ✅"
            : `Boom barrier: ${doorResult.error || "Controller unreachable on local network"}`,
          onClose: () => setStatusModal((prev) => ({ ...prev, visible: false })),
        });

        fetchPending(searchQuery);
      } else {
        setStatusModal({
          visible: true,
          type: "error",
          title: "Exit Failed",
          subtitle: res.data.message || "Failed to log exit.",
          truck: vehicle?.truck,
          onClose: () => setStatusModal((prev) => ({ ...prev, visible: false })),
        });
      }
    } catch (error: any) {
      console.error(error);
      setStatusModal({
        visible: true,
        type: "error",
        title: "Exit Error",
        subtitle: error?.response?.data?.message || "Failed to exit vehicle.",
        truck: vehicle?.truck,
        onClose: () => setStatusModal((prev) => ({ ...prev, visible: false })),
      });
    } finally {
      setLoading(false);
    }
  };

  // Exit press handler - Opens exit workflow modal
  const handleExitPress = (item: any) => {
    setExitVehicle(item);
    setExitImage(null);
    setExitBarcode("");
    setExitModalVisible(true);
  };

  const openScanner = () => {
    if (!cameraPermission?.granted) {
      requestCameraPermission().then((res) => {
        if (res.granted) {
          setScannerVisible(true);
        } else {
          setStatusModal({
            visible: true,
            type: "error",
            title: "Permission Required",
            subtitle: "Camera access is required to scan ticket barcode.",
            onClose: () => setStatusModal((prev) => ({ ...prev, visible: false })),
          });
        }
      });
    } else {
      setScannerVisible(true);
    }
  };

  const onBarcodeScanned = (event: any) => {
    const rawData = event?.data ?? event;
    const barcodeType = event?.type ?? "unknown";

    console.log(`\n================== 📷 [LOGS BARCODE SCANNED] ==================`);
    console.log(`⏰ Timestamp   : ${new Date().toISOString()}`);
    console.log(`🏷️ Scanned Data :`, rawData);
    console.log(`🔍 Barcode Type :`, barcodeType);
    console.log(`🚗 Target Truck :`, (exitVehicle || scanningVehicle)?.truck || "Unknown");
    console.log(`=============================================================\n`);

    setScannerVisible(false);
    setExitBarcode(String(rawData).trim());
  };

  const viewPhoto = (url: string) => {
    const resolved = resolveImageUrl(url);
    if (resolved) {
      setSelectedPhotoUrl(resolved);
      setPhotoViewerVisible(true);
    }
  };

  const renderPendingItem = ({ item }: { item: any }) => {
    const isTruck = item.vehicle_type && item.vehicle_type.toLowerCase().includes("wheeler");
    const duration = item.duration_formatted || (item.duration_minutes ? `${item.duration_minutes}m` : "--");
    const rawImg = item.entry_image_url || item.entry_image || item.image || item.photo;
    const imageUrl = resolveImageUrl(rawImg);

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardMeta}>
            {imageUrl ? (
              <TouchableOpacity onPress={() => viewPhoto(imageUrl)} style={styles.thumbnailWrapper}>
                <Image source={{ uri: imageUrl }} style={styles.thumbnailImg} />
                <View style={styles.zoomBadge}>
                  <Ionicons name="expand" size={10} color="#fff" />
                </View>
              </TouchableOpacity>
            ) : (
              <View style={[styles.typeIconContainer, { backgroundColor: "rgba(220, 53, 69, 0.1)" }]}>
                <MaterialCommunityIcons name="boom-gate-up" size={20} color="#dc3545" />
              </View>
            )}
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.truckText}>{item.truck}</Text>
              <Text style={styles.typeText}>{item.vehicle_type}</Text>
            </View>
          </View>
          <View style={styles.badgePending}>
            <Text style={styles.badgePendingText}>{item.status_label || "Inside Quarry"}</Text>
          </View>
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.pendingDetailsRow}>
          <View>
            <Text style={styles.infoLabel}>Entry Date & Time</Text>
            <Text style={styles.infoValue}>
              {item.entry_datetime ? moment(item.entry_datetime).format("DD MMM YYYY, hh:mm A") : "--"}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.infoLabel}>Duration Inside</Text>
            <Text style={[styles.infoValue, { color: "#0f5f3c", fontWeight: "700" }]}>
              ⏱️ {duration}
            </Text>
          </View>
        </View>

        {item.trip_reference_id && item.trip_reference_id !== "-" && (
          <View style={styles.tripRow}>
            <Text style={styles.infoLabel}>Trip Ref:</Text>
            <Text style={styles.tripRefText}>{item.trip_reference_id}</Text>
          </View>
        )}

        <View style={styles.cardFooter}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: isTruck ? "#FF9800" : "#F44336" }]}
            onPress={() => handleExitPress(item)}
          >
            <Text style={styles.actionButtonText}>{isTruck ? "Scan & Exit" : "Exit Direct"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderExitedItem = ({ item }: { item: any }) => {
    const duration = item.duration_formatted || item.duration || (item.duration_minutes ? `${item.duration_minutes}m` : "N/A");
    const rawEntryImg = item.entry_image_url || item.entry_image || item.image || item.photo;
    const rawExitImg = item.exit_image_url || item.exit_image;
    const entryImg = resolveImageUrl(rawEntryImg);
    const exitImg = resolveImageUrl(rawExitImg);

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardMeta}>
            <View style={[styles.typeIconContainer, { backgroundColor: "rgba(40, 167, 69, 0.1)" }]}>
              <MaterialCommunityIcons name="boom-gate-outline" size={20} color="#28a745" />
            </View>
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.truckText}>{item.truck}</Text>
              <Text style={styles.typeText}>{item.vehicle_type}</Text>
            </View>
          </View>
          <View style={styles.badgeExited}>
            <Text style={styles.badgeExitedText}>{item.status_label || "Completed"}</Text>
          </View>
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.detailsGrid}>
          <View style={styles.detailBlock}>
            <Text style={styles.infoLabel}>Entry Time</Text>
            <Text style={styles.infoValue}>
              {item.entry_datetime ? moment(item.entry_datetime).format("hh:mm A") : "--"}
            </Text>
          </View>
          <View style={styles.detailBlock}>
            <Text style={styles.infoLabel}>Exit Time</Text>
            <Text style={styles.infoValue}>
              {item.exit_datetime ? moment(item.exit_datetime).format("hh:mm A") : "--"}
            </Text>
          </View>
          <View style={styles.detailBlock}>
            <Text style={styles.infoLabel}>Date</Text>
            <Text style={styles.infoValue}>
              {item.exit_datetime ? moment(item.exit_datetime).format("DD MMM YYYY") : item.entry_datetime ? moment(item.entry_datetime).format("DD MMM YYYY") : "--"}
            </Text>
          </View>
          <View style={styles.detailBlock}>
            <Text style={styles.infoLabel}>Duration Inside</Text>
            <Text style={[styles.infoValue, { color: "#0f5f3c", fontWeight: "700" }]}>
              {duration}
            </Text>
          </View>
        </View>

        {(entryImg || exitImg) && (
          <View style={styles.imageRow}>
            {entryImg && (
              <TouchableOpacity onPress={() => viewPhoto(entryImg)} style={styles.thumbnailContainer}>
                <Image source={{ uri: entryImg }} style={styles.thumbnail} />
                <View style={styles.thumbnailBadge}>
                  <Text style={styles.thumbnailBadgeText}>Entry</Text>
                </View>
              </TouchableOpacity>
            )}
            {exitImg && (
              <TouchableOpacity onPress={() => viewPhoto(exitImg)} style={styles.thumbnailContainer}>
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
      {/* Edge-to-Edge Status Bar Fill */}
      <View style={{ height: insets.top, backgroundColor: "#0f5f3c", width: "100%" }} />
      <StatusBar style="light" backgroundColor="#0f5f3c" />
      <View style={styles.header}>
        <Text style={styles.title}>Quarry Gate Logs</Text>
      </View>

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
            Exited Logs ({exitedList.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color="#777" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by registration number (e.g. TN 59)..."
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

      {/* Date Range Filters (Only for Exited list) */}
      {activeTab === "exited" && (
        <View style={styles.dateFilterContainer}>
          <Text style={styles.filterLabel}>Date Range:</Text>
          <View style={styles.datesRow}>
            <TouchableOpacity style={styles.dateButton} onPress={() => setShowFromPicker(true)}>
              <Ionicons name="calendar-outline" size={16} color="#0f5f3c" />
              <Text style={styles.dateButtonText}>{moment(fromDate).format("DD MMM YY")}</Text>
            </TouchableOpacity>
            <Text style={styles.dateDivider}>to</Text>
            <TouchableOpacity style={styles.dateButton} onPress={() => setShowToPicker(true)}>
              <Ionicons name="calendar-outline" size={16} color="#0f5f3c" />
              <Text style={styles.dateButtonText}>{moment(toDate).format("DD MMM YY")}</Text>
            </TouchableOpacity>
          </View>

          {showFromPicker && (
            <DateTimePicker
              value={fromDate}
              mode="date"
              display="default"
              onChange={(e, val) => {
                setShowFromPicker(false);
                if (val) setFromDate(val);
              }}
            />
          )}

          {showToPicker && (
            <DateTimePicker
              value={toDate}
              mode="date"
              display="default"
              onChange={(e, val) => {
                setShowToPicker(false);
                if (val) setToDate(val);
              }}
            />
          )}
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color="#0f5f3c" style={{ flex: 1, justifyContent: "center" }} />
      ) : (
        <FlatList
          data={activeTab === "pending" ? pendingList : exitedList}
          renderItem={activeTab === "pending" ? renderPendingItem : renderExitedItem}
          keyExtractor={(item, index) => item.id?.toString() || index.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={handleRefresh} colors={["#0f5f3c"]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="clipboard-text-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No logs found matching parameters.</Text>
            </View>
          }
        />
      )}

      {/* BARCODE SCANNER MODAL */}
      <Modal
        visible={scannerVisible}
        animationType="fade"
        onRequestClose={() => setScannerVisible(false)}
      >
        <View style={styles.scannerOverlay}>
          <CameraView
            style={StyleSheet.absoluteFillObject}
            onBarcodeScanned={onBarcodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ["qr", "ean13", "code128", "pdf417"],
            }}
          />
          <View style={styles.scannerHeader}>
            <Text style={styles.scannerHeaderText}>Scan Ticket / Barcode</Text>
            <Text style={styles.scannerSubtext}>
              Exit Truck: {scanningVehicle?.truck}
            </Text>
          </View>
          <View style={styles.scannerFinder} />
          <TouchableOpacity style={styles.scannerCloseButton} onPress={() => setScannerVisible(false)}>
            <Ionicons name="close-circle" size={54} color="#fff" />
            <Text style={styles.scannerCloseText}>Close Scanner</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* VEHICLE EXIT WORKFLOW MODAL */}
      <Modal
        visible={exitModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!loading) setExitModalVisible(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.exitModalContent}>
            {/* Modal Header */}
            <View style={styles.exitModalHeaderRow}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <MaterialCommunityIcons name="boom-gate" size={24} color="#0f5f3c" />
                <Text style={styles.exitModalTitle}>Vehicle Exit Verification</Text>
              </View>
              <TouchableOpacity
                onPress={() => setExitModalVisible(false)}
                disabled={loading}
                style={{ padding: 4 }}
              >
                <Ionicons name="close-circle" size={26} color="#888" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Vehicle Badge & Duration Banner */}
              <View style={styles.exitVehicleBanner}>
                <View style={styles.plateContainerMini}>
                  <View style={styles.plateIndStripeMini}>
                    <Text style={styles.indTextMini}>IND</Text>
                  </View>
                  <Text style={styles.plateTextMini}>{exitVehicle?.truck}</Text>
                </View>

                <View style={styles.exitPillRow}>
                  <View style={styles.exitPill}>
                    <MaterialCommunityIcons
                      name={
                        exitVehicle?.vehicle_type?.toLowerCase().includes("bike")
                          ? "motorbike"
                          : exitVehicle?.vehicle_type?.toLowerCase().includes("truck") ||
                            exitVehicle?.vehicle_type?.toLowerCase().includes("wheeler")
                          ? "truck"
                          : "car"
                      }
                      size={14}
                      color="#0f5f3c"
                    />
                    <Text style={styles.exitPillText}>{exitVehicle?.vehicle_type}</Text>
                  </View>

                  <View style={styles.exitPill}>
                    <Ionicons name="time-outline" size={14} color="#0f5f3c" />
                    <Text style={styles.exitPillText}>
                      ⏱️ {exitVehicle?.duration_formatted || (exitVehicle?.duration_minutes ? `${exitVehicle.duration_minutes}m` : "--")}
                    </Text>
                  </View>
                </View>
              </View>

              {/* 1. Exit Image Capture Section */}
              <Text style={styles.exitSectionLabel}>1. Vehicle Exit Photo (exit_image):</Text>
              {exitImage?.uri ? (
                <View style={styles.exitImageWrap}>
                  <Image source={{ uri: exitImage.uri }} style={styles.exitImagePreview} />
                  <View style={styles.exitImageOverlayRow}>
                    <TouchableOpacity style={styles.retakeBtn} onPress={captureExitImage} disabled={loading}>
                      <Ionicons name="camera-reverse" size={16} color="#fff" />
                      <Text style={styles.retakeBtnText}>Retake Photo</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.removePhotoBtn}
                      onPress={() => setExitImage(null)}
                      disabled={loading}
                    >
                      <Ionicons name="trash" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.exitCaptureButton}
                  onPress={captureExitImage}
                  disabled={loading}
                >
                  <Ionicons name="camera" size={24} color="#0f5f3c" />
                  <View style={{ marginLeft: 10 }}>
                    <Text style={styles.exitCaptureTitle}>Capture Exit Vehicle Photo</Text>
                    <Text style={styles.exitCaptureSub}>Take photo of departing truck / vehicle</Text>
                  </View>
                </TouchableOpacity>
              )}

              {/* 2. Barcode Ticket Section */}
              <Text style={[styles.exitSectionLabel, { marginTop: 15 }]}>
                2. Ticket Barcode ({exitVehicle?.vehicle_type?.toLowerCase().includes("wheeler") ? "Required for Trucks" : "Optional"}):
              </Text>

              {exitBarcode ? (
                <View style={styles.scannedBarcodeCard}>
                  <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                    <MaterialCommunityIcons name="barcode" size={24} color="#2e7d32" />
                    <View style={{ marginLeft: 10 }}>
                      <Text style={styles.scannedBarcodeLabel}>Scanned Barcode</Text>
                      <Text style={styles.scannedBarcodeValue}>{exitBarcode}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.rescanBtn}
                    onPress={openScanner}
                    disabled={loading}
                  >
                    <Ionicons name="scan-outline" size={16} color="#0f5f3c" />
                    <Text style={styles.rescanText}>Re-scan</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.scanBarcodeButton}
                  onPress={openScanner}
                  disabled={loading}
                >
                  <MaterialCommunityIcons name="barcode-scan" size={22} color="#e65100" />
                  <Text style={styles.scanBarcodeText}>Scan Ticket / Waybill Barcode</Text>
                </TouchableOpacity>
              )}

              {/* Action Buttons */}
              <TouchableOpacity
                style={[styles.confirmExitBtn, loading && { opacity: 0.7 }]}
                onPress={() => triggerExit(exitVehicle, exitBarcode, exitImage)}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="boom-gate-up" size={22} color="#fff" />
                    <Text style={styles.confirmExitBtnText}>Confirm Exit & Open Barrier</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelExitBtn}
                onPress={() => setExitModalVisible(false)}
                disabled={loading}
              >
                <Text style={styles.cancelExitText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

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

      {/* PREMIUM GATE STATUS & FEEDBACK MODAL */}
      <GateStatusModal {...statusModal} />
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
    color: "#0f5f3c",
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
    borderBottomColor: "#d4b262",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#777",
  },
  tabTextActive: {
    color: "#0f5f3c",
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
  dateFilterContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
  },
  datesRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "#fafafa",
  },
  dateButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
    marginLeft: 6,
  },
  dateDivider: {
    fontSize: 12,
    color: "#777",
    marginHorizontal: 8,
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
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
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
  pendingDetailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  tripRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  tripRefText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#555",
    marginLeft: 6,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#f5f5f5",
    paddingTop: 8,
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
  actionButton: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
  },
  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  detailBlock: {
    width: "50%",
    marginBottom: 10,
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
  scannerOverlay: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "space-between",
  },
  scannerHeader: {
    padding: 20,
    paddingTop: 50,
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  scannerHeaderText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  scannerSubtext: {
    fontSize: 14,
    color: "#ff9800",
    marginTop: 6,
    fontWeight: "600",
  },
  scannerFinder: {
    alignSelf: "center",
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: "#0f5f3c",
    backgroundColor: "transparent",
    borderRadius: 12,
  },
  scannerCloseButton: {
    alignItems: "center",
    paddingBottom: 40,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingTop: 15,
  },
  scannerCloseText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  exitModalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "85%",
  },
  exitModalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    marginBottom: 15,
  },
  exitModalTitle: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#0f5f3c",
    marginLeft: 8,
  },
  exitVehicleBanner: {
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
    marginBottom: 16,
  },
  plateContainerMini: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#0f172a",
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: 8,
  },
  plateIndStripeMini: {
    backgroundColor: "#003893",
    paddingHorizontal: 5,
    paddingVertical: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  indTextMini: {
    color: "#fff",
    fontSize: 8,
    fontWeight: "900",
  },
  plateTextMini: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0f172a",
    letterSpacing: 1.2,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  exitPillRow: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
  },
  exitPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  exitPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
    marginLeft: 4,
  },
  exitSectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 8,
  },
  exitCaptureButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#0f5f3c",
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 14,
    backgroundColor: "rgba(15, 95, 60, 0.04)",
    marginBottom: 10,
  },
  exitCaptureTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f5f3c",
  },
  exitCaptureSub: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2,
  },
  exitImageWrap: {
    position: "relative",
    width: "100%",
    height: 150,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    marginBottom: 10,
  },
  exitImagePreview: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  exitImageOverlayRow: {
    position: "absolute",
    bottom: 8,
    right: 8,
    flexDirection: "row",
    gap: 8,
  },
  retakeBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.75)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  retakeBtnText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    marginLeft: 4,
  },
  removePhotoBtn: {
    backgroundColor: "rgba(220, 53, 69, 0.85)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  scanBarcodeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff3e0",
    borderWidth: 1,
    borderColor: "#ffb74d",
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 18,
  },
  scanBarcodeText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#e65100",
    marginLeft: 6,
  },
  scannedBarcodeCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#e8f5e9",
    borderWidth: 1,
    borderColor: "#a5d6a7",
    padding: 12,
    borderRadius: 10,
    marginBottom: 18,
  },
  scannedBarcodeLabel: {
    fontSize: 10,
    color: "#2e7d32",
    fontWeight: "600",
  },
  scannedBarcodeValue: {
    fontSize: 14,
    color: "#1b5e20",
    fontWeight: "bold",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  rescanBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#c8e6c9",
  },
  rescanText: {
    fontSize: 11,
    color: "#0f5f3c",
    fontWeight: "700",
    marginLeft: 3,
  },
  confirmExitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0f5f3c",
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 5,
    elevation: 3,
  },
  confirmExitBtnText: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#fff",
    marginLeft: 8,
  },
  cancelExitBtn: {
    alignItems: "center",
    paddingVertical: 12,
    marginTop: 6,
    marginBottom: 10,
  },
  cancelExitText: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: "600",
  },
});
