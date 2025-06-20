export function generateHybridId(prefix: string) {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2); // "25"
  const month = String(now.getMonth() + 1).padStart(2, "0"); // "06"
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0"); // "0934"

  return `${prefix.toUpperCase()}-${random}`;

  // return `${prefix.toUpperCase()}-${year}${month}-${random}`;
}

// Examples:
// generateHybridId("prod") => "PROD-2506-3921"
// generateHybridId("order") => "ORDER-2506-8812"
