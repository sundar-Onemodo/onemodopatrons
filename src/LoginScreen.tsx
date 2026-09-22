import {
  setAuthToken,
  setCompanyId,
  setEmailId,
  setEmployeeId,
  setphNumber,
  setShifthours,
  setUserName,
} from "@/src/store/authSlice";
import { Feather } from "@expo/vector-icons";
import axios from "axios";
import { decode as base64Decode } from "base-64";
import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useDispatch } from "react-redux";
import { BASE_URL } from "./components/BaseUrlApi";
import { fetchAndSaveBoomSettings } from "./utils/doorController";

// ✅ Proper JWT payload decoder
const decryptToken = (token: string) => {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) throw new Error("Invalid token format");
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(
      base64.length + (4 - (base64.length % 4)) % 4,
      "="
    );
    const jsonPayload = base64Decode(padded);
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error("Token decoding failed:", error);
    return null;
  }
};

export default function LoginFlow() {
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [numberError, setNumberError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const dispatch = useDispatch();

  const handleLogin = async () => {
    Keyboard.dismiss();
    setNumberError(false);

    if (mobile.length !== 10 || !password) {
      setNumberError(true);
      return;
    }

    try {
      const formData = new FormData();
      formData.append("username", mobile);
      formData.append("password", password);

      const response = await axios.post(BASE_URL + "employeeLogin", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          "User-Agent": "DashboardApp",
        },
      });

      const data = response.data;
      console.log("Login Response:", data);

      if (data?.token) {
        const payload = decryptToken(data.token);

        if (payload) {
          dispatch(setphNumber(data.employee.phone || mobile));
          dispatch(setUserName(payload.name || data.employee.name || ""));
          dispatch(setEmailId(data.employee.id || ""));
          dispatch(setCompanyId(payload.company_id));
          dispatch(setShifthours(data.employee.shift_hour || ""));
          dispatch(setEmployeeId(payload.employee_id));
          dispatch(setAuthToken(data.token));

          // Prefetch and cache boom settings in background
          fetchAndSaveBoomSettings(payload.company_id, data.token);

          console.log("Decoded Token Payload:", payload);
          if (data.valid.is_login === "SetPassword") {
            router.push("/showcreatepassword");
          } else {
            router.push("/(tabs)");
          }
        } else {
          Alert.alert("Error", "Invalid token structure.");
        }
      } else {
        Alert.alert("Login Failed", "Invalid credentials or missing token.");
      }
    } catch (error) {
      console.error("Login Error:", error);
      Alert.alert("Error", "Something went wrong. Please try again later.");
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={{ flex: 1, backgroundColor: "#fff" }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
            <View style={styles.container}>
              {/* Header */}
              <Text style={styles.appTitle}>Onemodo Patrons</Text>
              <Text style={styles.subtitle}>Login to continue</Text>

              {/* Login Card */}
              <View style={styles.loginCard}>
                {/* Mobile Input */}
                <View style={styles.inputWrapper}>
                  <Feather
                    name="phone"
                    size={20}
                    color="#666"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Mobile Number"
                    keyboardType="phone-pad"
                    maxLength={10}
                    value={mobile}
                    onChangeText={(text) => {
                      setMobile(text);
                      setNumberError(false);
                    }}
                  />
                </View>

                {/* Password Input */}
                <View style={styles.inputWrapper}>
                  <Feather
                    name="lock"
                    size={20}
                    color="#666"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Password"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={(text) => setPassword(text)}
                  />
                  <TouchableOpacity
                    style={styles.eyeIcon}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Feather
                      name={showPassword ? "eye" : "eye-off"}
                      size={20}
                      color="#666"
                    />
                  </TouchableOpacity>
                </View>

                {numberError && (
                  <Text style={styles.errorText}>
                    Please enter valid credentials
                  </Text>
                )}

                {/* Login Button */}
                <TouchableOpacity style={styles.button} onPress={handleLogin}>
                  <Text style={styles.buttonText}>Login</Text>
                </TouchableOpacity>

                {/* Forgot Password */}
                {/* <TouchableOpacity style={{ marginTop: 12 }}>
                  <Text style={styles.forgotText}>Forgot Password?</Text>
                </TouchableOpacity> */}
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#111",
    alignSelf: "center",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: "#666",
    alignSelf: "center",
    marginBottom: 30,
  },
  loginCard: {
    backgroundColor: "#fdfdfd",
    borderRadius: 16,
    padding: 24,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 15,
    backgroundColor: "#fafafa",
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
  },
  eyeIcon: {
    marginLeft: 8,
  },
  errorText: {
    color: "red",
    marginBottom: 8,
    marginLeft: 4,
  },
  button: {
    marginTop: 10,
    borderRadius: 12,
    backgroundColor: "#2575fc",
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
  },
  forgotText: {
    color: "#2575fc",
    fontSize: 14,
    textAlign: "center",
    fontWeight: "500",
  },
});
