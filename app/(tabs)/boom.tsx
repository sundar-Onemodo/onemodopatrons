import { BASE_URL } from "@/src/components/BaseUrlApi";
import { RootState } from "@/src/store/store";
import {
  AntDesign,
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
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
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSelector } from "react-redux";

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
  const { companyId } = useSelector((state: RootState) => state.auth);

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
        Alert.alert(
          "✅ Success",
          res.data.message || "Vehicle exited successfully!"
        );
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
    <SafeAreaView style={styles.container}>
      <View
        style={{
          backgroundColor: "#f9f9f9",
          flex: 1,
          paddingBottom: 60,
          padding: 10,
        }}
      >
        <ScrollView>
          <AntDesign
            name="arrowleft"
            size={24}
            color="black"
            style={{ marginTop: 20, paddingLeft: 10 }}
            onPress={() => router.push("/(tabs)")}
          />
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
          <TouchableOpacity
            style={styles.captureButton}
            onPress={() => pickImage()}
          >
            <Text style={styles.buttonText}>📷 Capture Image</Text>
          </TouchableOpacity>
          {vehicleImage && (
            <Image
              source={{ uri: vehicleImage.uri }}
              style={{
                width: "100%",
                height: 200,
                marginVertical: 10,
                borderRadius: 10,
              }}
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
                    style={{
                      width: 120,
                      height: 120,
                      marginBottom: 15,
                      borderRadius: 8,
                    }}
                  />
                )}

                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-around",
                  }}
                >
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
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // padding: 5,
    // backgroundColor: "#f9f9f9" ,
  },
  heading: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    marginTop: 10,
  },
  subText: {
    marginVertical: 8,
    fontSize: 16,
    fontWeight: "500",
    marginLeft: 5,
  },
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

// Calculator.tsx

// import { Picker } from "@react-native-picker/picker";
// import React, { useRef, useState } from "react";
// import {
//     PanResponder,
//     SafeAreaView,
//     StyleSheet,
//     Text,
//     TouchableOpacity,
//     View,
// } from "react-native";

// export default function App() {
//   const [input, setInput] = useState("");
//   const [result, setResult] = useState("");
//   const [gstRate, setGstRate] = useState(18); // default GST %

//   // PanResponder for swipe delete
//   const panResponder = useRef(
//     PanResponder.create({
//       onMoveShouldSetPanResponder: (_, gesture) => {
//         // detect swipe (horizontal movement more than 30)
//         return Math.abs(gesture.dx) > 30;
//       },
//       onPanResponderRelease: (_, gesture) => {
//         if (gesture.dx < -30 || gesture.dx > 30) {
//           // remove last digit on swipe left OR right
//           setInput((prev) => prev.slice(0, -1));
//         }
//       },
//     })
//   ).current;

//   const handlePress = (value: string) => {
//     if (value === "C") {
//       setInput("");
//       setResult("");
//     } else if (value === "=") {
//       try {
//         setResult(eval(input).toString());
//       } catch (error) {
//         setResult("Error");
//       }
//     } else if (value === "GST") {
//       try {
//         const num = parseFloat(input || "0");
//         const gstValue = (num * (1 + gstRate / 100)).toFixed(2);
//         setResult(gstValue.toString());
//       } catch {
//         setResult("Error");
//       }
//     } else if (value === "%") {
//       try {
//         const num = parseFloat(input || "0");
//         const percentValue = (num / 100).toString();
//         setResult(percentValue);
//       } catch {
//         setResult("Error");
//       }
//     } else {
//       setInput((prev) => prev + value);
//     }
//   };

//   const buttons = [
//     ["C", "%", "GST", "/"],
//     ["7", "8", "9", "*"],
//     ["4", "5", "6", "-"],
//     ["1", "2", "3", "+"],
//     ["0", ".", "="],
//   ];

//   return (
//     <SafeAreaView style={styles.container}>
//       {/* GST Selector */}
//       <View style={styles.gstSelector}>
//         <Text style={styles.gstLabel}>GST %: </Text>
//         <Picker
//           selectedValue={gstRate}
//           style={styles.picker}
//           dropdownIconColor="#fff"
//           onValueChange={(value) => setGstRate(value)}
//         >
//           <Picker.Item label="5%" value={5} style={{color:'#000'}}/>
//           <Picker.Item label="12%" value={12} />
//           <Picker.Item label="18%" value={18} />
//           <Picker.Item label="28%" value={28} />
//         </Picker>
//       </View>

//       {/* Display (with swipe gesture) */}
//       <View style={styles.display} {...panResponder.panHandlers}>
//         <Text style={styles.inputText}>{input}</Text>
//         <Text style={styles.resultText}>{result}</Text>
//         {/* <Text style={styles.hintText}>⬅️ Swipe to delete last digit ➡️</Text> */}
//       </View>

//       {/* Buttons */}
//       <View style={styles.buttons}>
//         {buttons.map((row, rowIndex) => (
//           <View key={rowIndex} style={styles.row}>
//             {row.map((btn) => {
//               const isOperator = ["/", "*", "-", "+", "="].includes(btn);
//               const isSpecial = ["C", "GST", "%"].includes(btn);

//               return (
//                 <TouchableOpacity
//                   key={btn}
//                   style={[
//                     styles.button,
//                     btn === "0" ? styles.buttonZero : null,
//                     isOperator ? styles.operatorButton : null,
//                     isSpecial ? styles.specialButton : null,
//                   ]}
//                   onPress={() => handlePress(btn)}
//                 >
//                   <Text
//                     style={[
//                       styles.buttonText,
//                       isOperator ? styles.operatorText : null,
//                       isSpecial ? styles.specialText : null,
//                     ]}
//                   >
//                     {btn}
//                   </Text>
//                 </TouchableOpacity>
//               );
//             })}
//           </View>
//         ))}
//       </View>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: "#000",
//     justifyContent: "flex-end",
//     paddingBottom:50
//   },
//   gstSelector: {
//     flexDirection: "row",
//     alignItems: "center",
//     paddingHorizontal: 15,
//     paddingTop: 0,
//   },
//   gstLabel: {
//     fontSize: 18,
//     color: "#fff",
//     marginRight: 10,
//   },
//   picker: {
//     height: 40,
//     width: 120,
//     color: "#fff",
//     backgroundColor: "#fff",
//     borderRadius: 8,
//   },
//   display: {
//     padding: 20,
//     alignItems: "flex-end",
//   },
//   inputText: {
//     fontSize: 28,
//     color: "#fff",
//     marginBottom: 6,
//   },
//   resultText: {
//     fontSize: 38,
//     fontWeight: "bold",
//     color: "#FFD700",
//   },
//   hintText: {
//     fontSize: 12,
//     color: "#666",
//     marginTop: 5,
//   },
//   buttons: {
//     paddingBottom: 80,
//   },
//   row: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     marginVertical: 6,
//     paddingHorizontal: 10,
//   },
//   button: {
//     width: 65,
//     height: 65,
//     borderRadius: 32,
//     backgroundColor: "#333",
//     justifyContent: "center",
//     alignItems: "center",
//     marginHorizontal: 4,
//   },
//   buttonZero: {
//     width: 140,
//     alignItems: "flex-start",
//     paddingLeft: 25,
//   },
//   operatorButton: {
//     backgroundColor: "#ff9500",
//   },
//   specialButton: {
//     backgroundColor: "#a5a5a5",
//   },
//   buttonText: {
//     fontSize: 22,
//     color: "#fff",
//     fontWeight: "600",
//   },
//   operatorText: {
//     color: "#fff",
//   },
//   specialText: {
//     color: "#000",
//   },
// });
