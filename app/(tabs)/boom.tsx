import { BASE_URL } from "@/src/components/BaseUrlApi";
import { GateStatusModal, GateStatusModalProps } from "@/src/components/GateStatusModal";
import { RootState } from "@/src/store/store";
import { fetchAndSaveBoomSettings, triggerRemoteDoorOpen } from "@/src/utils/doorController";
import { resolveImageUrl } from "@/src/utils/imageUtils";
import { formatVehiclePlate, normalizeVehicleInput } from "@/src/utils/vehicleFormatter";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect } from "expo-router";
import moment from "moment";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useSelector } from "react-redux";

const toUrlEncoded = (obj: any) => {
  return Object.keys(obj)
    .map((key) => encodeURIComponent(key) + "=" + encodeURIComponent(obj[key]))
    .join("&");
};

export interface ActiveVehicleItem {
  id?: number | string;
  registration: string;
  vehicle_model: string;
  is_own?: number | boolean;
}

export default function GateControl() {
  const insets = useSafeAreaInsets();
  const [vehicleType, setVehicleType] = useState("Car"); // Car, Bike, Truck, Others
  const [wheelerType, setWheelerType] = useState("6 Wheeler"); // Default wheeler type
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [entryImage, setEntryImage] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Active Vehicles from /activevehiclelist
  const [activeVehicles, setActiveVehicles] = useState<ActiveVehicleItem[]>([]);
  const [fetchingActiveVehicles, setFetchingActiveVehicles] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<ActiveVehicleItem | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Pending List (Vehicles Inside)
  const [pendingVehicles, setPendingVehicles] = useState<any[]>([]);
  const [fetchingList, setFetchingList] = useState(false);
  const [pendingFilter, setPendingFilter] = useState<"all" | "own" | "visitor">("all");

  // Wheeler Dropdown Modal
  const [wheelerModalVisible, setWheelerModalVisible] = useState(false);

  // Barcode Scanner Modal for Truck Exit
  const [scannerVisible, setScannerVisible] = useState(false);
  const [scanningVehicle, setScanningVehicle] = useState<any>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  // Vehicle Exit Workflow Modal
  const [exitModalVisible, setExitModalVisible] = useState(false);
  const [exitVehicle, setExitVehicle] = useState<any>(null);
  const [exitImage, setExitImage] = useState<any>(null);
  const [exitBarcode, setExitBarcode] = useState<string>("");

  // Photo Viewer Modal
  const [photoViewerVisible, setPhotoViewerVisible] = useState(false);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState("");

  // Premium Status / Feedback Modal
  const [statusModal, setStatusModal] = useState<GateStatusModalProps>({
    visible: false,
    type: "entry_success",
    title: "",
    onClose: () => setStatusModal((prev) => ({ ...prev, visible: false })),
  });

  const { companyId, authToken } = useSelector((state: RootState) => state.auth);

  const wheelers = [
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

  // Fetch Pending Vehicles (Inside Quarry) via GET
  const fetchPendingList = async () => {
    setFetchingList(true);
    try {
      const res = await axios.get(BASE_URL + "boompendinglist", {
        params: {
          company_id: companyId || 23,
          limit: 50,
          offset: 0,
        },
        headers: {
          "User-Agent": "DashboardApp",
        },
      });

      if (res.data.status === "success" || res.data.success) {
        setPendingVehicles(res.data.data || []);
      } else {
        setPendingVehicles([]);
      }
    } catch (error) {
      console.error("Error fetching pending vehicles:", error);
    } finally {
      setFetchingList(false);
    }
  };

  // Fetch Active Vehicles from /activevehiclelist API
  const fetchActiveVehicles = async (searchQuery?: string) => {
    setFetchingActiveVehicles(true);
    try {
      const res = await axios.get(BASE_URL + "activevehiclelist", {
        params: {
          company_id: companyId || 23,
          ...(searchQuery ? { search: searchQuery } : {}),
        },
        headers: {
          "User-Agent": "DashboardApp",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
      });

      if ((res.data?.status === "success" || res.data?.success) && Array.isArray(res.data?.data)) {
        setActiveVehicles(res.data.data);
        await AsyncStorage.setItem(
          `active_vehicles_${companyId || 23}`,
          JSON.stringify(res.data.data)
        );
      } else {
        // Fallback to local cache if available
        const localData = await AsyncStorage.getItem(`active_vehicles_${companyId || 23}`);
        if (localData) {
          setActiveVehicles(JSON.parse(localData));
        }
      }
    } catch (e) {
      console.error("Error fetching active vehicles:", e);
      try {
        const localData = await AsyncStorage.getItem(`active_vehicles_${companyId || 23}`);
        if (localData) {
          setActiveVehicles(JSON.parse(localData));
        }
      } catch (cacheErr) {
        console.error("Cache read error:", cacheErr);
      }
    } finally {
      setFetchingActiveVehicles(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchPendingList();
      fetchActiveVehicles();
      fetchAndSaveBoomSettings(companyId || 23, authToken || undefined);
    }, [companyId, authToken])
  );

  // Filtered vehicles based on typed vehicle registration number
  const filteredVehicles = useMemo(() => {
    const query = vehicleNumber.trim();
    if (!query) {
      return activeVehicles.slice(0, 15);
    }
    const clean = query.replace(/[^A-Z0-9]/gi, "").toUpperCase();
    return activeVehicles.filter((v) => {
      const regClean = (v.registration || "").replace(/[^A-Z0-9]/gi, "").toUpperCase();
      const modelClean = (v.vehicle_model || "").toUpperCase();
      const idClean = String(v.id || "");
      return regClean.includes(clean) || modelClean.includes(clean) || idClean.includes(clean);
    });
  }, [activeVehicles, vehicleNumber]);

  // Filtered pending vehicles inside quarry by is_own status
  const filteredPendingVehicles = useMemo(() => {
    if (pendingFilter === "own") {
      return pendingVehicles.filter(
        (v) => v.is_own === 1 || v.is_own === "1" || v.is_own === true
      );
    }
    if (pendingFilter === "visitor") {
      return pendingVehicles.filter(
        (v) => v.is_own === 0 || v.is_own === "0" || v.is_own === false || !v.is_own
      );
    }
    return pendingVehicles;
  }, [pendingVehicles, pendingFilter]);

  // Compress Image
  const compressImage = async (uri: string) => {
    const manipResult = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 800 } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
    );
    return manipResult;
  };

  // Capture Image
  const captureImage = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setStatusModal({
        visible: true,
        type: "error",
        title: "Permission Required",
        subtitle: "Camera access is required to capture vehicle photo.",
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
        setEntryImage({ uri: compressed.uri });
      } catch (err) {
        setStatusModal({
          visible: true,
          type: "error",
          title: "Image Error",
          subtitle: "Failed to process photo image.",
          onClose: () => setStatusModal((prev) => ({ ...prev, visible: false })),
        });
      } finally {
        setLoading(false);
      }
    }
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

  // When a vehicle is selected from the suggestions or matched
  const handleSelectVehicle = (item: any, closeSuggestions = true) => {
    if (!item) {
      setSelectedVehicle(null);
      return;
    }
    const regNo = item.registration || item.truck || item.value || "";
    const formatted = formatVehiclePlate(regNo);
    setVehicleNumber(formatted);
    setSelectedVehicle(item.raw || item);
    if (closeSuggestions) {
      setShowSuggestions(false);
    }

    // Auto-populate vehicle_type and wheelerType based on vehicle_model
    const model = (item.vehicle_model || item.vehicle_type || "").trim();
    const modelLower = model.toLowerCase();

    // Check if model matches wheelers list
    const matchedWheeler = wheelers.find(
      (w) =>
        w.toLowerCase() === modelLower ||
        w.toLowerCase().replace(/\s/g, "") === modelLower.replace(/\s/g, "")
    );

    if (matchedWheeler) {
      setVehicleType("Truck");
      setWheelerType(matchedWheeler);
    } else if (
      modelLower.includes("wheeler") ||
      modelLower.includes("truck") ||
      modelLower.includes("lorry") ||
      modelLower.includes("tipper")
    ) {
      setVehicleType("Truck");
      const digits = model.match(/\d+/);
      if (digits) {
        const reconstructed = `${digits[0]} Wheeler`;
        const found = wheelers.find((w) => w === reconstructed);
        setWheelerType(found || `${digits[0]} Wheeler`);
      } else {
        setWheelerType("6 Wheeler");
      }
    } else if (modelLower.includes("car")) {
      setVehicleType("Car");
    } else if (
      modelLower.includes("bike") ||
      modelLower.includes("motorcycle") ||
      modelLower.includes("scooter")
    ) {
      setVehicleType("Bike");
    } else if (model) {
      setVehicleType("Others");
    }
  };

  // Handle typing vehicle number (Autocomplete detection against active vehicles)
  const handleVehicleNumberChange = (text: string) => {
    const cleaned = normalizeVehicleInput(text);
    setVehicleNumber(cleaned);
    setShowSuggestions(true);

    const raw = cleaned.replace(/[^A-Z0-9]/gi, "").toUpperCase();
    if (!raw) {
      setSelectedVehicle(null);
      return;
    }

    const matched = activeVehicles.find(
      (v) => (v.registration || "").replace(/[^A-Z0-9]/gi, "").toUpperCase() === raw
    );
    if (matched) {
      handleSelectVehicle(matched, false);
    } else {
      setSelectedVehicle(null);
    }
  };

  const handleVehicleBlur = () => {
    if (vehicleNumber.trim()) {
      const formatted = formatVehiclePlate(vehicleNumber);
      setVehicleNumber(formatted);
    }
  };

  // Submit entry log - Pass all parameters (registration, vehicle_type, vehicle_model, is_own, vehicle_id, image, token)
  const handleEntrySubmit = async () => {
    if (!vehicleNumber.trim()) {
      setStatusModal({
        visible: true,
        type: "error",
        title: "Vehicle Number Required",
        subtitle: "Please enter or select a valid vehicle registration number (e.g. AP 01 TD 4321).",
        onClose: () => setStatusModal((prev) => ({ ...prev, visible: false })),
      });
      return;
    }

    const formattedTruck = formatVehiclePlate(vehicleNumber);
    setVehicleNumber(formattedTruck);

    setLoading(true);
    try {
      const typeToSend = vehicleType === "Truck" ? wheelerType : vehicleType;
      const now = moment().format("YYYY-MM-DD HH:mm:ss");

      const formData = new FormData();
      formData.append("company_id", String(companyId || 23));
      formData.append("truck", formattedTruck);
      formData.append("vehicle_type", typeToSend);
      formData.append("vehicle_model", typeToSend);
      formData.append("entry_datetime", now);

      // Pass additional parameters if matched from /activevehiclelist
      if (selectedVehicle?.id) {
        formData.append("vehicle_id", String(selectedVehicle.id));
      }
      if (selectedVehicle?.is_own !== undefined) {
        formData.append("is_own", String(selectedVehicle.is_own));
      }

      if (entryImage?.uri) {
        formData.append("entry_image", {
          uri: entryImage.uri,
          type: "image/jpeg",
          name: "entry.jpg",
        } as any);
      }
      if (authToken) {
        formData.append("token", authToken);
      }

      console.log(`\n================== 🚪 [BOOM ENTRY API CALL] ==================`);
      console.log(`⏰ Timestamp    : ${now}`);
      console.log(`🚗 Truck        : ${formattedTruck}`);
      console.log(`🏷️ Vehicle Type : ${typeToSend}`);
      console.log(`🆔 Vehicle ID   : ${selectedVehicle?.id || "New Vehicle"}`);
      console.log(`🏢 Is Own Flag  : ${selectedVehicle?.is_own ?? "0"}`);
      console.log(`🖼️ Entry Image  : ${entryImage?.uri ? "Attached" : "None"}`);
      console.log(`==============================================================\n`);

      const res = await axios.post(
        BASE_URL + "boomentry",
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
        // Trigger remote gate opening command dynamically using configured boomentry URL from boomsettings
        const doorResult = await triggerRemoteDoorOpen({
          truck: formattedTruck,
          action: "Register Entry & Open Gate",
          type: "entry",
          companyId: companyId || 23,
        });

        setStatusModal({
          visible: true,
          type: "entry_success",
          title: "Gate Entry Recorded",
          subtitle: "Vehicle registration completed and recorded inside quarry.",
          truck: formattedTruck,
          vehicleType: typeToSend,
          timeText: moment(now).format("DD MMM, hh:mm A"),
          barrierSuccess: doorResult.success,
          barrierMessage: doorResult.success
            ? "Boom barrier OPEN command triggered successfully ✅"
            : `Boom barrier: ${doorResult.error || "Controller unreachable on local network"}`,
          imageUri: entryImage?.uri,
          onClose: () => setStatusModal((prev) => ({ ...prev, visible: false })),
        });

        setVehicleNumber("");
        setSelectedVehicle(null);
        setEntryImage(null);
        fetchPendingList();
      } else if (res.data.status === "error") {
        setStatusModal({
          visible: true,
          type: "error",
          title: "Entry Failed",
          subtitle:
            res.data.message ||
            (res.data.errors?.truck
              ? res.data.errors.truck.join("\n")
              : "Failed to record entry."),
          truck: formattedTruck,
          onClose: () => setStatusModal((prev) => ({ ...prev, visible: false })),
        });
      } else {
        setStatusModal({
          visible: true,
          type: "error",
          title: "Entry Error",
          subtitle: res.data.message || "Failed to log entry.",
          truck: formattedTruck,
          onClose: () => setStatusModal((prev) => ({ ...prev, visible: false })),
        });
      }
    } catch (error: any) {
      console.error("Entry submission error:", error?.response?.data || error);
      const serverMsg =
        error?.response?.data?.message ||
        error?.response?.data?.errors?.truck?.[0];
      setStatusModal({
        visible: true,
        type: "error",
        title: "Submission Error",
        subtitle: serverMsg || "Something went wrong. Please try again.",
        truck: formattedTruck,
        onClose: () => setStatusModal((prev) => ({ ...prev, visible: false })),
      });
    } finally {
      setLoading(false);
    }
  };

  // Trigger exit (Supports Barcode Scan Exit and Direct Exit)
  const triggerExit = async (vehicle: any, barcode?: string, imageObj?: any) => {
    setLoading(true);
    const now = moment().format("YYYY-MM-DD HH:mm:ss");
    const cleanBarcode = barcode ? String(barcode).trim() : "";
    const isDirectExit = !cleanBarcode || cleanBarcode === "0";

    console.log(`\n================== 🚪 [BOOM EXIT API CALL] ==================`);
    console.log(`⏰ Timestamp   : ${now}`);
    console.log(`🚗 Truck       : ${vehicle?.truck}`);
    console.log(`🔄 Exit Type   : ${isDirectExit ? "Direct Exit (barcode=0)" : "Barcode Scan Exit"}`);
    console.log(`🏷️ Barcode     : ${isDirectExit ? "0" : cleanBarcode}`);
    console.log(`⭐ is_own      : ${vehicle?.is_own !== undefined ? vehicle.is_own : 1}`);
    console.log(`🖼️ Exit Image  : ${imageObj?.uri ? "Attached" : "None"}`);
    console.log(`🏢 Company ID  : ${companyId || 23}`);

    try {
      const formData = new FormData();

      if (isDirectExit) {
        // Direct Exit: send barcode: 0, is_own, truck, company_id, and optional exit_image
        formData.append("barcode", "0");
        const ownVal =
          vehicle?.is_own !== undefined && vehicle?.is_own !== null
            ? String(vehicle.is_own ? 1 : 0)
            : "1";
        formData.append("is_own", ownVal);
        if (vehicle?.truck) {
          formData.append("truck", vehicle.truck);
        }
        formData.append("company_id", String(companyId || 23));
      } else {
        // Barcode Scan Exit
        formData.append("barcode", cleanBarcode);
        if (vehicle?.truck) {
          formData.append("truck", vehicle.truck);
        }
        if (companyId) {
          formData.append("company_id", String(companyId));
        }
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

      console.log(`🌐 Endpoint  : ${BASE_URL}boomexit`);
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

      console.log(`📦 [BOOM EXIT] Response:`, JSON.stringify(res.data, null, 2));
      console.log(`============================================================\n`);

      const resData = res.data;
      const statusLabel = resData?.data?.status_label || resData?.status_label;
      const isStatusExited =
        typeof statusLabel === "string" &&
        statusLabel.trim().toLowerCase() === "exited";
      const isSuccess =
        resData?.status === "success" ||
        resData?.success === true ||
        isStatusExited;

      if (isSuccess) {
        const truckName = resData?.data?.truck || vehicle?.truck || "Vehicle";

        // Trigger remote gate opening command strictly using configured boomexit URL from boomsettings
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
          subtitle:
            resData.message ||
            (isStatusExited
              ? `Vehicle ${truckName} status updated to Exited and gate opened.`
              : "Vehicle marked as exited and gate open command triggered."),
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

        fetchPendingList();
      } else {
        setStatusModal({
          visible: true,
          type: "error",
          title: "Exit Failed",
          subtitle: resData?.message || "Failed to log exit.",
          truck: vehicle?.truck,
          onClose: () => setStatusModal((prev) => ({ ...prev, visible: false })),
        });
      }
    } catch (error: any) {
      console.error("Exit API error:", error?.response?.data || error);
      setStatusModal({
        visible: true,
        type: "error",
        title: "Exit Network Error",
        subtitle:
          error?.response?.data?.message ||
          "Failed to record exit log on server.",
        truck: vehicle?.truck,
        onClose: () => setStatusModal((prev) => ({ ...prev, visible: false })),
      });
    } finally {
      setLoading(false);
    }
  };

  // Exit button action click - Opens exit workflow modal
  const handleExitPress = (item: any) => {
    setExitVehicle(item);
    setExitImage(null);
    setExitBarcode("");
    setExitModalVisible(true);
  };

  // Open scanner for exit ticket
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

  // Barcode scanned successfully
  const onBarcodeScanned = (event: any) => {
    const rawData = event?.data ?? event;
    const barcodeType = event?.type ?? "unknown";

    console.log(`\n================== 📷 [BARCODE SCANNED] ==================`);
    console.log(`⏰ Timestamp   : ${new Date().toISOString()}`);
    console.log(`🏷️ Scanned Data :`, rawData);
    console.log(`🔍 Barcode Type :`, barcodeType);
    console.log(`🚗 Target Truck :`, (exitVehicle || scanningVehicle)?.truck || "Unknown");
    console.log(`========================================================\n`);

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

  const renderPendingItem = ({ item, index }: { item: any; index: number }) => {
    const isTruck = item.vehicle_type && item.vehicle_type.toLowerCase().includes("wheeler");
    const duration = item.duration_formatted || (item.duration_minutes ? `${item.duration_minutes}m` : "--");
    const rawImg = item.entry_image_url || item.entry_image || item.image || item.photo;
    const imageUrl = resolveImageUrl(rawImg);
    const isOwn = item.is_own === 1 || item.is_own === "1" || item.is_own === true;

    return (
      <View style={styles.card}>
        <View style={styles.cardContent}>
          <Text style={styles.cardNumber}>{index + 1}</Text>
          {imageUrl ? (
            <TouchableOpacity onPress={() => viewPhoto(imageUrl)} style={styles.thumbWrap}>
              <Image source={{ uri: imageUrl }} style={styles.thumb} />
              <View style={styles.thumbZoomIcon}>
                <Ionicons name="expand" size={10} color="#fff" />
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.thumbPlaceholder}>
              <MaterialCommunityIcons
                name={
                  item.vehicle_type?.toLowerCase() === "bike"
                    ? "motorbike"
                    : item.vehicle_type?.toLowerCase() === "car"
                    ? "car"
                    : "truck"
                }
                size={20}
                color="#0f5f3c"
              />
            </View>
          )}

          <View style={styles.cardDetails}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 4 }}>
              <Text style={styles.cardTruckText}>{item.truck}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                {isOwn ? (
                  <View style={styles.pendingOwnBadge}>
                    <Ionicons name="star" size={10} color="#99731e" style={{ marginRight: 2 }} />
                    <Text style={styles.pendingOwnBadgeText}>Own Vehicle</Text>
                  </View>
                ) : (
                  <View style={styles.pendingVisitorBadge}>
                    <Text style={styles.pendingVisitorBadgeText}>Visitor</Text>
                  </View>
                )}
                <View style={styles.badgeInside}>
                  <Text style={styles.badgeInsideText}>{item.status_label || "Inside"}</Text>
                </View>
              </View>
            </View>
            <Text style={styles.cardTypeText}>{item.vehicle_type}</Text>
            <View style={styles.cardMetaRow}>
              <Text style={styles.cardTimeText}>
                In: {item.entry_datetime ? moment(item.entry_datetime).format("DD MMM, hh:mm A") : "--"}
              </Text>
              <Text style={styles.cardDurationText}>⏱️ {duration}</Text>
            </View>
          </View>
        </View>

        <View style={styles.cardActionRow}>
          <TouchableOpacity
            style={[
              styles.exitButton,
              { backgroundColor: isTruck ? "#FF9800" : "#F44336" },
            ]}
            onPress={() => handleExitPress(item)}
          >
            {isTruck ? (
              <MaterialCommunityIcons name="barcode-scan" size={16} color="#fff" />
            ) : (
              <Ionicons name="exit-outline" size={16} color="#fff" />
            )}
            <Text style={styles.exitButtonText}>{isTruck ? "Scan & Exit" : "Direct Exit"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Edge-to-Edge Status Bar Fill */}
      <View style={{ height: insets.top, backgroundColor: "#0f5f3c", width: "100%" }} />
      <StatusBar style="light" backgroundColor="#0f5f3c" />
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>🚧 Gate Control Operations 🚧</Text>

        {/* LOG NEW ENTRY CARD */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Record New Entry</Text>

          {/* Vehicle Type Toggle */}
          <Text style={styles.inputLabel}>Select Vehicle Type:</Text>
          <View style={styles.typeSelectorRow}>
            {[
              { label: "Car", icon: "car" },
              { label: "Bike", icon: "motorbike" },
              { label: "Truck", icon: "truck" },
              { label: "Others", icon: "dots-horizontal" },
            ].map((type) => {
              const isActive = vehicleType === type.label;
              return (
                <TouchableOpacity
                  key={type.label}
                  style={[styles.typeButton, isActive && styles.typeButtonActive]}
                  onPress={() => setVehicleType(type.label)}
                >
                  <MaterialCommunityIcons
                    name={type.icon as any}
                    size={24}
                    color={isActive ? "#fff" : "#555"}
                  />
                  <Text style={[styles.typeText, isActive && styles.typeTextActive]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Dynamic Wheeler Selector for Truck */}
          {vehicleType === "Truck" && (
            <View style={styles.wheelerSection}>
              <Text style={styles.inputLabel}>Select Truck Wheeler Count:</Text>
              <TouchableOpacity
                style={styles.dropdownTrigger}
                onPress={() => setWheelerModalVisible(true)}
              >
                <Text style={styles.dropdownTriggerText}>{wheelerType}</Text>
                <Ionicons name="chevron-down" size={20} color="#0f5f3c" />
              </TouchableOpacity>
            </View>
          )}

          {/* Single Unified Searchable Input for Vehicle Registration Number */}
          <View style={styles.inputLabelRow}>
            <Text style={styles.inputLabel}>Vehicle Registration Number:</Text>
            {activeVehicles.length > 0 && (
              <TouchableOpacity
                onPress={() => fetchActiveVehicles()}
                style={styles.refreshVehiclesBtn}
                disabled={fetchingActiveVehicles}
              >
                {fetchingActiveVehicles ? (
                  <ActivityIndicator size="small" color="#0f5f3c" />
                ) : (
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Ionicons name="sync-outline" size={13} color="#0f5f3c" />
                    <Text style={styles.refreshVehiclesText}>
                      {activeVehicles.length} Registered
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Single Unified Input Box */}
          <View
            style={[
              styles.singleInputWrapper,
              showSuggestions && styles.singleInputWrapperFocused,
            ]}
          >
            <MaterialCommunityIcons
              name="car-search"
              size={22}
              color={showSuggestions ? "#0f5f3c" : "#666"}
            />
            <TextInput
              style={styles.singleInput}
              placeholder="Type or search registration (e.g. AP 01 TD 4321)"
              placeholderTextColor="#999"
              value={vehicleNumber}
              onFocus={() => setShowSuggestions(true)}
              onChangeText={handleVehicleNumberChange}
              onBlur={handleVehicleBlur}
              autoCapitalize="characters"
              maxLength={20}
            />
            {vehicleNumber ? (
              <TouchableOpacity
                onPress={() => {
                  setVehicleNumber("");
                  setSelectedVehicle(null);
                  setShowSuggestions(false);
                }}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={{ padding: 4 }}
              >
                <Ionicons name="close-circle" size={20} color="#888" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => setShowSuggestions(!showSuggestions)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={{ padding: 4 }}
              >
                <Ionicons
                  name={showSuggestions ? "chevron-up" : "chevron-down"}
                  size={18}
                  color="#666"
                />
              </TouchableOpacity>
            )}
          </View>

          {/* Autocomplete Dropdown Suggestions Panel */}
          {showSuggestions && (
            <View style={styles.suggestionsContainer}>
              <View style={styles.suggestionsHeader}>
                <Text style={styles.suggestionsHeaderText}>
                  {filteredVehicles.length > 0
                    ? `Matching Registered Vehicles (${filteredVehicles.length})`
                    : "No matching registered vehicle"}
                </Text>
                <TouchableOpacity onPress={() => setShowSuggestions(false)} style={{ padding: 4 }}>
                  <Ionicons name="close" size={16} color="#666" />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={{ maxHeight: 220 }}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
              >
                {filteredVehicles.map((item, idx) => {
                  const isSelected =
                    (item.registration || "").replace(/[^A-Z0-9]/gi, "").toUpperCase() ===
                    vehicleNumber.replace(/[^A-Z0-9]/gi, "").toUpperCase();
                  const isOwn = item.is_own === 1;

                  return (
                    <TouchableOpacity
                      key={item.id ? `veh-${item.id}` : `veh-${idx}`}
                      style={[
                        styles.suggestionItem,
                        isSelected && styles.suggestionItemActive,
                      ]}
                      onPress={() => handleSelectVehicle(item, true)}
                    >
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                          <View style={styles.miniIndBadge}>
                            <Text style={styles.miniIndText}>IND</Text>
                          </View>
                          <Text style={styles.suggestionRegText}>{item.registration}</Text>
                          <View
                            style={[
                              styles.suggestionOwnBadge,
                              { backgroundColor: isOwn ? "#e8f5e9" : "#f1f5f9" },
                            ]}
                          >
                            <Text
                              style={[
                                styles.suggestionOwnText,
                                { color: isOwn ? "#2e7d32" : "#64748b" },
                              ]}
                            >
                              {isOwn ? "Own Fleet" : "Visitor"}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.suggestionSubText}>
                          Model: {item.vehicle_model || "Standard"}
                        </Text>
                      </View>
                      {isSelected ? (
                        <Ionicons name="checkmark-circle" size={20} color="#0f5f3c" />
                      ) : (
                        <Ionicons name="chevron-forward" size={16} color="#bbb" />
                      )}
                    </TouchableOpacity>
                  );
                })}

                {vehicleNumber.trim() &&
                  !filteredVehicles.some(
                    (v) =>
                      (v.registration || "").replace(/[^A-Z0-9]/gi, "").toUpperCase() ===
                      vehicleNumber.replace(/[^A-Z0-9]/gi, "").toUpperCase()
                  ) && (
                    <TouchableOpacity
                      style={styles.suggestionNewItem}
                      onPress={() => setShowSuggestions(false)}
                    >
                      <MaterialCommunityIcons name="plus-circle" size={18} color="#0288d1" />
                      <View style={{ marginLeft: 8, flex: 1 }}>
                        <Text style={styles.suggestionNewTitle}>
                          Use: "{vehicleNumber}"
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}
              </ScrollView>
            </View>
          )}

          {/* Matched Vehicle Indicator Banner */}
          {selectedVehicle ? (
            <View style={styles.matchedVehicleBanner}>
              <View style={styles.matchedVehicleHeader}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <MaterialCommunityIcons name="check-decagram" size={18} color="#2e7d32" />
                  <Text style={styles.matchedVehicleTitle}>Registered Vehicle</Text>
                </View>
                {selectedVehicle.is_own === 1 ? (
                  <View style={styles.ownBadgeMatched}>
                    <Ionicons name="star" size={10} color="#99731e" style={{ marginRight: 2 }} />
                    <Text style={styles.ownBadgeMatchedText}>Own Vehicle</Text>
                  </View>
                ) : (
                  <View style={styles.visitorBadgeMatched}>
                    <Text style={styles.visitorBadgeMatchedText}>Visitor</Text>
                  </View>
                )}
              </View>
              <View style={styles.matchedVehicleDetailsRow}>
                <Text style={styles.matchedVehicleDetail}>
                  Model: <Text style={{ fontWeight: "700", color: "#0f5f3c" }}>{selectedVehicle.vehicle_model || vehicleType}</Text>
                </Text>
              </View>
            </View>
          ) : null}

          {/* Capture Entry Photo */}
          <Text style={styles.inputLabel}>Vehicle Verification Photo:</Text>
          {entryImage ? (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: entryImage.uri }} style={styles.imagePreview} />
              <TouchableOpacity style={styles.removeImageButton} onPress={() => setEntryImage(null)}>
                <Ionicons name="close-circle" size={28} color="#F44336" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.captureButton} onPress={captureImage} disabled={loading}>
              <Ionicons name="camera" size={24} color="#0f5f3c" />
              <Text style={styles.captureButtonText}>Capture Entry Image</Text>
            </TouchableOpacity>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleEntrySubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <MaterialCommunityIcons name="boom-gate-up" size={22} color="#fff" />
                <Text style={styles.submitButtonText}>Register Entry & Open Gate</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* PENDING VEHICLES LIST */}
        <View style={styles.listHeaderRow}>
          <Text style={styles.sectionTitle}>Vehicles Inside Quarry ({pendingVehicles.length})</Text>
          <TouchableOpacity onPress={fetchPendingList} disabled={fetchingList}>
            <Ionicons
              name="refresh-circle"
              size={26}
              color="#0f5f3c"
              style={fetchingList ? { transform: [{ rotate: "45deg" }] } : {}}
            />
          </TouchableOpacity>
        </View>

        {/* Filter Chips for Pending Vehicles */}
        {pendingVehicles.length > 0 && (
          <View style={styles.pendingFilterRow}>
            <TouchableOpacity
              style={[styles.pendingFilterChip, pendingFilter === "all" && styles.pendingFilterChipActive]}
              onPress={() => setPendingFilter("all")}
            >
              <Text style={[styles.pendingFilterText, pendingFilter === "all" && styles.pendingFilterTextActive]}>
                All ({pendingVehicles.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.pendingFilterChip, pendingFilter === "own" && styles.pendingFilterChipActive]}
              onPress={() => setPendingFilter("own")}
            >
              <Ionicons
                name="star"
                size={12}
                color={pendingFilter === "own" ? "#0f5f3c" : "#b38a2c"}
                style={{ marginRight: 3 }}
              />
              <Text style={[styles.pendingFilterText, pendingFilter === "own" && styles.pendingFilterTextActive]}>
                Own ({pendingVehicles.filter((v) => v.is_own === 1 || v.is_own === "1" || v.is_own === true).length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.pendingFilterChip, pendingFilter === "visitor" && styles.pendingFilterChipActive]}
              onPress={() => setPendingFilter("visitor")}
            >
              <Text style={[styles.pendingFilterText, pendingFilter === "visitor" && styles.pendingFilterTextActive]}>
                Visitor ({pendingVehicles.filter((v) => !v.is_own || v.is_own === 0 || v.is_own === "0").length})
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {fetchingList ? (
          <ActivityIndicator size="large" color="#0f5f3c" style={{ marginVertical: 30 }} />
        ) : pendingVehicles.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="check-all" size={48} color="#999" />
            <Text style={styles.emptyText}>All vehicles have exited the quarry.</Text>
          </View>
        ) : filteredPendingVehicles.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="filter-remove-outline" size={38} color="#999" />
            <Text style={styles.emptyText}>No vehicles match the selected filter.</Text>
          </View>
        ) : (
          <FlatList
            data={filteredPendingVehicles}
            renderItem={renderPendingItem}
            keyExtractor={(item, index) => item.id?.toString() || index.toString()}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          />
        )}
      </ScrollView>

      {/* WHEELER SELECTION MODAL */}
      <Modal
        visible={wheelerModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setWheelerModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choose Wheeler Type</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {wheelers.map((w) => (
                <TouchableOpacity
                  key={w}
                  style={[styles.modalItem, wheelerType === w && styles.modalItemActive]}
                  onPress={() => {
                    setWheelerType(w);
                    setWheelerModalVisible(false);
                  }}
                >
                  <Text style={[styles.modalItemText, wheelerType === w && styles.modalItemTextActive]}>
                    {w}
                  </Text>
                  {wheelerType === w && <Ionicons name="checkmark" size={20} color="#d4b262" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setWheelerModalVisible(false)}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
                  {exitVehicle?.is_own === 1 || exitVehicle?.is_own === "1" || exitVehicle?.is_own === true ? (
                    <View style={styles.exitOwnBadge}>
                      <Ionicons name="star" size={12} color="#99731e" style={{ marginRight: 3 }} />
                      <Text style={styles.exitOwnBadgeText}>Own Vehicle</Text>
                    </View>
                  ) : (
                    <View style={styles.exitVisitorBadge}>
                      <Text style={styles.exitVisitorBadgeText}>Visitor</Text>
                    </View>
                  )}

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
  scrollContainer: {
    padding: 15,
    paddingBottom: Platform.OS === "ios" ? 110 : 130,
  },
  heading: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    marginTop: 10,
    color: "#0f5f3c",
  },
  formCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 25,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingBottom: 8,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
    marginTop: 12,
  },
  typeSelectorRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  typeButton: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#f0f2f5",
    paddingVertical: 10,
    marginHorizontal: 3,
    borderRadius: 8,
  },
  typeButtonActive: {
    backgroundColor: "#0f5f3c",
  },
  typeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#555",
    marginTop: 4,
  },
  typeTextActive: {
    color: "#fff",
  },
  wheelerSection: {
    marginTop: 8,
  },
  dropdownTrigger: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#fafafa",
  },
  dropdownTriggerText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
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
    paddingVertical: 12,
    marginLeft: 8,
    color: "#333",
    fontWeight: "600",
  },
  captureButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#0f5f3c",
    borderStyle: "dashed",
    borderRadius: 10,
    padding: 18,
    backgroundColor: "rgba(15, 95, 60, 0.03)",
  },
  captureButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0f5f3c",
    marginLeft: 8,
  },
  imagePreviewContainer: {
    position: "relative",
    width: "100%",
    height: 180,
    borderRadius: 10,
    overflow: "hidden",
  },
  imagePreview: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  removeImageButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: 14,
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0f5f3c",
    borderRadius: 12,
    padding: 15,
    marginTop: 22,
    elevation: 2,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#fff",
    marginLeft: 8,
  },
  listHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#333",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardNumber: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#888",
    width: 22,
  },
  thumbWrap: {
    position: "relative",
    width: 44,
    height: 44,
    borderRadius: 8,
    overflow: "hidden",
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  thumb: {
    width: "100%",
    height: "100%",
  },
  thumbZoomIcon: {
    position: "absolute",
    bottom: 2,
    right: 2,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 4,
    padding: 1,
  },
  thumbPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: "rgba(15, 95, 60, 0.08)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  cardDetails: {
    flex: 1,
  },
  cardTruckText: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#333",
  },
  badgeInside: {
    backgroundColor: "#e8f5e9",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeInsideText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#2e7d32",
  },
  cardTypeText: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  cardMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  cardTimeText: {
    fontSize: 10,
    color: "#888",
  },
  cardDurationText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#0f5f3c",
  },
  cardActionRow: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  exitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  exitButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
    marginLeft: 4,
  },
  emptyContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 35,
    alignItems: "center",
    justifyContent: "center",
    elevation: 1,
  },
  emptyText: {
    fontSize: 13,
    color: "#777",
    marginTop: 10,
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
    maxHeight: "60%",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginBottom: 15,
    textAlign: "center",
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
  inputLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    marginBottom: 8,
  },
  refreshVehiclesBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: "rgba(15, 95, 60, 0.08)",
  },
  refreshVehiclesText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#0f5f3c",
    marginLeft: 4,
  },
  singleInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fafafa",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    paddingHorizontal: 12,
    height: 52,
  },
  singleInputWrapperFocused: {
    borderColor: "#0f5f3c",
    backgroundColor: "#fff",
  },
  singleInput: {
    flex: 1,
    fontSize: 15,
    marginLeft: 8,
    color: "#0f172a",
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  suggestionsContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    marginTop: 6,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
  },
  suggestionsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#f8fafc",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  suggestionsHeaderText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748b",
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  suggestionItemActive: {
    backgroundColor: "rgba(15, 95, 60, 0.08)",
  },
  miniIndBadge: {
    backgroundColor: "#003893",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    marginRight: 6,
  },
  miniIndText: {
    color: "#fff",
    fontSize: 7,
    fontWeight: "900",
  },
  suggestionRegText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
    letterSpacing: 0.5,
  },
  suggestionOwnBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  suggestionOwnText: {
    fontSize: 9,
    fontWeight: "700",
  },
  suggestionSubText: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2,
  },
  suggestionNewItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#f0f9ff",
  },
  suggestionNewTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0288d1",
  },
  suggestionNewSub: {
    fontSize: 10,
    color: "#64748b",
    marginTop: 2,
  },
  matchedVehicleBanner: {
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  matchedVehicleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  matchedVehicleTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#166534",
    marginLeft: 5,
  },
  ownBadgeMatched: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(212, 178, 98, 0.18)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(212, 178, 98, 0.4)",
  },
  ownBadgeMatchedText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#99731e",
  },
  visitorBadgeMatched: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  visitorBadgeMatchedText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748b",
  },
  matchedVehicleDetailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#dcfce7",
  },
  matchedVehicleDetail: {
    fontSize: 11,
    color: "#334155",
  },
  pendingOwnBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(212, 178, 98, 0.18)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(212, 178, 98, 0.4)",
  },
  pendingOwnBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#99731e",
  },
  pendingVisitorBadge: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  pendingVisitorBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748b",
  },
  pendingFilterRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
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
    backgroundColor: "rgba(15, 95, 60, 0.1)",
    borderColor: "#0f5f3c",
  },
  pendingFilterText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
  },
  pendingFilterTextActive: {
    color: "#0f5f3c",
    fontWeight: "700",
  },
  exitOwnBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(212, 178, 98, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(212, 178, 98, 0.5)",
  },
  exitOwnBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#99731e",
  },
  exitVisitorBadge: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  exitVisitorBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748b",
  },
});
