/**
 * Utilities for resolving and validating vehicle and log image URLs.
 */
export const resolveImageUrl = (img?: string | any | null): string => {
  if (!img) return "";
  
  // If it's an object with a uri property
  if (typeof img === "object" && img.uri) {
    return resolveImageUrl(img.uri);
  }

  if (typeof img !== "string") return "";

  const trimmed = img.trim();
  if (
    trimmed === "" ||
    trimmed === "-" ||
    trimmed === "null" ||
    trimmed === "undefined" ||
    trimmed === "NaN"
  ) {
    return "";
  }

  // Absolute URLs / local file schemes / base64
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("file://") ||
    trimmed.startsWith("data:")
  ) {
    return trimmed;
  }

  // Relative paths from backend
  const cleanPath = trimmed.startsWith("/") ? trimmed.slice(1) : trimmed;
  return `https://sat.modomines.com/${cleanPath}`;
};
