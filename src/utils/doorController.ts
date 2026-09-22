import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { BASE_URL } from "../components/BaseUrlApi";
import { store } from "../store/store";

export interface BoomSettings {
  boomentry: string;
  boomexit: string;
  company_id?: number | string;
}

export const DOOR_CONTROLLER_TIMEOUT = 8000;

export interface DoorOpenContext {
  truck?: string;
  action?: string;
  type?: "entry" | "exit";
  companyId?: string | number;
  customUrl?: string;
}

/**
 * Sanitizes the boom URL returned by backend by trimming whitespace and spaces in query strings
 */
export const sanitizeBoomUrl = (rawUrl: string): string => {
  if (!rawUrl) return "";
  return rawUrl.trim().replace(/\s+/g, "");
};

/**
 * Fetches boom barrier URL settings dynamically from the backend API:
 * POST https://sat.modomines.com/apiv3/boomsettings
 * Stores the result in AsyncStorage for fast local retrieval.
 */
export const fetchAndSaveBoomSettings = async (
  companyId?: string | number,
  token?: string
): Promise<BoomSettings | null> => {
  const cid = String(companyId || 23);
  const authToken = token || store.getState().auth?.authToken || "";

  try {
    const formData = new FormData();
    formData.append("company_id", cid);
    if (authToken) {
      formData.append("token", authToken);
    }

    const headers: Record<string, string> = {
      "User-Agent": "DashboardApp",
      "Content-Type": "multipart/form-data",
      "Accept": "application/json",
    };

    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }

    const response = await axios.post(BASE_URL + "boomsettings", formData, {
      headers,
      timeout: 10000,
    });

    console.log("Response  ", response.data)

    if (
      response.data &&
      (response.data.status === "success" || response.data.success)
    ) {
      const boom = response.data.Boom || response.data.boom || {};
      const settings: BoomSettings = {
        boomentry: sanitizeBoomUrl(boom.boomentry || ""),
        boomexit: sanitizeBoomUrl(boom.boomexit || ""),
        company_id: response.data.company_id || cid,
      };

      // Save to AsyncStorage keyed by company
      await AsyncStorage.setItem(
        `@boom_settings_${cid}`,
        JSON.stringify(settings)
      );
      // Also save generic fallback
      await AsyncStorage.setItem(`@boom_settings`, JSON.stringify(settings));

      console.log(
        `✅ [DOOR CONTROLLER] Fetched & saved boom settings for company ${cid}:`,
        settings
      );
      return settings;
    }

    console.warn(
      `[DOOR CONTROLLER] boomsettings API returned non-success:`,
      response.data
    );
    return null;
  } catch (error: any) {
    console.warn(
      `[DOOR CONTROLLER] Failed to fetch boom settings:`,
      error?.response?.data || error?.message || error
    );
    return null;
  }
};

/**
 * Retrieves cached boom settings from AsyncStorage, or fetches from backend if not yet cached.
 */
export const getBoomSettings = async (
  companyId?: string | number
): Promise<BoomSettings | null> => {
  const cid = String(companyId || 23);
  try {
    const cached =
      (await AsyncStorage.getItem(`@boom_settings_${cid}`)) ||
      (await AsyncStorage.getItem(`@boom_settings`));

    if (cached) {
      const parsed: BoomSettings = JSON.parse(cached);
      if (parsed.boomentry || parsed.boomexit) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn(`[DOOR CONTROLLER] Error reading cached boom settings:`, e);
  }

  // If not in cache, fetch fresh from backend API
  return await fetchAndSaveBoomSettings(companyId);
};

/**
 * Triggers the remote door / boom barrier open command with comprehensive logging.
 * URL is resolved strictly from the boomsettings API response.
 */
export const triggerRemoteDoorOpen = async (context?: DoorOpenContext) => {
  const startTime = Date.now();
  const contextInfo = context?.truck ? `[${context.truck}] ` : "";
  const type = context?.type || "entry";
  const cid = context?.companyId || 23;

  // 1. Resolve Target URL strictly from API settings
  let targetUrl = context?.customUrl ? sanitizeBoomUrl(context.customUrl) : "";

  if (!targetUrl) {
    const settings = await getBoomSettings(cid);
    if (settings) {
      targetUrl =
        type === "exit"
          ? sanitizeBoomUrl(settings.boomexit)
          : sanitizeBoomUrl(settings.boomentry);
    }
  }

  // If no URL configured in backend API response
  if (!targetUrl) {
    const duration = Date.now() - startTime;
    const errorMsg = `No boom ${type} URL found from API for company ID ${cid}`;
    console.warn(`❌ [DOOR CONTROLLER] FAILED (${duration}ms): ${errorMsg}`);
    return {
      success: false,
      error: errorMsg,
      duration,
    };
  }

  console.log(`\n================== [DOOR CONTROLLER] REMOTE OPEN ==================`);
  console.log(`⏰ Timestamp : ${new Date().toISOString()}`);
  if (context?.truck || context?.action) {
    console.log(`🚗 Context   : ${contextInfo}${context?.action || ""}`);
  }
  console.log(`🚪 Gate Type : ${type.toUpperCase()}`);
  console.log(`🌐 Target URL: ${targetUrl}`);

  try {
    // Note: ZKBio CVSecurity / ZKTeco requires HTTP POST method
    const response = await axios.post(targetUrl, null, {
      timeout: DOOR_CONTROLLER_TIMEOUT,
    });

    const duration = Date.now() - startTime;
    const data = response.data;

    // Check payload business status (code: 0, ret: 0, success: true, or message: "success")
    const isOperationSuccess =
      data?.code === 0 ||
      data?.code === "0" ||
      data?.ret === 0 ||
      data?.ret === "0" ||
      data?.message?.toLowerCase() === "success" ||
      data?.msg?.toLowerCase() === "success" ||
      data?.success === true;

    if (isOperationSuccess) {
      console.log(`✅ [DOOR CONTROLLER] SUCCESS (${duration}ms)`);
      console.log(`📊 HTTP Status: ${response.status} ${response.statusText || ""}`);
      console.log(`📦 Payload    :`, JSON.stringify(data, null, 2));
      console.log(`===================================================================\n`);

      return { success: true, data, duration, targetUrl };
    } else {
      const errMsg = data?.msg || data?.message || "Door controller operation failed";
      console.warn(`⚠️ [DOOR CONTROLLER] OPERATION FAILED (${duration}ms)`);
      console.warn(`📊 HTTP Status: ${response.status}`);
      console.warn(`📦 Payload    :`, JSON.stringify(data, null, 2));
      console.warn(`⚠️ Error Message: ${errMsg}`);
      console.log(`===================================================================\n`);

      return {
        success: false,
        error: errMsg,
        data,
        duration,
        targetUrl,
      };
    }
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.warn(`❌ [DOOR CONTROLLER] FAILED (${duration}ms)`);

    if (error.response) {
      console.warn(`📊 HTTP Status Code: ${error.response.status}`);
      console.warn(`📦 Response Body   :`, error.response.data);
    } else if (error.request) {
      console.warn(
        `📡 Network Failure : No response received from target URL (${targetUrl}). ` +
        `Verify device is on the local LAN / Wi-Fi and port is reachable.`
      );
      console.warn(`⚠️ Error Message   : ${error.message}`);
    } else {
      console.warn(`⚠️ Error Details   : ${error.message}`);
    }
    console.log(`===================================================================\n`);

    return {
      success: false,
      error:
        error?.response?.data?.message ||
        error?.response?.data?.msg ||
        error?.message ||
        "Door controller unreachable",
      duration,
      targetUrl,
    };
  }
};
