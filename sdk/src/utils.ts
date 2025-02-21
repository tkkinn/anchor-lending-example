/**
 * Converts a hexadecimal string to bytes32 format
 * Pads shorter hex strings with zeros on the left
 * Truncates longer strings to 32 bytes (64 characters)
 * @param hex Hexadecimal string with or without '0x' prefix
 * @returns bytes32 string representation
 * @throws Error if invalid hex string
 */
export function hexToBytes32(hex: string): string {
  // Remove 0x prefix if present
  hex = hex.replace("0x", "");

  // Validate hex string
  if (!/^[0-9a-fA-F]*$/.test(hex)) {
    throw new Error("Invalid hexadecimal string");
  }

  // Pad with zeros if shorter than 64 characters
  hex = hex.padStart(64, "0");

  // Truncate if longer than 64 characters
  hex = hex.slice(-64);

  // Return with 0x prefix
  return "0x" + hex;
}
