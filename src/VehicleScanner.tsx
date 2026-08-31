import { AntDesign, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import axios from "axios";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

  inputfocus.current?.focus();

  const companyId = "23"; // change dynamically if needed

  // ===== Fetch vehicle list =====
  const fetchVehicleList = async () => {
    try {
      const formData = new FormData();
      formData.append("company_id", companyId);

      const res = await axios.post(
        BASE_URL + "boomentryexitlist",
        formData,
        { headers: { "User-Agent": "DashboardApp" } }
      );
      if (res.data.success) {
        setVehicleList(res.data.data);
      }
    } catch (error) {
      console.error("Error fetching list:", error);
    }
  };

  useEffect(() => {
    fetchVehicleList();
  }, []);

  // ===== Compress Image =====
  const compressImage = async (uri: string) => {
    const manipResult = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 800 } }], // shrink large images
      { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
    );
    return manipResult;
  };

  // ===== Pick or Capture Image =====
  const pickImage = async (forExit = false) => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission Required", "Camera access is required!");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0,
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
    if (!vehicleNumber || !vehicleType) {
      Alert.alert("Validation", "Please select type and enter vehicle number");
      return;
    }

    if (!vehicleImage) {
      Alert.alert("Validation", "Please capture a vehicle image");
      return;
    }

    try {
      setLoading(true);
      const now = new Date().toISOString().slice(0, 19).replace("T", " ");
      const formData: any = new FormData();
      formData.append("company_id", companyId);
      formData.append("truck", vehicleNumber);
      formData.append("vehicle_type", vehicleType);
      formData.append("entry_datetime", now);
      formData.append("created", now);

      formData.append("entry_image", {
        uri: vehicleImage.uri,
        type: "image/jpeg",
        name: "vehicle.jpg",
      } as any);

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

      if (res.data.status === "success") {
        Alert.alert("✅ Success", "Entry saved successfully!");
        setVehicleNumber("");
        setVehicleType("");
        setVehicleImage(null);
        fetchVehicleList();
      } else {
        Alert.alert("❌ Error", res.data.message || "Failed to save entry");
      }
    } catch (error) {
      console.error("Error saving entry:", error);
      Alert.alert("Error", "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // ===== Exit Vehicle =====
  const handleExit = async () => {
    if (!selectedVehicle) return;
    if (!exitImage) {
      Alert.alert("Validation", "Please capture an exit image first!");
      return;
    }

    try {
      setLoading(true);
      const now = new Date().toISOString().slice(0, 19).replace("T", " ");
      const formData: any = new FormData();
      formData.append("company_id", selectedVehicle.company_id);
      formData.append("truck", selectedVehicle.truck);
      formData.append("vehicle_type", selectedVehicle.vehicle_type);
      formData.append("exit_datetime", now);

      formData.append("exit_image", {
        uri: exitImage.uri,
        type: "image/jpeg",
        name: "exit.jpg",
      } as any);

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
        Alert.alert("✅ Success", res.data.message || "Vehicle exited successfully!");
        setModalVisible(false);
        setSelectedVehicle(null);
        setExitImage(null);
        fetchVehicleList();
      } else {
        Alert.alert("❌ Error", res.data.message || "Failed to mark exit");
      }
    } catch (error: any) {
      console.error("❌ Exit error:", error?.response?.data || error.message);
      Alert.alert("Error", "Something went wrong while marking exit");
    } finally {
      setLoading(false);
    }
  };

  // ===== Vehicle Number Validation =====
  const handleVehicleInput = (text: string) => {
    let formatted = text.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (formatted.length <= 10) {
      setVehicleNumber(formatted);
    }
  };

  // ===== Vehicle List Item =====
const renderItem = ({ item, index }: any) => {
  const isExited = item.exit_datetime !== null;

  return (
    <TouchableOpacity
      style={[
        styles.listCard,
        { borderLeftColor: isExited ? "#28a745" : "#dc3545" },
      ]}
      onPress={() => {
        if (!isExited) {
          setSelectedVehicle(item);
          pickImage(true);
          setModalVisible(true);
          
        }
      }}
    >
      <View style={styles.rowContent}>
        <Text style={styles.index}>{index + 1}</Text>

        <View style={styles.infoBlock}>
          <Text style={styles.vehicleType}>{item.vehicle_type}</Text>
          <Text style={styles.truck}>{item.truck}</Text>
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
            {isExited ? "Exited" : "Pending"}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};
  return (
    <ScrollView style={styles.container}>
      <AntDesign name="arrowleft" size={24} color="black" style={{marginTop:20, paddingLeft:10}} onPress={()=>router.push('/profile')}/>
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
      <Text style={styles.subText}>Vehicle Number:</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter Vehicle Number"
        value={vehicleNumber}
        onChangeText={handleVehicleInput}
        autoCapitalize="characters"
        maxLength={10}
        ref={inputfocus}
      />

      {/* Capture Entry Image */}
      <Text style={styles.subText}>Capture Vehicle Image:</Text>
      <TouchableOpacity style={styles.captureButton} onPress={() => pickImage()}>
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
          <Text style={styles.buttonText}>Submit</Text>
        )}
      </TouchableOpacity>

      {/* Vehicle List */}
    {vehicleList.length > 0 && (
  <View style={{ marginTop: 20 }}>
    <Text style={styles.sectionTitle}>Vehicle Entries</Text>
    <FlatList
      data={vehicleList}
      keyExtractor={(item) => item.id.toString()}
      renderItem={renderItem}
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      contentContainerStyle={{ paddingBottom: 20 }}
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
            <Text style={{ fontSize: 16, marginBottom: 15 }}>
              Exit Vehicle: {selectedVehicle?.truck} ?
            </Text>

            <TouchableOpacity
              style={[styles.captureButton, { marginBottom: 10 }]}
              onPress={() => pickImage(true)}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {exitImage ? "Retake Exit Image" : "📷 Capture Exit Image"}
              </Text>
            </TouchableOpacity>

            {exitImage && (
              <Image
                source={{ uri: exitImage.uri }}
                style={{ width: 120, height: 120, marginBottom: 15, borderRadius: 8 }}
              />
            )}

            <View style={{ flexDirection: "row", justifyContent: "space-around" }}>
              <TouchableOpacity
                style={[
                  styles.button,
                  {
                    backgroundColor: exitImage ? "green" : "gray",
                    flex: 1,
                    marginRight: 5,
                  },
                ]}
                onPress={handleExit}
                disabled={!exitImage || loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Exit</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.button,
                  { backgroundColor: "red", flex: 1, marginLeft: 5 },
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
  },
  subText: { marginVertical: 8, fontSize: 16, fontWeight: "500", marginLeft: 5 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
    backgroundColor: "#fff",
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  captureButton: {
    backgroundColor: "#FF9500",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 5,
  },
sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 15,
    color: "#222",
  },
  listCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 15,
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
    width: 30,
    textAlign: "center",
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
    color: "#777",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  badgeText: {
    marginLeft: 5,
    fontSize: 13,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    width: "80%",
    backgroundColor: "#fff",
    borderRadius: 10,
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
    marginHorizontal: 5,
  },
  typeButtonActive: {
    backgroundColor: "#007AFF",
  },
  typeText: { marginTop: 5, fontSize: 12, fontWeight: "600", color: "#333" },
});
