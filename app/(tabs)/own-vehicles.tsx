import { BASE_URL } from "@/src/components/BaseUrlApi";
import { RootState } from "@/src/store/store";
import { triggerRemoteDoorOpen } from "@/src/utils/doorController";
import { formatVehiclePlate, normalizeVehicleInput } from "@/src/utils/vehicleFormatter";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import moment from "moment";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSelector } from "react-redux";

interface VehicleItem {
  machine_id?: number | string;
  company_id?: number | string;
  company?: number | string;
  truck: string;
  vehicle_type: string;
  driver_name?: string | null;
  current_status?: string | null;
  is_inside?: number | boolean;
  is_own?: number | boolean | string;
  is_own_vehicle?: number | boolean | string;
  last_entry_datetime?: string | null;
  current_log_id?: number | string | null;
  mapped_at?: string;
}

export default function OwnVehiclesScreen() {
  const insets = useSafeAreaInsets();
  const [truckNumber, setTruckNumber] = useState("");
  const [vehicleType, setVehicleType] = useState("Car");
  const [isOwnVehicle, setIsOwnVehicle] = useState<number>(1); // 1 = Own, 0 = Visitor/Other
  const [capturedImage, setCapturedImage] = useState<{ uri: string; base64: string } | null>(null);

  const [typeModalVisible, setTypeModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [mappedList, setMappedList] = useState<VehicleItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterOwnOnly, setFilterOwnOnly] = useState(false);
  const [filterInsideOnly, setFilterInsideOnly] = useState(false);

  // Quick Action Modal for listed vehicle entry/exit
  const [quickLogModalVisible, setQuickLogModalVisible] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleItem | null>(null);
  const [quickLogImage, setQuickLogImage] = useState<{ uri: string; base64: string } | null>(null);
  const [quickLogLoading, setQuickLogLoading] = useState(false);

  const { companyId } = useSelector((state: RootState) => state.auth);

  const vehicleTypes = [
    "Car",
    "Bike",
    "Others",
    "4 Wheeler",
    "6 Wheeler",
    "8 Wheeler",
    "10 Wheeler",
    "12 Wheeler",
    "14 Wheeler",
    "16 Wheeler",
    "18 Wheeler",
    "20 Wheeler",
    "22 Wheeler",
  ];

  // Helper to compress image to JPEG and extract base64 text
  const compressAndGetBase64 = async (uri: string): Promise<string> => {
    const manipResult = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 800 } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );
    if (manipResult.base64) {
      return `data:image/jpeg;base64,${manipResult.base64}`;
    }
    return "";
  };

  // Camera / Gallery Handlers
  const handleCapturePhoto = async (target: "form" | "modal") => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission Required", "Camera access is needed to capture vehicle photo.");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
      });
      if (!result.canceled && result.assets[0]?.uri) {
        const b64 = await compressAndGetBase64(result.assets[0].uri);
        if (target === "form") {
          setCapturedImage({ uri: result.assets[0].uri, base64: b64 });
        } else {
          setQuickLogImage({ uri: result.assets[0].uri, base64: b64 });
        }
      }
    } catch (err) {
      console.error("Camera capture error:", err);
      Alert.alert("Camera Error", "Could not capture image from camera.");
    }
  };

  const handlePickPhoto = async (target: "form" | "modal") => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
      });
      if (!result.canceled && result.assets[0]?.uri) {
        const b64 = await compressAndGetBase64(result.assets[0].uri);
        if (target === "form") {
          setCapturedImage({ uri: result.assets[0].uri, base64: b64 });
        } else {
          setQuickLogImage({ uri: result.assets[0].uri, base64: b64 });
        }
      }
    } catch (err) {
      console.error("Gallery pick error:", err);
      Alert.alert("Gallery Error", "Could not pick image from gallery.");
    }
  };

  // Fetch own vehicles from API (boomownvehiclelist)
  const fetchVehiclesList = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setFetching(true);
    }
    try {
      const res = await axios.get(BASE_URL + "boomownvehiclelist", {
        params: {
          company_id: companyId || 23,
        },
        headers: {
          "User-Agent": "DashboardApp",
        },
      });

      if ((res.data.status === "success" || res.data.success) && Array.isArray(res.data.data)) {
        setMappedList(res.data.data);
        await AsyncStorage.setItem(
          `own_vehicles_${companyId || 23}`,
          JSON.stringify(res.data.data)
        );
      } else {
        // Fallback to local cache if available
        const stored = await AsyncStorage.getItem(`own_vehicles_${companyId || 23}`);
        if (stored) {
          setMappedList(JSON.parse(stored));
        }
      }
    } catch (e) {
      console.error("Error fetching own vehicles list:", e);
      try {
        const stored = await AsyncStorage.getItem(`own_vehicles_${companyId || 23}`);
        if (stored) {
          setMappedList(JSON.parse(stored));
        }
      } catch (cacheErr) {
        console.error("Error reading cached own vehicles:", cacheErr);
      }
    } finally {
      setFetching(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchVehiclesList();
    }, [companyId])
  );

  // Core API Function: boomownvehiclelog
  const executeVehicleLog = async (
    truckNo: string,
    vType: string,
    ownFlag: number,
    imageBase64?: string
  ) => {
    const formattedTruck = formatVehiclePlate(truckNo);
    const formData = new FormData();
    formData.append("company_id", String(companyId || 23));
    formData.append("truck", formattedTruck);
    formData.append("is_own", String(ownFlag));
    if (vType) {
      formData.append("vehicle_type", vType);
      formData.append("vehicle_model", vType); // Ensures backend properly assigns chosen type
    }
    if (imageBase64) {
      formData.append("image", imageBase64);
    }

    const res = await axios.post(BASE_URL + "boomownvehiclelog", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
        "User-Agent": "DashboardApp",
      },
    });

    return { response: res.data, formattedTruck };
  };

  // Submit from Main Form
  const handleFormSubmit = async () => {
    if (!truckNumber.trim()) {
      Alert.alert("Validation Error", "Please enter the vehicle registration number (e.g. TN 59 AK 0001).");
      return;
    }

    const formatted = formatVehiclePlate(truckNumber);
    setTruckNumber(formatted);
    setLoading(true);

    try {
      const { response: res, formattedTruck } = await executeVehicleLog(
        formatted,
        vehicleType,
        isOwnVehicle,
        capturedImage?.base64
      );

      if (res.status === "success" || res.success) {
        const actionType = (res.action_type || "ENTRY").toUpperCase();
        const barrierAction = res.barrier_action;

        // Trigger remote gate opening command automatically
        if (barrierAction === "OPEN") {
          await triggerRemoteDoorOpen({
            truck: formattedTruck,
            action: `Own Vehicle ${actionType}`,
            type: actionType === "EXIT" ? "exit" : "entry",
            companyId: companyId || 23,
          });
        }

        Alert.alert(
          "Success ✅",
          `Vehicle ${formattedTruck} (${vehicleType}) ${actionType} recorded successfully!\nBoom barrier OPEN command triggered.`
        );

        // Reset inputs
        setTruckNumber("");
        setCapturedImage(null);

        // Refresh List
        await fetchVehiclesList();
      } else {
        const errMsg =
          res.message ||
          (res.errors && Object.values(res.errors).flat().join("\n")) ||
          "Failed to record vehicle log on server.";
        Alert.alert("Log Error", errMsg);
      }
    } catch (error: any) {
      console.error("Vehicle log error:", error);
      const serverErr =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        "Something went wrong recording vehicle log.";
      Alert.alert("Registration Error", serverErr);
    } finally {
      setLoading(false);
    }
  };

  // Quick Action on Vehicle Card (Log Entry / Exit for listed vehicle)
  const openQuickLogModal = (vehicle: VehicleItem) => {
    setSelectedVehicle(vehicle);
    setQuickLogImage(null);
    setQuickLogModalVisible(true);
  };

  const handleQuickLogSubmit = async () => {
    if (!selectedVehicle) return;

    setQuickLogLoading(true);
    try {
      const isCurrentlyInside =
        selectedVehicle.is_inside === 1 ||
        selectedVehicle.is_inside === true ||
        selectedVehicle.current_status?.toLowerCase() === "inside";

      const ownFlag = isOwnVehicleCheck(selectedVehicle) ? 1 : 0;

      const { response: res, formattedTruck } = await executeVehicleLog(
        selectedVehicle.truck,
        selectedVehicle.vehicle_type || "Vehicle",
        ownFlag,
        quickLogImage?.base64
      );

      if (res.status === "success" || res.success) {
        const actionType = (res.action_type || (isCurrentlyInside ? "EXIT" : "ENTRY")).toUpperCase();
        const barrierAction = res.barrier_action;

        // Trigger remote gate opening command automatically
        if (barrierAction === "OPEN") {
          await triggerRemoteDoorOpen({
            truck: formattedTruck,
            action: `Own Vehicle ${actionType}`,
            type: actionType === "EXIT" ? "exit" : "entry",
            companyId: companyId || 23,
          });
        }

        setQuickLogModalVisible(false);
        setSelectedVehicle(null);
        setQuickLogImage(null);

        Alert.alert(
          "Gate Action Complete ✅",
          `Vehicle ${formattedTruck} ${actionType} recorded successfully!\nBoom barrier OPEN command triggered.`
        );

        await fetchVehiclesList();
      } else {
        const errMsg =
          res.message ||
          (res.errors && Object.values(res.errors).flat().join("\n")) ||
          "Failed to toggle vehicle log.";
        Alert.alert("Log Error", errMsg);
      }
    } catch (error: any) {
      console.error("Quick log error:", error);
      const serverErr =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        "Failed to toggle gate log.";
      Alert.alert("Log Error", serverErr);
    } finally {
      setQuickLogLoading(false);
    }
  };

  const handleBlur = () => {
    if (truckNumber.trim()) {
      setTruckNumber(formatVehiclePlate(truckNumber));
    }
  };

  const isOwnVehicleCheck = (item: VehicleItem) => {
    if (item.is_own === 0 || item.is_own === "0" || item.is_own === false) return false;
    if (item.is_own_vehicle === 0 || item.is_own_vehicle === "0" || item.is_own_vehicle === false) return false;
    return true;
  };

  // Filtered vehicles list based on search query and filters
  const filteredVehicles = useMemo(() => {
    const query = searchQuery.trim().toLowerCase().replace(/\s+/g, "");

    return mappedList.filter((item) => {
      const isOwn = isOwnVehicleCheck(item);
      const isInside =
        item.is_inside === 1 ||
        item.is_inside === true ||
        item.current_status?.toLowerCase() === "inside";

      // Filter by Own Vehicles checkbox/filter
      if (filterOwnOnly && !isOwn) {
        return false;
      }

      // Filter by Inside Only
      if (filterInsideOnly && !isInside) {
        return false;
      }

      // Filter by Search Query
      if (query) {
        const truck = (item.truck || "").toLowerCase().replace(/\s+/g, "");
        const vType = (item.vehicle_type || "").toLowerCase().replace(/\s+/g, "");
        const driver = (item.driver_name || "").toLowerCase().replace(/\s+/g, "");

        if (!truck.includes(query) && !vType.includes(query) && !driver.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [mappedList, searchQuery, filterOwnOnly, filterInsideOnly]);

  const getVehicleIcon = (type?: string) => {
    const t = (type || "").toLowerCase();
    if (t.includes("bike") || t.includes("motor") || t.includes("2 wheeler")) return "motorbike";
    if (t.includes("car") || t.includes("4 wheeler")) return "car";
    return "truck";
  };

  const renderVehicleItem = ({ item }: { item: VehicleItem }) => {
    const isInside =
      item.is_inside === 1 ||
      item.is_inside === true ||
      item.current_status?.toLowerCase() === "inside";
    const isOwn = isOwnVehicleCheck(item);

    return (
      <View style={styles.card}>
        <View style={styles.cardContent}>
          <View style={styles.avatar}>
            <MaterialCommunityIcons
              name={getVehicleIcon(item.vehicle_type)}
              size={24}
              color="#0f5f3c"
            />
          </View>
          <View style={styles.info}>
            <View style={styles.rowBetween}>
              <Text style={styles.truckText}>{item.truck}</Text>
              {/* Status Badge */}
              <View
                style={[
                  styles.statusBadge,
                  isInside ? styles.statusBadgeInside : styles.statusBadgeOutside,
                ]}
              >
                <View
                  style={[
                    styles.statusDot,
                    isInside ? styles.statusDotInside : styles.statusDotOutside,
                  ]}
                />
                <Text
                  style={[
                    styles.statusText,
                    isInside ? styles.statusTextInside : styles.statusTextOutside,
                  ]}
                >
                  {isInside ? "Inside Quarry" : "Outside"}
                </Text>
              </View>
            </View>

            {/* Vehicle Type, Own Badge & Driver details */}
            <View style={styles.tagRow}>
              {/* Own Vehicle Badge */}
              {isOwn ? (
                <View style={styles.ownBadge}>
                  <Ionicons name="star" size={11} color="#b38a2c" style={{ marginRight: 3 }} />
                  <Text style={styles.ownBadgeText}>Own Vehicle</Text>
                </View>
              ) : (
                <View style={styles.visitorBadge}>
                  <Text style={styles.visitorBadgeText}>Visitor</Text>
                </View>
              )}

              <View style={styles.typeBadge}>
                <Text style={styles.typeText}>{item.vehicle_type || "Vehicle"}</Text>
              </View>

              {item.driver_name ? (
                <View style={styles.detailItem}>
                  <Ionicons name="person-outline" size={12} color="#666" style={{ marginRight: 3 }} />
                  <Text style={styles.detailText}>Driver: {item.driver_name}</Text>
                </View>
              ) : null}
            </View>

            {/* Last Entry Datetime if available */}
            {item.last_entry_datetime ? (
              <View style={styles.timeRow}>
                <Ionicons name="time-outline" size={12} color="#888" style={{ marginRight: 4 }} />
                <Text style={styles.timeText}>
                  Last Entry: {moment(item.last_entry_datetime).format("DD MMM YYYY, hh:mm A")}
                </Text>
              </View>
            ) : null}

            {/* Quick Gate Action Button */}
            <TouchableOpacity
              style={[
                styles.quickActionBtn,
                isInside ? styles.quickActionBtnExit : styles.quickActionBtnEntry,
              ]}
              onPress={() => openQuickLogModal(item)}
            >
              <MaterialCommunityIcons
                name={isInside ? "boom-gate-up" : "boom-gate-up"}
                size={18}
                color="#fff"
              />
              <Text style={styles.quickActionBtnText}>
                {isInside ? "Record Exit & Open Gate" : "Record Entry & Open Gate"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderEmptyComponent = () => {
    if (fetching && mappedList.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#0f5f3c" />
          <Text style={styles.emptyText}>Loading vehicles from server...</Text>
        </View>
      );
    }

    if (searchQuery.trim().length > 0 || filterOwnOnly || filterInsideOnly) {
      return (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="car-search" size={48} color="#ccc" />
          <Text style={styles.emptyTitle}>No matching vehicles</Text>
          <Text style={styles.emptyText}>
            No vehicles match your current search and filter criteria.
          </Text>
          <TouchableOpacity
            style={styles.clearFilterBtn}
            onPress={() => {
              setSearchQuery("");
              setFilterOwnOnly(false);
              setFilterInsideOnly(false);
            }}
          >
            <Text style={styles.clearFilterText}>Reset All Filters</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons name="car-multiple" size={48} color="#ccc" />
        <Text style={styles.emptyText}>No registered own vehicles found. Log one above.</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Edge-to-Edge Status Bar Fill */}
      <View style={{ height: insets.top, backgroundColor: "#0f5f3c", width: "100%" }} />
      <StatusBar style="light" backgroundColor="#0f5f3c" />

      <FlatList
        data={filteredVehicles}
        renderItem={renderVehicleItem}
        keyExtractor={(item, index) =>
          item.machine_id ? String(item.machine_id) : item.truck || index.toString()
        }
        ListHeaderComponent={
          <View>
            <Text style={styles.heading}>📋 Vehicle Gate & Mapping System</Text>
            <Text style={styles.subHeading}>
              Log own & company vehicles with photo capture for automatic boom barrier gates.
            </Text>

            {/* LOG & MAP VEHICLE FORM CARD */}
            <View style={styles.formCard}>
              <View style={styles.formCardHeader}>
                <Text style={styles.formTitle}>Record Vehicle Gate Log</Text>
                <View style={styles.apiBadge}>
                  <Text style={styles.apiBadgeText}>⚡ Auto-Toggle & Open</Text>
                </View>
              </View>

              {/* Vehicle Number */}
              <Text style={styles.label}>Vehicle Registration Number:</Text>
              <View style={styles.inputWrapper}>
                <MaterialCommunityIcons name="card-bulleted-outline" size={22} color="#0f5f3c" />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. TN 59 AK 0001"
                  placeholderTextColor="#999"
                  value={truckNumber}
                  onChangeText={(txt) => setTruckNumber(normalizeVehicleInput(txt))}
                  onBlur={handleBlur}
                  autoCapitalize="characters"
                  maxLength={16}
                />
              </View>

              {/* Own Vehicle Toggle Row */}
              <View style={styles.ownVehicleRow}>
                <Text style={styles.ownVehicleLabel}>Own Vehicle</Text>
                <Switch
                  value={isOwnVehicle === 1}
                  onValueChange={(val) => setIsOwnVehicle(val ? 1 : 0)}
                  trackColor={{ false: "#cbd5e1", true: "#0f5f3c" }}
                  thumbColor={isOwnVehicle === 1 ? "#fff" : "#f4f3f4"}
                />
              </View>

              {/* Vehicle Type Dropdown */}
              <Text style={styles.label}>Vehicle Type Category:</Text>
              <TouchableOpacity
                style={styles.dropdownTrigger}
                onPress={() => setTypeModalVisible(true)}
              >
                <Text style={styles.dropdownText}>{vehicleType}</Text>
                <Ionicons name="chevron-down" size={20} color="#0f5f3c" />
              </TouchableOpacity>

              {/* Photo Capture Section */}
              <Text style={styles.label}>Vehicle Photo (Optional / Recommended):</Text>
              {capturedImage ? (
                <View style={styles.imagePreviewContainer}>
                  <Image source={{ uri: capturedImage.uri }} style={styles.imagePreview} />
                  <View style={styles.imagePreviewOverlay}>
                    <TouchableOpacity
                      style={styles.retakeBtn}
                      onPress={() => handleCapturePhoto("form")}
                    >
                      <Ionicons name="camera" size={14} color="#fff" />
                      <Text style={styles.retakeText}>Retake</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.removeImageBtn}
                      onPress={() => setCapturedImage(null)}
                    >
                      <Ionicons name="close-circle" size={20} color="#F44336" />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.photoActionsRow}>
                  <TouchableOpacity
                    style={styles.photoActionBtn}
                    onPress={() => handleCapturePhoto("form")}
                  >
                    <Ionicons name="camera-outline" size={20} color="#0f5f3c" />
                    <Text style={styles.photoActionBtnText}>Take Photo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.photoActionBtn, styles.photoActionBtnAlt]}
                    onPress={() => handlePickPhoto("form")}
                  >
                    <Ionicons name="images-outline" size={20} color="#666" />
                    <Text style={[styles.photoActionBtnText, { color: "#666" }]}>Gallery</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Submit Button */}
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleFormSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="boom-gate-up" size={22} color="#fff" />
                    <Text style={styles.submitBtnText}>Record Log & Open Boom Barrier</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* SECTION HEADER & STATS */}
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>Registered Company Vehicles</Text>
                <Text style={styles.sectionCount}>
                  {mappedList.length > 0
                    ? `Showing ${filteredVehicles.length} of ${mappedList.length} vehicles`
                    : "No vehicles registered"}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.refreshIconBtn}
                onPress={() => fetchVehiclesList(true)}
                disabled={fetching || refreshing}
              >
                <Ionicons
                  name="refresh-outline"
                  size={20}
                  color={fetching || refreshing ? "#bbb" : "#0f5f3c"}
                />
              </TouchableOpacity>
            </View>

            {/* SEARCH BAR */}
            <View style={styles.searchContainer}>
              <Ionicons name="search-outline" size={20} color="#0f5f3c" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by truck number (e.g. AP 21...)"
                placeholderTextColor="#888"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="characters"
                returnKeyType="search"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery("")} style={styles.clearSearchBtn}>
                  <Ionicons name="close-circle" size={18} color="#888" />
                </TouchableOpacity>
              )}
            </View>

            {/* FILTER CHIPS (Own Vehicles Filter Checkbox) */}
            <View style={styles.filterChipsRow}>
              {/* Own Only Filter Button */}
              <TouchableOpacity
                style={[styles.filterChip, filterOwnOnly && styles.filterChipActive]}
                onPress={() => setFilterOwnOnly((prev) => !prev)}
              >
                <Ionicons
                  name={filterOwnOnly ? "checkbox" : "square-outline"}
                  size={16}
                  color={filterOwnOnly ? "#0f5f3c" : "#666"}
                  style={{ marginRight: 5 }}
                />
                <Text style={[styles.filterChipText, filterOwnOnly && styles.filterChipTextActive]}>
                  ⭐ Own Vehicles Only
                </Text>
              </TouchableOpacity>

              {/* Inside Quarry Only Filter Button */}
              <TouchableOpacity
                style={[styles.filterChip, filterInsideOnly && styles.filterChipActive]}
                onPress={() => setFilterInsideOnly((prev) => !prev)}
              >
                <Ionicons
                  name={filterInsideOnly ? "checkbox" : "square-outline"}
                  size={16}
                  color={filterInsideOnly ? "#0f5f3c" : "#666"}
                  style={{ marginRight: 5 }}
                />
                <Text style={[styles.filterChipText, filterInsideOnly && styles.filterChipTextActive]}>
                  🟢 Inside Only
                </Text>
              </TouchableOpacity>

              {/* Reset filter button if any active */}
              {(filterOwnOnly || filterInsideOnly || searchQuery.length > 0) && (
                <TouchableOpacity
                  style={styles.resetFilterBtn}
                  onPress={() => {
                    setFilterOwnOnly(false);
                    setFilterInsideOnly(false);
                    setSearchQuery("");
                  }}
                >
                  <Text style={styles.resetFilterText}>Reset</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        }
        ListEmptyComponent={renderEmptyComponent}
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchVehiclesList(true)}
            colors={["#0f5f3c"]}
            tintColor="#0f5f3c"
          />
        }
      />

      {/* QUICK GATE LOG MODAL */}
      <Modal
        visible={quickLogModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setQuickLogModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Quick Gate Action</Text>
              <TouchableOpacity onPress={() => setQuickLogModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {selectedVehicle && (
              <View style={styles.quickLogDetails}>
                <View style={styles.quickLogRow}>
                  <Text style={styles.quickLogLabel}>Truck Plate:</Text>
                  <Text style={styles.quickLogValue}>{selectedVehicle.truck}</Text>
                </View>
                <View style={styles.quickLogRow}>
                  <Text style={styles.quickLogLabel}>Vehicle Type:</Text>
                  <Text style={styles.quickLogValue}>{selectedVehicle.vehicle_type || "Vehicle"}</Text>
                </View>
                <View style={styles.quickLogRow}>
                  <Text style={styles.quickLogLabel}>Current Status:</Text>
                  <Text
                    style={[
                      styles.quickLogValue,
                      selectedVehicle.is_inside ? { color: "#2E7D32" } : { color: "#78909C" },
                    ]}
                  >
                    {selectedVehicle.is_inside ? "Inside Quarry 🟢" : "Outside ⚪"}
                  </Text>
                </View>
                <View style={styles.quickLogRow}>
                  <Text style={styles.quickLogLabel}>Next Event:</Text>
                  <Text
                    style={[
                      styles.quickLogValue,
                      { color: selectedVehicle.is_inside ? "#F57C00" : "#2E7D32", fontWeight: "bold" },
                    ]}
                  >
                    {selectedVehicle.is_inside ? "🚪 Record EXIT & Open Gate" : "🚪 Record ENTRY & Open Gate"}
                  </Text>
                </View>

                {/* Photo Capture inside quick modal */}
                <Text style={[styles.label, { marginTop: 15 }]}>Capture Event Photo (Optional):</Text>
                {quickLogImage ? (
                  <View style={styles.imagePreviewContainer}>
                    <Image source={{ uri: quickLogImage.uri }} style={styles.imagePreview} />
                    <TouchableOpacity
                      style={styles.removeImageBtn}
                      onPress={() => setQuickLogImage(null)}
                    >
                      <Ionicons name="close-circle" size={20} color="#F44336" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.photoActionsRow}>
                    <TouchableOpacity
                      style={styles.photoActionBtn}
                      onPress={() => handleCapturePhoto("modal")}
                    >
                      <Ionicons name="camera-outline" size={18} color="#0f5f3c" />
                      <Text style={styles.photoActionBtnText}>Take Photo</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.photoActionBtn, styles.photoActionBtnAlt]}
                      onPress={() => handlePickPhoto("modal")}
                    >
                      <Ionicons name="images-outline" size={18} color="#666" />
                      <Text style={[styles.photoActionBtnText, { color: "#666" }]}>Gallery</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <TouchableOpacity
                  style={[
                    styles.submitBtn,
                    selectedVehicle.is_inside ? styles.submitBtnExit : styles.submitBtnEntry,
                    { marginTop: 20 },
                  ]}
                  onPress={handleQuickLogSubmit}
                  disabled={quickLogLoading}
                >
                  {quickLogLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="boom-gate-up" size={22} color="#fff" />
                      <Text style={styles.submitBtnText}>
                        {selectedVehicle.is_inside
                          ? "Authorize Exit & Open Boom"
                          : "Authorize Entry & Open Boom"}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* VEHICLE TYPE MODAL */}
      <Modal
        visible={typeModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setTypeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choose Vehicle Category</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {vehicleTypes.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.modalItem, vehicleType === type && styles.modalItemActive]}
                  onPress={() => {
                    setVehicleType(type);
                    setTypeModalVisible(false);
                  }}
                >
                  <Text style={[styles.modalItemText, vehicleType === type && styles.modalItemTextActive]}>
                    {type}
                  </Text>
                  {vehicleType === type && <Ionicons name="checkmark" size={20} color="#d4b262" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setTypeModalVisible(false)}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
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
  scrollContainer: {
    padding: 15,
    paddingBottom: Platform.OS === "ios" ? 110 : 130,
  },
  heading: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#0f5f3c",
    marginTop: 10,
  },
  subHeading: {
    fontSize: 13,
    color: "#666",
    marginTop: 4,
    marginBottom: 18,
  },
  formCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  formCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingBottom: 10,
    marginBottom: 10,
  },
  formTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#333",
  },
  apiBadge: {
    backgroundColor: "rgba(15, 95, 60, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  apiBadgeText: {
    fontSize: 11,
    color: "#0f5f3c",
    fontWeight: "700",
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
    marginBottom: 6,
    marginTop: 10,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: "#fafafa",
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 11,
    marginLeft: 8,
    color: "#333",
    fontWeight: "600",
  },
  ownVehicleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fafafa",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 12,
    marginBottom: 4,
  },
  ownVehicleLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  dropdownTrigger: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#fafafa",
  },
  dropdownText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "600",
  },
  photoActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  photoActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#0f5f3c",
    backgroundColor: "rgba(15, 95, 60, 0.05)",
    gap: 6,
  },
  photoActionBtnAlt: {
    borderColor: "#ccc",
    backgroundColor: "#f9f9f9",
  },
  photoActionBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0f5f3c",
  },
  imagePreviewContainer: {
    position: "relative",
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    marginTop: 6,
    height: 120,
    backgroundColor: "#000",
  },
  imagePreview: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  imagePreviewOverlay: {
    position: "absolute",
    bottom: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  retakeBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 4,
  },
  retakeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "bold",
  },
  removeImageBtn: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 2,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0f5f3c",
    borderRadius: 12,
    padding: 14,
    marginTop: 18,
    elevation: 2,
    gap: 8,
  },
  submitBtnEntry: {
    backgroundColor: "#0f5f3c",
  },
  submitBtnExit: {
    backgroundColor: "#D97706",
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#fff",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    marginTop: 5,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#222",
  },
  sectionCount: {
    fontSize: 12,
    color: "#777",
    marginTop: 2,
  },
  refreshIconBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#e8f2ec",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    paddingHorizontal: 12,
    marginBottom: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 11,
    color: "#333",
    fontWeight: "500",
  },
  clearSearchBtn: {
    padding: 4,
  },
  filterChipsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  filterChipActive: {
    borderColor: "#0f5f3c",
    backgroundColor: "rgba(15, 95, 60, 0.08)",
  },
  filterChipText: {
    fontSize: 12,
    color: "#555",
    fontWeight: "600",
  },
  filterChipTextActive: {
    color: "#0f5f3c",
    fontWeight: "700",
  },
  resetFilterBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  resetFilterText: {
    fontSize: 12,
    color: "#d32f2f",
    fontWeight: "600",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(15, 95, 60, 0.08)",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  truckText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1a1a1a",
    letterSpacing: 0.3,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusBadgeInside: {
    backgroundColor: "#E8F5E9",
  },
  statusBadgeOutside: {
    backgroundColor: "#ECEFF1",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  statusDotInside: {
    backgroundColor: "#2E7D32",
  },
  statusDotOutside: {
    backgroundColor: "#78909C",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  statusTextInside: {
    color: "#2E7D32",
  },
  statusTextOutside: {
    color: "#546E7A",
  },
  tagRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: 6,
    gap: 6,
  },
  ownBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(212, 178, 98, 0.18)",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(212, 178, 98, 0.4)",
  },
  ownBadgeText: {
    fontSize: 11,
    color: "#99731e",
    fontWeight: "700",
  },
  visitorBadge: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  visitorBadgeText: {
    fontSize: 11,
    color: "#777",
    fontWeight: "600",
  },
  typeBadge: {
    backgroundColor: "rgba(15, 95, 60, 0.08)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 11,
    color: "#0f5f3c",
    fontWeight: "700",
    textTransform: "capitalize",
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailText: {
    fontSize: 11,
    color: "#666",
    fontWeight: "500",
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  timeText: {
    fontSize: 11,
    color: "#888",
  },
  quickActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 10,
    gap: 6,
  },
  quickActionBtnEntry: {
    backgroundColor: "#0f5f3c",
  },
  quickActionBtnExit: {
    backgroundColor: "#D97706",
  },
  quickActionBtnText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#fff",
  },
  emptyContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 30,
    alignItems: "center",
    justifyContent: "center",
    elevation: 1,
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#333",
    marginTop: 10,
  },
  emptyText: {
    fontSize: 13,
    color: "#888",
    marginTop: 6,
    textAlign: "center",
  },
  clearFilterBtn: {
    marginTop: 14,
    backgroundColor: "#0f5f3c",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  clearFilterText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingBottom: 12,
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
  },
  quickLogDetails: {
    paddingVertical: 5,
  },
  quickLogRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
  },
  quickLogLabel: {
    fontSize: 13,
    color: "#666",
  },
  quickLogValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#222",
  },
  modalItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalItemActive: {
    borderBottomColor: "#d4b262",
  },
  modalItemText: {
    fontSize: 14,
    color: "#444",
  },
  modalItemTextActive: {
    color: "#0f5f3c",
    fontWeight: "700",
  },
  modalCloseButton: {
    alignItems: "center",
    paddingVertical: 15,
    marginTop: 10,
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
  },
  modalCloseText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "700",
  },
});
