import {
  setAuthToken,
  setCompanyId,
  setEmailId,
  setEmployeeId,
  setphNumber,
  setShifthours,
  setUserName,
} from "@/src/store/authSlice";
import { Feather, Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { decode as base64Decode } from "base-64";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch } from "react-redux";
import { BASE_URL } from "./components/BaseUrlApi";
import { fetchAndSaveBoomSettings } from "./utils/doorController";

const { width } = Dimensions.get("window");

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
  const insets = useSafeAreaInsets();
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [mobileError, setMobileError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState<"mobile" | "password" | null>(null);

  const mobileInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const dispatch = useDispatch();

  const handleLogin = async () => {
    Keyboard.dismiss();
    setMobileError(null);
    setPasswordError(null);
    setServerError(null);

    const cleanMobile = mobile.trim();
    let hasError = false;

    if (!cleanMobile) {
      setMobileError("Please enter your 10-digit mobile number.");
      mobileInputRef.current?.focus();
      hasError = true;
    } else if (cleanMobile.length !== 10) {
      setMobileError("Mobile number must be exactly 10 digits.");
      mobileInputRef.current?.focus();
      hasError = true;
    }

    if (!password.trim()) {
      setPasswordError("Please enter your password.");
      if (!hasError) passwordInputRef.current?.focus();
      hasError = true;
    }

    if (hasError) return;

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("username", cleanMobile);
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
          dispatch(setphNumber(data.employee?.phone || cleanMobile));
          dispatch(setUserName(payload.name || data.employee?.name || ""));
          dispatch(setEmailId(data.employee?.id || ""));
          dispatch(setCompanyId(payload.company_id));
          dispatch(setShifthours(data.employee?.shift_hour || ""));
          dispatch(setEmployeeId(payload.employee_id));
          dispatch(setAuthToken(data.token));

          // Prefetch and cache boom settings in background
          fetchAndSaveBoomSettings(payload.company_id, data.token);

          console.log("Decoded Token Payload:", payload);
          if (data.valid?.is_login === "SetPassword") {
            router.push("/showcreatepassword");
          } else {
            router.push("/(tabs)");
          }
        } else {
          setServerError("Authentication token structure is invalid.");
        }
      } else {
        setServerError(
          data?.message || "Invalid mobile number or password. Please try again."
        );
      }
    } catch (error: any) {
      console.error("Login Error:", error);
      const serverMsg =
        error?.response?.data?.message ||
        error?.message ||
        "Unable to connect to login server. Please check your internet connection.";
      setServerError(serverMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screenContainer}>
      <StatusBar style="light" backgroundColor="#03140c" />

      {/* Top Header Background Gradient */}
      <LinearGradient
        colors={["#03140c", "#072a1a", "#0f5f3c"]}
        style={[styles.headerGradient, { paddingTop: insets.top + 16 }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Hero Branding */}
        <View style={styles.brandingWrapper}>
          <View style={styles.iconGlowWrapper}>
            <View style={styles.iconContainer}>
              <Image
                source={require("@/assets/images/app_icon.png")}
                style={styles.logoImage}
                resizeMode="cover"
              />
            </View>
          </View>

          <View style={styles.statusPill}>
            <View style={styles.onlineDot} />
            <Text style={styles.statusPillText}>TERMINAL ONLINE</Text>
          </View>

          <Text style={styles.brandTitle}>PATRONS GATE</Text>
          <Text style={styles.brandSubtitle}>
            Smart Quarry Logistics & Barrier Control
          </Text>
        </View>
      </LinearGradient>

      {/* Form Card Content */}
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Sign In</Text>
              <Text style={styles.cardSubtitle}>
                Enter your credentials to manage gate terminal
              </Text>
            </View>

            {/* Mobile Input Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Mobile Number</Text>
              <Pressable
                style={[
                  styles.inputFieldContainer,
                  focusedInput === "mobile" && styles.inputFieldFocused,
                  !!mobileError && styles.inputFieldError,
                ]}
                onPress={() => mobileInputRef.current?.focus()}
              >
                <View style={styles.prefixContainer}>
                  <Text style={styles.flagIcon}>🇮🇳</Text>
                  <Text style={styles.prefixText}>+91</Text>
                  <View style={styles.prefixDivider} />
                </View>

                <TextInput
                  ref={mobileInputRef}
                  style={styles.textInput}
                  placeholder="Enter 10-digit number"
                  placeholderTextColor="#94a3b8"
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={mobile}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  onFocus={() => setFocusedInput("mobile")}
                  onBlur={() => setFocusedInput(null)}
                  onSubmitEditing={() => passwordInputRef.current?.focus()}
                  onChangeText={(text) => {
                    setMobile(text.replace(/[^0-9]/g, ""));
                    if (mobileError) setMobileError(null);
                    if (serverError) setServerError(null);
                  }}
                />

                {mobile.length > 0 && (
                  <TouchableOpacity
                    onPress={() => {
                      setMobile("");
                      mobileInputRef.current?.focus();
                    }}
                    style={styles.clearBtn}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="close-circle" size={18} color="#94a3b8" />
                  </TouchableOpacity>
                )}
              </Pressable>

              {/* Mobile Error Message below input */}
              {mobileError ? (
                <View style={styles.fieldErrorRow}>
                  <Ionicons name="alert-circle" size={14} color="#dc2626" />
                  <Text style={styles.fieldErrorText}>{mobileError}</Text>
                </View>
              ) : null}
            </View>

            {/* Password Input Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Security Password</Text>
              <Pressable
                style={[
                  styles.inputFieldContainer,
                  focusedInput === "password" && styles.inputFieldFocused,
                  !!passwordError && styles.inputFieldError,
                ]}
                onPress={() => passwordInputRef.current?.focus()}
              >
                <View style={styles.inputIconPrefix}>
                  <Feather
                    name="lock"
                    size={18}
                    color={focusedInput === "password" ? "#0f5f3c" : "#64748b"}
                  />
                </View>

                <TextInput
                  ref={passwordInputRef}
                  style={styles.textInput}
                  placeholder="Enter your password"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry={!showPassword}
                  value={password}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  onFocus={() => setFocusedInput("password")}
                  onBlur={() => setFocusedInput(null)}
                  onSubmitEditing={handleLogin}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (passwordError) setPasswordError(null);
                    if (serverError) setServerError(null);
                  }}
                />

                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword(!showPassword)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Feather
                    name={showPassword ? "eye" : "eye-off"}
                    size={20}
                    color="#64748b"
                  />
                </TouchableOpacity>
              </Pressable>

              {/* Password Error Message below input */}
              {passwordError ? (
                <View style={styles.fieldErrorRow}>
                  <Ionicons name="alert-circle" size={14} color="#dc2626" />
                  <Text style={styles.fieldErrorText}>{passwordError}</Text>
                </View>
              ) : null}
            </View>

            {/* Server / General Error Alert Box */}
            {serverError ? (
              <View style={styles.errorAlert}>
                <Ionicons name="alert-circle" size={18} color="#b91c1c" />
                <Text style={styles.errorAlertText}>{serverError}</Text>
              </View>
            ) : null}

            {/* Sign In Button */}
            <TouchableOpacity
              style={[
                styles.loginBtn,
                loading && styles.loginBtnDisabled,
              ]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={["#0f5f3c", "#0a3d27"]}
                style={styles.loginBtnGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {loading ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color="#ffffff" />
                    <Text style={styles.loginBtnText}>Authenticating...</Text>
                  </View>
                ) : (
                  <View style={styles.btnContentRow}>
                    <Text style={styles.loginBtnText}>Sign In to Terminal</Text>
                    <Feather name="arrow-right" size={20} color="#ffffff" />
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Footer Security Badge */}
            {/* <View style={styles.securityFooter}>
              <MaterialCommunityIcons
                name="shield-check"
                size={16}
                color="#0f5f3c"
              />
              <Text style={styles.securityText}>
                Protected with 256-bit encrypted access
              </Text>
            </View> */}
          </View>

          {/* App Copyright / Version */}
          <Text style={styles.versionFooter}>
            ONEMODO PATRONS • v1.0.0
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  headerGradient: {
    paddingBottom: 36,
    alignItems: "center",
    justifyContent: "center",
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },
  brandingWrapper: {
    alignItems: "center",
    paddingHorizontal: 20,
  },
  iconGlowWrapper: {
    padding: 6,
    borderRadius: 28,
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    marginBottom: 10,
  },
  iconContainer: {
    width: 74,
    height: 74,
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.25)",
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
  },
  logoImage: {
    width: "100%",
    height: "100%",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.35)",
    marginBottom: 8,
    gap: 6,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10b981",
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#34d399",
    letterSpacing: 1.2,
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#ffffff",
    letterSpacing: 2.5,
    textAlign: "center",
  },
  brandSubtitle: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.75)",
    marginTop: 4,
    letterSpacing: 0.4,
    textAlign: "center",
  },
  keyboardView: {
    flex: 1,
    marginTop: -20,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    ...Platform.select({
      android: {
        elevation: 6,
      },
      ios: {
        shadowColor: "#0f172a",
        shadowOpacity: 0.08,
        shadowOffset: { width: 0, height: 8 },
        shadowRadius: 16,
      },
    }),
  },
  cardHeader: {
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: 0.2,
  },
  cardSubtitle: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 4,
    lineHeight: 18,
  },
  errorAlert: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorAlertText: {
    flex: 1,
    fontSize: 12,
    color: "#b91c1c",
    fontWeight: "600",
    lineHeight: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 8,
  },
  inputFieldContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 14,
    paddingHorizontal: 12,
    minHeight: 52,
  },
  inputFieldFocused: {
    borderColor: "#0f5f3c",
    backgroundColor: "#ffffff",
    ...Platform.select({
      android: {
        elevation: 2,
      },
      ios: {
        shadowColor: "#0f5f3c",
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 6,
      },
    }),
  },
  inputFieldError: {
    borderColor: "#ef4444",
    backgroundColor: "#fff5f5",
  },
  fieldErrorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    marginLeft: 4,
    gap: 4,
  },
  fieldErrorText: {
    fontSize: 12,
    color: "#dc2626",
    fontWeight: "600",
  },
  prefixContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 8,
  },
  flagIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  prefixText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1e293b",
    marginRight: 8,
  },
  prefixDivider: {
    width: 1,
    height: 20,
    backgroundColor: "#cbd5e1",
  },
  inputIconPrefix: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: "#0f172a",
    fontWeight: "600",
    paddingVertical: Platform.OS === "ios" ? 12 : 8,
    textAlignVertical: "center",
  },
  clearBtn: {
    padding: 4,
  },
  eyeBtn: {
    padding: 6,
  },
  loginBtn: {
    borderRadius: 14,
    overflow: "hidden",
    marginTop: 8,
    elevation: 4,
    shadowColor: "#0f5f3c",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
  },
  loginBtnDisabled: {
    opacity: 0.7,
  },
  loginBtnGradient: {
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  btnContentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  loginBtnText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  securityFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
    gap: 6,
  },
  securityText: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "600",
  },
  versionFooter: {
    textAlign: "center",
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: "700",
    letterSpacing: 1,
    marginTop: 20,
  },
});
