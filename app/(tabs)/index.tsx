import AdPopup from "@/src/components/AdPopup";
import { BASE_URL } from "@/src/components/BaseUrlApi";
import { addSession } from "@/src/store/attendanceSlice";
import {
  resetAuth,
  setAuthToken,
  setSignupCountry,
  setTotalWorkedHours,
} from "@/src/store/authSlice";
import { RootState } from "@/src/store/store";
import { AntDesign } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import * as Location from "expo-location";
import { router } from "expo-router";
import moment from "moment";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";

const ALLOWED_LAT = 13.04487;
const ALLOWED_LON = 80.24769;
const RADIUS_METERS = 100;
// 13.012369612196736, 80.24011857185882
// 13.04487008728443, 80.24769333074165 -- current location

export default function HomeScreen() {
  const [location, setLocation] = useState(null);
  const [checkedIn, setCheckedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState<moment.Moment | null>(null);
  const [checkOutTime, setCheckOutTime] = useState(null);
  const [totalHours, setTotalHours] = useState(null);
  const [time, setTime] = useState(moment().format("HH:mm A"));
  const [locationName, setLocationName] = useState("");
  const [isInAllowedLocation, setIsInAllowedLocation] = useState(false);
  const [showPunchOutModal, setShowPunchOutModal] = useState(false);
  const [locationIntervalId, setLocationIntervalId] = useState(null);
  const [introStep, setIntroStep] = useState(1); // 0 = not showing, 1 = profile, etc.
  const [remainingShiftTime, setRemainingShiftTime] = useState<string | null>(
    null
  );
  const countdownInterval = useRef<NodeJS.Timeout | null>(null);

  const dispatch = useDispatch();

  const { authToken, employeeId, companyId, shiftHour,username } = useSelector(
    (state: RootState) => state.auth
  );
// console.log('CHECK ALL DATA', authToken, employeeId, companyId, shiftHour);
  
  const [showAd, setShowAd] = useState(false);

  useEffect(() => {
    const checkAdShown = async () => {
      const shown = await AsyncStorage.getItem("adShown");
      if (!shown) {
        // Show ad after 30 seconds of app opening
        const timer = setTimeout(() => {
          setShowAd(true);
        }, 30000); // 30 seconds delay

        return () => clearTimeout(timer);
      }
    };
          setShowAd(true);

    checkAdShown();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(moment().format("HH:mm A"));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const checkFirstTime = async () => {
      const hasSeenIntro = await AsyncStorage.getItem("hasSeenHomeIntro");
      if (!hasSeenIntro) {
        setIntroStep(1); // Start walkthrough
      }
    };
    checkFirstTime();
  }, []);

  useEffect(() => {
    let intervalId;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Location permission denied");
        return;
      }

      let hasGeocoded = false; // 👈 Flag to prevent repeated reverse geocoding

      const updateLocation = async () => {
        try {
          const loc = await Location.getCurrentPositionAsync({});
          setLocation(loc.coords);

          const distance = getDistance(
            loc.coords.latitude,
            loc.coords.longitude,
            ALLOWED_LAT,
            ALLOWED_LON
          );
          const isInside = distance <= RADIUS_METERS;
          setIsInAllowedLocation(isInside);

          // Only reverse geocode once
          if (!hasGeocoded && !locationName) {
            const [place] = await Location.reverseGeocodeAsync(loc.coords);
            if (place) {
              const name = `${place.name || ""}, ${place.city || ""}`.trim();
              setLocationName(name);
              dispatch(setSignupCountry(name));
              hasGeocoded = true;
            }
          }

          if (!isInside && checkedIn) {
            handleCheckOut();
            Alert.alert("Checked out", "You left the allowed location.");
          }
        } catch (err) {
          console.error("Location error:", err);
        }
      };

      await updateLocation();
      intervalId = setInterval(updateLocation, 10000); // Still checks location every 10 sec
      setLocationIntervalId(intervalId);
    })();

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    const restoreCheckInState = async () => {
      try {
        const storedCheckedIn = await AsyncStorage.getItem("checkedIn");
        const storedCheckInTime = await AsyncStorage.getItem("checkInTime");

        if (storedCheckedIn === "true" && storedCheckInTime) {
          setCheckedIn(true);
          setCheckInTime(moment(storedCheckInTime));
        }
      } catch (err) {
        console.error("Error restoring check-in state:", err);
      }
    };

    const restoreCountdown = async () => {
      const start = await AsyncStorage.getItem("shiftCountdownStart");
      const total = await AsyncStorage.getItem("shiftSeconds");
      if (!start || !total) return;

      const elapsed = Math.floor((Date.now() - parseInt(start)) / 1000);
      let remaining = parseInt(total) - elapsed;

      if (remaining > 0) {
        countdownInterval.current = setInterval(() => {
          remaining -= 1;
          const h = Math.floor(remaining / 3600);
          const m = Math.floor((remaining % 3600) / 60);
          const s = remaining % 60;
          setRemainingShiftTime(
            `${h.toString().padStart(2, "0")}:${m
              .toString()
              .padStart(2, "0")}:${s.toString().padStart(2, "0")}`
          );
          if (remaining <= 0 && countdownInterval.current) {
            clearInterval(countdownInterval.current);
          }
        }, 1000);
      }
    };
    restoreCountdown();

    restoreCheckInState();
  }, []);

  const formatShiftHour = (shift: string) => {
    const [hours] = shift.split(":");
    return `${parseInt(hours)}hr`;
  };

  const getShiftDurationInSeconds = () => {
    if (!shiftHour) return 0;
    const [h, m, s] = shiftHour.split(":").map(Number);
    return h * 3600 + m * 60 + s;
  };

  const getDistance = (lat1, lon1, lat2, lon2) => {
    const toRad = (val) => (val * Math.PI) / 180;
    const R = 6371e3;
    const φ1 = toRad(lat1);
    const φ2 = toRad(lat2);
    const Δφ = toRad(lat2 - lat1);
    const Δλ = toRad(lon2 - lon1);

    const a =
      Math.sin(Δφ / 2) ** 2 +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const startShiftCountdown = async () => {
    const shiftSeconds = getShiftDurationInSeconds();

    const startTime = Date.now();
    await AsyncStorage.setItem("shiftCountdownStart", startTime.toString());
    await AsyncStorage.setItem("shiftSeconds", shiftSeconds.toString());

    let remaining = shiftSeconds;

    const storedRemaining = await AsyncStorage.getItem("remainingShiftSeconds");
    if (storedRemaining) {
      remaining = parseInt(storedRemaining);
    }

    countdownInterval.current = setInterval(() => {
      remaining -= 1;
      const h = Math.floor(remaining / 3600);
      const m = Math.floor((remaining % 3600) / 60);
      const s = remaining % 60;

      setRemainingShiftTime(
        `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s
          .toString()
          .padStart(2, "0")}`
      );
      if (remaining <= 0 && countdownInterval.current) {
        clearInterval(countdownInterval.current);
      }
    }, 1000);
  };

  const stopShiftCountdown = async () => {
    if (countdownInterval.current) {
      clearInterval(countdownInterval.current);
      countdownInterval.current = null;
      setRemainingShiftTime(null);
    }
    await AsyncStorage.removeItem("shiftCountdownStart");
    await AsyncStorage.removeItem("shiftSeconds");
    await AsyncStorage.removeItem("remainingShiftSeconds");
  };

  const handleCheckIn = async () => {
    if (!location) {
      Alert.alert("Fetching your location...");
      return;
    }

    const distance = getDistance(
      location.latitude,
      location.longitude,
      ALLOWED_LAT,
      ALLOWED_LON
    );
    if (distance > RADIUS_METERS) {
      Alert.alert("You are outside the allowed area");
      return;
    }

    const now = moment();
    const formattedCheckIn = now.format("YYYY-MM-DD HH:mm:ss");
    console.log("Check-in Time:", formattedCheckIn);

    setCheckedIn(true);
    setCheckInTime(now);
    setCheckOutTime(null);
    setTotalHours(null);

    await AsyncStorage.setItem("checkedIn", "true");
    await AsyncStorage.setItem("checkInTime", now.toISOString());

    const formData = new FormData();
    formData.append("token", authToken);
    formData.append("checkin", formattedCheckIn);
    formData.append("employee_id", employeeId); // You should dynamically get this from user state
    formData.append("type", "CheckIn");
    formData.append("company_id", companyId);

    try {
      const response = await axios.post(
        BASE_URL + "employeecheckin",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            "User-Agent": "DashboardApp",
          },
        }
      );

      const data = response.data;
      console.log("Check-in API Response:", data);

      if (data?.status === "success") {
        startShiftCountdown();
        Alert.alert("Success", "Checked in successfully!");
      } else {
        Alert.alert("Error", data?.message || "Check-in failed.");
      }
    } catch (err) {
      console.error("Check-in API Error:", err);
      Alert.alert("Error", "Something went wrong during check-in.");
    }
  };

  const handleCheckOut = async () => {
    const outTime = moment();
    const formattedCheckOut = outTime.format("YYYY-MM-DD HH:mm:ss");
    console.log("Check-out Time:", formattedCheckOut);

    const duration = moment.duration(outTime.diff(checkInTime));
    const hours = duration.asHours().toFixed(2);

    setCheckedIn(false);
    setCheckOutTime(outTime);
    setTotalHours(hours);

    await AsyncStorage.removeItem("checkedIn");
    await AsyncStorage.removeItem("checkInTime");

    dispatch(
      addSession({
        date: moment().format("YYYY-MM-DD"),
        checkIn: moment(checkInTime).format("HH:mm"),
        checkOut: moment(outTime).format("HH:mm"),
        totalHours: hours,
      })
    );

    const formData = new FormData();
    formData.append("token", authToken);
    formData.append("checkout", formattedCheckOut);
    formData.append("employee_id", employeeId);
    formData.append("type", "CheckOut");
    formData.append("company_id", companyId);

    try {
      const response = await axios.post(
        BASE_URL + "employeecheckin",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            "User-Agent": "DashboardApp",
          },
        }
      );

      const data = response.data;
      console.log("Check-out API Response:", data);

      if (data?.status === "success") {
        stopShiftCountdown();
        dispatch(setTotalWorkedHours(data.total_hours || "00:00:00"));

        // ✅ Save remaining shift time to AsyncStorage (HH:MM:SS → seconds)
        const remainingShiftTime = data.remaining_shift_time; // make sure this comes from API
        const remaining = remainingShiftTime
          ? remainingShiftTime.split(":").reduce((acc, val, i) => {
              return acc + parseInt(val) * Math.pow(60, 2 - i); // h:m:s → seconds
            }, 0)
          : 0;

        await AsyncStorage.setItem(
          "remainingShiftSeconds",
          remaining.toString()
        );
        await AsyncStorage.removeItem("shiftCountdownStart"); // optional cleanup
        setShowPunchOutModal(true);
        // Alert.alert(
        //   "Success",
        //   `Checked out. Worked: ${data.worked_hours || "--"}, Total: ${
        //     data.total_hours || "--"
        //   }`
        // );
      } else {
        Alert.alert("Error", data?.message || "Check-out failed.");
      }
    } catch (err) {
      console.error("Check-out API Error:", err);
      Alert.alert("Error", "Something went wrong during check-out.");
    }
  };

  const formatDuration = (duration) => {
    const hours = Math.floor(duration.asHours());
    const minutes = duration.minutes();
    const seconds = duration.seconds();

    return `${hours ? `${hours} hr` : ""} ${minutes ? `${minutes} min` : ""} ${
      seconds ? `${seconds} sec` : ""
    }`.trim();
  };

 const handleLogout = async () => {
  Alert.alert(
    "Confirm Logout",
    "Are you sure you want to log out?",
    [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            const formData = new FormData();
            formData.append("token", authToken);

            const response = await axios.post(
              BASE_URL + "employeelogout",
              formData,
              {
                headers: {
                  "Content-Type": "multipart/form-data",
                  "User-Agent": "DashboardApp",
                },
              }
            );

            const data = response.data;
            console.log("Logout Response:", data);
            await AsyncStorage.removeItem("authToken");

            if (data?.status === "success") {
              dispatch(setAuthToken(""));
              dispatch(resetAuth());
              Alert.alert("Logged Out", "You have been logged out successfully.");
              router.push("/showloginscreen");
            } else {
              Alert.alert("Error", data.message || "Logout failed.");
              dispatch(setAuthToken(""));
              router.push("/showloginscreen");
            }
          } catch (error) {
            console.error("Logout Error:", error);
            Alert.alert("Error", "Something went wrong. Please try again later.");

            // Still clear token on error
            await AsyncStorage.removeItem("authToken");
            dispatch(resetAuth());
            router.replace("/showloginscreen");
          }
        },
      },
    ]
  );
};


   const getInitial = (name: string) =>
    name ? name.charAt(0).toUpperCase() : "?";

  return (
    <SafeAreaView style={styles.safeArea}>
      <AdPopup visible={showAd} onClose={() => setShowAd(false)} />

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.headerContainer}>
          <View style={styles.profileContainer}>
            <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitial(username)}</Text>
        </View>
            <View style={styles.profileTextContainer}>
              <Text style={styles.greeting}>{username}</Text>
              <Text style={styles.locationText} numberOfLines={1}>
                📍 {locationName || "Fetching location..."}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <AntDesign name="logout" size={24} color="#F44336" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Shift Info Section */}
        {/* <View style={styles.shiftContainer}>
          <Text style={styles.shiftText}>
            Shift: {formatShiftHour(shiftHour || "00:00:00")}
          </Text>
          {checkedIn && remainingShiftTime && (
            <Text style={styles.countdownText}>⏳ {remainingShiftTime}</Text>
          )}
        </View> */}

        {/* Time Display Section */}
        <View style={styles.timeContainer}>
          <Text style={styles.clock}>{time}</Text>
          <Text style={styles.date}>{moment().format("dddd, MMM D YYYY")}</Text>
        </View>

        {/* Check In/Out Button */}
        {isInAllowedLocation ? (
          <TouchableOpacity
            style={[
              styles.checkButton,
              checkedIn ? styles.checkOutButton : styles.checkInButton,
            ]}
            onPress={checkedIn ? handleCheckOut : handleCheckIn}
          >
            <Text style={styles.checkButtonText}>
              {checkedIn ? "Check Out" : "Check In"}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.checkButton, styles.outOfLocationButton]}
            onPress={() => Alert.alert("You are outside the allowed area")}
          >
            <Text style={styles.checkButtonText}>Out of Location</Text>
          </TouchableOpacity>
        )}

        {/* Attendance Summary */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryIcon}>🕒</Text>
            <Text style={styles.summaryLabel}>Check In</Text>
            <Text style={styles.summaryValue}>
              {checkInTime ? moment(checkInTime).format("hh:mm A") : "--"}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryIcon}>⏰</Text>
            <Text style={styles.summaryLabel}>Check Out</Text>
            <Text style={styles.summaryValue}>
              {checkOutTime ? moment(checkOutTime).format("hh:mm A") : "--"}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryIcon}>⏳</Text>
            <Text style={styles.summaryLabel}>Total Hrs</Text>
            <Text style={styles.summaryValue}>
              {totalHours
                ? formatDuration(moment.duration(totalHours, "hours"))
                : "--"}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Check Out Modal */}
      <Modal
        visible={showPunchOutModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPunchOutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Check Out</Text>
            <Text style={styles.modalTime}>
              Time:{" "}
              {totalHours
                ? formatDuration(moment.duration(totalHours, "hours"))
                : "--"}
            </Text>
            <Text style={styles.modalLocationLabel}>Location:</Text>
            <Text style={styles.modalAddress}>
              {locationName || "Fetching location..."}
            </Text>
            <Image
              source={require("../../assets/images/businessman.png")}
              style={styles.modalImage}
              resizeMode="contain"
            />
            <TouchableOpacity
              onPress={() => setShowPunchOutModal(false)}
              style={styles.okButton}
            >
              <Text style={styles.okText}>OK!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: Platform.select({
      ios: 40,
      android: 20,
    }),
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
   avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFD700", // Gold color
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#191820",
  },
  profileContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  profileTextContainer: {
    marginLeft: 5,
    flex: 1,
  },
  greeting: {
    fontSize: 22,
    fontWeight: "600",
    color: "#1B1B1D",
  },
  locationText: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  logoutButton: {
    alignItems: "center",
    marginLeft: 10,
  },
  logoutText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#F44336",
    marginTop: 2,
  },
  shiftContainer: {
    backgroundColor: "#F0F8FF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  shiftText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  countdownText: {
    fontSize: 15,
    color: "#0F3460",
    fontWeight: "600",
  },
  timeContainer: {
    alignItems: "center",
    marginBottom: 10,
  },
  clock: {
    fontSize: 48,
    fontWeight: "700",
    color: "#333",
  },
  date: {
    fontSize: 16,
    color: "#666",
    marginTop: 4,
  },
  checkButton: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginVertical: 24,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  checkInButton: {
    backgroundColor: "#4CAF50",
  },
  checkOutButton: {
    backgroundColor: "#F44336",
  },
  outOfLocationButton: {
    backgroundColor: "#FF9800",
  },
  checkButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  summaryContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    paddingHorizontal: 16,
  },
  summaryItem: {
    alignItems: "center",
    flex: 1,
  },
  summaryIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1B1B1D",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    backgroundColor: "#fff",
    padding: 24,
    width: "85%",
    borderRadius: 20,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#0F3460",
    marginBottom: 12,
  },
  modalTime: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  modalLocationLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  modalAddress: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 16,
  },
  modalImage: {
    width: 160,
    height: 160,
    marginVertical: 12,
  },
  okButton: {
    backgroundColor: "#0F3460",
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 30,
    marginTop: 16,
  },
  okText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
