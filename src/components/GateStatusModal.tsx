import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import {
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export type GateModalType =
  | "entry_success"
  | "exit_success"
  | "confirm_exit"
  | "error";

export interface GateStatusModalProps {
  visible: boolean;
  type: GateModalType;
  title: string;
  subtitle?: string;
  truck?: string;
  vehicleType?: string;
  duration?: string;
  timeText?: string;
  barrierSuccess?: boolean;
  barrierMessage?: string;
  errorMessage?: string;
  imageUri?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onClose: () => void;
}

export const GateStatusModal: React.FC<GateStatusModalProps> = ({
  visible,
  type,
  title,
  subtitle,
  truck,
  vehicleType,
  duration,
  timeText,
  barrierSuccess,
  barrierMessage,
  errorMessage,
  imageUri,
  confirmText,
  cancelText,
  onConfirm,
  onClose,
}) => {
  if (!visible) return null;

  const isEntry = type === "entry_success";
  const isExit = type === "exit_success";
  const isConfirm = type === "confirm_exit";
  const isError = type === "error";

  const getThemeColor = () => {
    if (isError) return "#e53935";
    if (isConfirm) return "#ff9800";
    if (isExit) return "#0f5f3c";
    return "#0f5f3c";
  };

  const themeColor = getThemeColor();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Top Decorative Header Accent */}
          <View style={[styles.topAccentBar, { backgroundColor: themeColor }]} />

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Hero Icon Badge */}
            <View style={styles.heroBadgeWrapper}>
              <View
                style={[
                  styles.heroBadgeGlow,
                  { backgroundColor: `${themeColor}20` },
                ]}
              >
                <View
                  style={[styles.heroBadge, { backgroundColor: themeColor }]}
                >
                  {isEntry && (
                    <MaterialCommunityIcons
                      name="boom-gate-up"
                      size={36}
                      color="#fff"
                    />
                  )}
                  {isExit && (
                    <MaterialCommunityIcons
                      name="boom-gate"
                      size={36}
                      color="#fff"
                    />
                  )}
                  {isConfirm && (
                    <Ionicons name="help-circle" size={38} color="#fff" />
                  )}
                  {isError && (
                    <Ionicons name="alert-circle" size={38} color="#fff" />
                  )}
                </View>
              </View>
            </View>

            {/* Category Tag */}
            <View
              style={[
                styles.categoryTag,
                { backgroundColor: `${themeColor}15` },
              ]}
            >
              <Text style={[styles.categoryTagText, { color: themeColor }]}>
                {isEntry
                  ? "ENTRY REGISTERED"
                  : isExit
                  ? "EXIT COMPLETED"
                  : isConfirm
                  ? "CONFIRM ACTION"
                  : "ERROR"}
              </Text>
            </View>

            {/* Title & Subtitle */}
            <Text style={styles.modalTitle}>{title}</Text>
            {subtitle ? (
              <Text style={styles.modalSubtitle}>{subtitle}</Text>
            ) : null}

            {/* Vehicle Card Section */}
            {(truck || vehicleType) && (
              <View style={styles.vehicleInfoCard}>
                {truck && (
                  <View style={styles.plateContainer}>
                    <View style={styles.plateIndStripe}>
                      <Text style={styles.indText}>IND</Text>
                    </View>
                    <Text style={styles.plateText}>{truck}</Text>
                  </View>
                )}

                <View style={styles.vehicleDetailsRow}>
                  {vehicleType ? (
                    <View style={styles.detailPill}>
                      <MaterialCommunityIcons
                        name={
                          vehicleType.toLowerCase().includes("bike")
                            ? "motorbike"
                            : vehicleType.toLowerCase().includes("truck") ||
                              vehicleType.toLowerCase().includes("wheeler")
                            ? "truck"
                            : "car"
                        }
                        size={16}
                        color="#0f5f3c"
                      />
                      <Text style={styles.detailPillText}>{vehicleType}</Text>
                    </View>
                  ) : null}

                  {duration ? (
                    <View style={styles.detailPill}>
                      <Ionicons name="time-outline" size={15} color="#555" />
                      <Text style={styles.detailPillText}>⏱️ {duration}</Text>
                    </View>
                  ) : timeText ? (
                    <View style={styles.detailPill}>
                      <Ionicons name="calendar-outline" size={15} color="#555" />
                      <Text style={styles.detailPillText}>{timeText}</Text>
                    </View>
                  ) : null}
                </View>

                {imageUri ? (
                  <View style={styles.imagePreviewContainer}>
                    <Image
                      source={{ uri: imageUri }}
                      style={styles.imagePreview}
                    />
                  </View>
                ) : null}
              </View>
            )}

            {/* Boom Barrier Command Status Card */}
            {barrierSuccess !== undefined && (
              <View
                style={[
                  styles.barrierStatusCard,
                  {
                    backgroundColor: barrierSuccess ? "#e8f5e9" : "#fff3e0",
                    borderColor: barrierSuccess ? "#c8e6c9" : "#ffe0b2",
                  },
                ]}
              >
                <View style={styles.barrierHeaderRow}>
                  <MaterialCommunityIcons
                    name={barrierSuccess ? "boom-gate-up" : "alert-circle"}
                    size={22}
                    color={barrierSuccess ? "#2e7d32" : "#e65100"}
                  />
                  <Text
                    style={[
                      styles.barrierStatusTitle,
                      { color: barrierSuccess ? "#2e7d32" : "#e65100" },
                    ]}
                  >
                    {barrierSuccess
                      ? "Boom Gate OPEN Command Sent"
                      : "Boom Controller Notice"}
                  </Text>
                </View>
                <Text style={styles.barrierMessageText}>
                  {barrierMessage ||
                    (barrierSuccess
                      ? "The barrier opening signal was successfully triggered on local network."
                      : "Controller unreachable on local Wi-Fi / LAN.")}
                </Text>
              </View>
            )}

            {/* Error Message Box */}
            {errorMessage ? (
              <View style={styles.errorBox}>
                <Ionicons name="information-circle" size={18} color="#c62828" />
                <Text style={styles.errorMessageText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* Action Buttons */}
            <View style={styles.actionsContainer}>
              {isConfirm ? (
                <View style={styles.confirmButtonRow}>
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={onClose}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.secondaryButtonText}>
                      {cancelText || "Cancel"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.primaryButton, { backgroundColor: themeColor }]}
                    onPress={() => {
                      onClose();
                      if (onConfirm) onConfirm();
                    }}
                    activeOpacity={0.8}
                  >
                    <MaterialCommunityIcons
                      name="boom-gate-up"
                      size={18}
                      color="#fff"
                    />
                    <Text style={styles.primaryButtonText}>
                      {confirmText || "Yes, Open & Exit"}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: themeColor }]}
                  onPress={onClose}
                  activeOpacity={0.8}
                >
                  <Text style={styles.primaryButtonText}>
                    {confirmText || "OK"}
                  </Text>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#ffffff",
    borderRadius: 24,
    overflow: "hidden",
    ...Platform.select({
      android: {
        elevation: 15,
      },
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.25,
        shadowOffset: { width: 0, height: 10 },
        shadowRadius: 20,
      },
    }),
  },
  topAccentBar: {
    height: 6,
    width: "100%",
  },
  scrollContent: {
    padding: 24,
    alignItems: "center",
  },
  heroBadgeWrapper: {
    marginBottom: 12,
  },
  heroBadgeGlow: {
    padding: 8,
    borderRadius: 45,
  },
  heroBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
  },
  categoryTag: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
    marginBottom: 8,
  },
  categoryTagText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  modalTitle: {
    fontSize: 21,
    fontWeight: "bold",
    color: "#1e293b",
    textAlign: "center",
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 18,
    paddingHorizontal: 10,
    lineHeight: 18,
  },
  vehicleInfoCard: {
    width: "100%",
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
    marginBottom: 16,
  },
  plateContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#0f172a",
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  plateIndStripe: {
    backgroundColor: "#003893",
    paddingHorizontal: 6,
    paddingVertical: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  indText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "900",
  },
  plateText: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0f172a",
    letterSpacing: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 6,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  vehicleDetailsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
  },
  detailPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  detailPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
    marginLeft: 6,
  },
  imagePreviewContainer: {
    width: "100%",
    height: 120,
    borderRadius: 10,
    overflow: "hidden",
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  imagePreview: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  barrierStatusCard: {
    width: "100%",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  barrierHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  barrierStatusTitle: {
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 6,
  },
  barrierMessageText: {
    fontSize: 11,
    color: "#475569",
    marginLeft: 28,
    lineHeight: 16,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    backgroundColor: "#ffebee",
    borderWidth: 1,
    borderColor: "#ffcdd2",
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
  },
  errorMessageText: {
    fontSize: 12,
    color: "#c62828",
    marginLeft: 8,
    flex: 1,
    fontWeight: "500",
  },
  actionsContainer: {
    width: "100%",
    marginTop: 8,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    flex: 1,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold",
    marginRight: 6,
  },
  confirmButtonRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: "#f1f5f9",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: "#475569",
    fontSize: 14,
    fontWeight: "700",
  },
});
