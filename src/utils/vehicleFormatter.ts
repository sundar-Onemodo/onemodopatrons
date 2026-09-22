/**
 * Vehicle Plate Formatter Utility
 * Formats Indian vehicle numbers into standard spaced representation,
 * e.g., 'TN 59 AK 0001', 'TN 11 E 7070', 'TN 22 CJ 7070'
 */

export const formatVehiclePlate = (input: string): string => {
  if (!input) return "";

  // Remove any character that is not alphanumeric
  const raw = input.toUpperCase().replace(/[^A-Z0-9]/g, "");

  // Match: State(2) + RTO(1-2) + Series(1-3) + Number(1-4)
  const match = raw.match(/^([A-Z]{2})(\d{1,2})([A-Z]{1,3})(\d{1,4})$/);
  if (match) {
    const [, state, rto, series, num] = match;
    const formattedRto = rto.length === 1 ? `0${rto}` : rto;
    return `${state} ${formattedRto} ${series} ${num}`;
  }

  // If user entered spaces manually, preserve and normalize single spaces
  const spaced = input.toUpperCase().replace(/[^A-Z0-9\s]/g, "").replace(/\s+/g, " ").trim();
  return spaced || input.toUpperCase();
};

export const normalizeVehicleInput = (text: string): string => {
  if (!text) return "";
  // Keep uppercase letters, numbers, and single spaces
  return text.toUpperCase().replace(/[^A-Z0-9\s]/g, "").replace(/\s+/g, " ");
};
