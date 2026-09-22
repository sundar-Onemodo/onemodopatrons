import { fetchAndSaveBoomSettings, triggerRemoteDoorOpen } from "@/src/utils/doorController";
import { AntDesign, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import axios from "axios";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import moment from "moment";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { BASE_URL } from "./components/BaseUrlApi";
import { GateStatusModal, GateStatusModalProps } from "./components/GateStatusModal";
import { formatVehiclePlate, normalizeVehicleInput } from "./utils/vehicleFormatter";

export default function VehicleInOut() {
  const [vehicleType, setVehicleType] = useState("Car");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [vehicleList, setVehicleList] = useState<any[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [vehicleImage, setVehicleImage] = useState<any>(null);
  const [exitImage, setExitImage] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const inputfocus = React.useRef<TextInput>(null);

  // Premium Status / Feedback Modal
  const [statusModal, setStatusModal] = useState<GateStatusModalProps>({
    visible: false,
    type: "entry_success",
    title: "",
    onClose: () => setStatusModal((prev) => ({ ...prev, visible: false })),
  });

  const companyId = "23"; // change dynamically if needed

  // ===== Fetch vehicle pending list via GET =====
  const fetchVehicleList = async () => {
    try {
      const res = await axios.get(
        BASE_URL + "boompendinglist",
        {
          params: { company_id: companyId, limit: 50, offset: 0 },
          headers: { "User-Agent": "DashboardApp" }
        }
      );
      if (res.data.status === "success" || res.data.success) {
        setVehicleList(res.data.data || []);
      }
    } catch (error) {
      console.error("Error fetching list:", error);
    }
  };

  useEffect(() => {
    fetchVehicleList();
    fetchAndSaveBoomSettings(companyId);
  }, []);

  // ===== Compress Image =====
  const compressImage = async (uri: string) => {
    const manipResult = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 800 } }],
      { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
    );
    return manipResult;
  };

  // ===== Pick or Capture Image =====
  const pickImage = async (forExit = false) => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setStatusModal({
        visible: true,
        type: "error",
        title: "Permission Required",
        subtitle: "Camera access is required to capture vehicle image.",
        onClose: () => setStatusModal((prev) => ({ ...prev, visible: false })),
      });
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });

    if (!result.canceled) {
      const compressed = await compressImage(result.assets[0].uri);
      if (forExit) {
        setExitImage(compressed);
      } else {
        setVehicleImage(compressed);
      }
    }
  };

  // ===== Submit Entry =====
  const handleSubmit = async () => {
    if (!vehicleNumber.trim() || !vehicleType) {
      setStatusModal({
        visible: true,
        type: "error",
        title: "Validation Error",
        subtitle: "Please select vehicle type and enter a valid registration number (e.g. TN 59 AK 0001).",
        onClose: () => setStatusModal((prev) => ({ ...prev, visible: false })),
      });
      return;
    }

    const formattedTruck = formatVehiclePlate(vehicleNumber);
    setVehicleNumber(formattedTruck);

    try {
      setLoading(true);
      const now = moment().format("YYYY-MM-DD HH:mm:ss");
      const formData: any = new FormData();
      formData.append("company_id", companyId);
      formData.append("truck", formattedTruck);
      formData.append("vehicle_type", vehicleType);
      formData.append("entry_datetime", now);

      if (vehicleImage?.uri) {
        formData.append("entry_image", {
          uri: vehicleImage.uri,
          type: "image/jpeg",
          name: "vehicle.jpg",
        } as any);
      }

      const res = await axios.post(
        BASE_URL + "boomentry",
        formData,
        {
          headers: {
            "User-Agent": "DashboardApp",
            "Content-Type": "multipart/form-data",
          },
          timeout: 60000,
        }
      );

      if (res.data.status === "success" || res.data.success) {
        const doorResult = await triggerRemoteDoorOpen({
          truck: formattedTruck,
          action: "Register Entry",
          type: "entry",
          companyId: companyId || 23,
        });

        setStatusModal({
          visible: true,
          type: "entry_success",
          title: "Gate Entry Recorded",
          subtitle: res.data.message || "Vehicle registration completed and recorded inside quarry.",
          truck: formattedTruck,
          vehicleType: vehicleType,
          timeText: moment(now).format("DD MMM, hh:mm A"),
          barrierSuccess: doorResult.success,
          barrierMessage: doorResult.success
            ? "Boom barrier OPEN command triggered successfully ✅"
            : `Boom barrier: ${doorResult.error || "Controller unreachable on local network"}`,
          imageUri: vehicleImage?.uri,
          onClose: () => setStatusModal((prev) => ({ ...prev, visible: false })),
        });

        setVehicleNumber("");
        setVehicleType("Car");
        setVehicleImage(null);
        fetchVehicleList();
      } else if (res.data.status === "error") {
        setStatusModal({
          visible: true,
          type: "error",
          title: "Entry Failed",
          subtitle: res.data.message || "Failed to record entry.",
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
      console.error("Error saving entry:", error);
      const msg = error?.response?.data?.message || "Something went wrong. Please try again.";
      setStatusModal({
        visible: true,
        type: "error",
        title: "Submission Error",
        subtitle: msg,
        truck: formattedTruck,
        onClose: () => setStatusModal((prev) => ({ ...prev, visible: false })),
      });
    } finally {
      setLoading(false);
    }
  };

  // ===== Exit Vehicle =====
  const handleExit = async () => {
    if (!selectedVehicle) return;

    try {
      setLoading(true);
      const now = moment().format("YYYY-MM-DD HH:mm:ss");
      const formData: any = new FormData();
      const barcodeVal = selectedVehicle.exit_barcode || selectedVehicle.barcode;
      if (barcodeVal) {
        formData.append("barcode", String(barcodeVal).trim());
      }

      if (exitImage?.uri) {
        formData.append("exit_image", {
          uri: exitImage.uri,
          type: "image/jpeg",
          name: "exit.jpg",
        } as any);
      }

      const res = await axios.post(
        BASE_URL + "boomexit",
        formData,
        {
          headers: {
            "User-Agent": "DashboardApp",
            "Content-Type": "multipart/form-data",
          },
          timeout: 60000,
        }
      );

      if (res.data.status === "success" || res.data.success) {
        const doorResult = await triggerRemoteDoorOpen({
          truck: selectedVehicle.truck,
          action: "Vehicle Exit",
          type: "exit",
          companyId: selectedVehicle.company_id || companyId || 23,
        });

        const truckName = selectedVehicle.truck;
        const vType = selectedVehicle.vehicle_type;
        const dur = selectedVehicle.duration_formatted || (selectedVehicle.duration_minutes ? `${selectedVehicle.duration_minutes}m` : undefined);
        const imgUri = exitImage?.uri;

        setModalVisible(false);
        setSelectedVehicle(null);
        setExitImage(null);
        fetchVehicleList();

        setStatusModal({
          visible: true,
          type: "exit_success",
          title: "Vehicle Exit Completed",
          subtitle: res.data.message || "Vehicle marked as exited and gate open command triggered.",
          truck: truckName,
          vehicleType: vType,
          duration: dur,
          imageUri: imgUri,
          barrierSuccess: doorResult.success,
          barrierMessage: doorResult.success
            ? "Boom barrier OPEN command triggered successfully ✅"
            : `Boom barrier: ${doorResult.error || "Controller unreachable on local network"}`,
          onClose: () => setStatusModal((prev) => ({ ...prev, visible: false })),
        });
      } else {
        setStatusModal({
          visible: true,
          type: "error",
          title: "Exit Failed",
          subtitle: res.data.message || "Failed to mark exit.",
          truck: selectedVehicle?.truck,
          onClose: () => setStatusModal((prev) => ({ ...prev, visible: false })),
        });
      }
    } catch (error: any) {
      console.error("❌ Exit error:", error?.response?.data || error.message);
      setStatusModal({
        visible: true,
        type: "error",
        title: "Exit Network Error",
        subtitle: error?.response?.data?.message || "Something went wrong while marking exit.",
        truck: selectedVehicle?.truck,
        onClose: () => setStatusModal((prev) => ({ ...prev, visible: false })),
      });
    } finally {
      setLoading(false);
    }
  };

  // ===== Vehicle Number Validation =====
  const handleVehicleInput = (text: string) => {
    const cleaned = normalizeVehicleInput(text);
    setVehicleNumber(cleaned);
  };

  const handleBlur = () => {
    if (vehicleNumber.trim()) {
      setVehicleNumber(formatVehiclePlate(vehicleNumber));
    }
  };

  // ===== Vehicle List Item =====
  const renderItem = ({ item, index }: any) => {
    const isExited = item.status === 1 || (item.exit_datetime !== null && item.exit_datetime !== undefined);
    const duration = item.duration_formatted || (item.duration_minutes ? `${item.duration_minutes}m` : "--");

    return (
      <TouchableOpacity
        style={[
          styles.listCard,
          { borderLeftColor: isExited ? "#28a745" : "#dc3545" },
        ]}
        onPress={() => {
          if (!isExited) {
            setSelectedVehicle(item);
            setModalVisible(true);
          }
        }}
      >
        <View style={styles.rowContent}>
          <Text style={styles.index}>{index + 1}</Text>

          {item.entry_image_url ? (
            <Image source={{ uri: item.entry_image_url }} style={styles.listThumb} />
          ) : null}

          <View style={styles.infoBlock}>
            <Text style={styles.vehicleType}>{item.vehicle_type}</Text>
            <Text style={styles.truck}>{item.truck}</Text>
            <Text style={styles.durationText}>⏱️ {duration}</Text>
          </View>

          <View
            style={[
              styles.badge,
              { backgroundColor: isExited ? "#d4edda" : "#f8d7da" },
            ]}
          >
            <Ionicons
              name={isExited ? "checkmark-circle" : "time"}
              size={18}
              color={isExited ? "#28a745" : "#dc3545"}
            />
            <Text
              style={[
                styles.badgeText,
                { color: isExited ? "#28a745" : "#dc3545" },
              ]}
            >
              {item.status_label || (isExited ? "Exited" : "Inside")}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <AntDesign name={"arrowleft" as any} size={24} color="black" style={{ marginTop: 20, paddingLeft: 10 }} onPress={() => router.push('/profile' as any)} />
      <Text style={styles.heading}>🚧 Vehicle IN / OUT 🚧</Text>

      {/* Vehicle Type Toggle with Icons */}
      <Text style={styles.subText}>Select Vehicle Type:</Text>
      <View style={styles.typeToggle}>
        {[
          { label: "Car", icon: "car" },
          { label: "Bike", icon: "motorbike" },
          { label: "Truck", icon: "truck" },
          { label: "Others", icon: "dots-horizontal" },
        ].map((opt) => (
          <TouchableOpacity
            key={opt.label}
            style={[
              styles.typeButton,
              vehicleType === opt.label && styles.typeButtonActive,
            ]}
            onPress={() => setVehicleType(opt.label)}
          >
            <MaterialCommunityIcons
              name={opt.icon as any}
              size={28}
              color={vehicleType === opt.label ? "#fff" : "#555"}
            />
            <Text
              style={[
                styles.typeText,
                vehicleType === opt.label && { color: "#fff" },
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Vehicle Number */}
      <Text style={styles.subText}>Vehicle Registration Number:</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. TN 59 AK 0001"
        value={vehicleNumber}
        onChangeText={handleVehicleInput}
        onBlur={handleBlur}
        autoCapitalize="characters"
        maxLength={16}
        ref={inputfocus}
      />

      {/* Capture Entry Image */}
      <Text style={styles.subText}>Capture Vehicle Image:</Text>
      <TouchableOpacity style={styles.captureButton} onPress={() => pickImage(false)}>
        <Text style={styles.buttonText}>📷 Capture Image</Text>
      </TouchableOpacity>
      {vehicleImage && (
        <Image
          source={{ uri: vehicleImage.uri }}
          style={{ width: "100%", height: 200, marginVertical: 10, borderRadius: 10 }}
          resizeMode="cover"
        />
      )}

      {/* Submit */}
      <TouchableOpacity
        style={styles.button}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Register Entry</Text>
        )}
      </TouchableOpacity>

      {/* Vehicle List */}
      {vehicleList.length > 0 && (
        <View style={{ marginTop: 20 }}>
          <Text style={styles.sectionTitle}>Vehicles Inside Quarry ({vehicleList.length})</Text>
          <FlatList
            data={vehicleList}
            keyExtractor={(item) => item.id?.toString()}
            renderItem={renderItem}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            contentContainerStyle={{ paddingBottom: 40 }}
          />
        </View>
      )}

      {/* Exit Confirmation Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={{ fontSize: 16, fontWeight: "bold", marginBottom: 15, textAlign: "center" }}>
              Exit Vehicle: {selectedVehicle?.truck}
            </Text>

            <TouchableOpacity
              style={[styles.captureButton, { marginBottom: 10 }]}
              onPress={() => pickImage(true)}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {exitImage ? "Retake Exit Image" : "📷 Optional Exit Image"}
              </Text>
            </TouchableOpacity>

            {exitImage && (
              <Image
                source={{ uri: exitImage.uri }}
                style={{ width: 120, height: 120, marginBottom: 15, borderRadius: 8, alignSelf: "center" }}
              />
            )}

            <View style={{ flexDirection: "row", justifyContent: "space-around" }}>
              <TouchableOpacity
                style={[
                  styles.button,
                  {
                    backgroundColor: "#28a745",
                    flex: 1,
                    marginRight: 5,
                  },
                ]}
                onPress={handleExit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Confirm Exit</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.button,
                  { backgroundColor: "#dc3545", flex: 1, marginLeft: 5 },
                ]}
                onPress={() => {
                  setModalVisible(false);
                  setExitImage(null);
                }}
                disabled={loading}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* PREMIUM GATE STATUS & FEEDBACK MODAL */}
      <GateStatusModal {...statusModal} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: "#f9f9f9" },
  heading: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    marginTop: 10,
    color: "#0f5f3c",
  },
  subText: { marginVertical: 8, fontSize: 14, fontWeight: "600", color: "#444" },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    backgroundColor: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  button: {
    backgroundColor: "#0f5f3c",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: { color: "#fff", fontSize: 15, fontWeight: "bold" },
  captureButton: {
    backgroundColor: "#d4b262",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 15,
    color: "#222",
  },
  listCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 5,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    elevation: 3,
  },
  rowContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  index: {
    fontSize: 14,
    fontWeight: "600",
    color: "#555",
    width: 24,
    textAlign: "center",
  },
  listThumb: {
    width: 40,
    height: 40,
    borderRadius: 6,
    marginLeft: 6,
  },
  infoBlock: {
    flex: 1,
    marginLeft: 10,
  },
  vehicleType: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  truck: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#0f5f3c",
  },
  durationText: {
    fontSize: 10,
    color: "#888",
    marginTop: 2,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 20,
  },
  badgeText: {
    marginLeft: 4,
    fontSize: 11,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    width: "85%",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 20,
  },
  typeToggle: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  typeButton: {
    flex: 1,
    alignItems: "center",
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#eee",
    marginHorizontal: 4,
  },
  typeButtonActive: {
    backgroundColor: "#0f5f3c",
  },
  typeText: { marginTop: 5, fontSize: 12, fontWeight: "600", color: "#333" },
});
