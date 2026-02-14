/**
 * Formats a number as currency.
 * @param {number} amount - The amount to format.
 * @returns {string} - The formatted currency string.
 */
export function formatCurrency(amount) {
  const locale = import.meta.env.VITE_LOCALE || "en-IN";
  const currency = import.meta.env.VITE_CURRENCY || "INR";

  const hasFraction = Math.abs(amount % 1) > 0;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency,
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: hasFraction ? 2 : 0,
  }).format(amount);
}

/**
 * Formats a date as dd/mm/yyyy.
 * @param {Date|string} date - The date to format.
 * @returns {string} - The formatted date string in dd/mm/yyyy format.
 */
export function formatDate(date) {
  if (!date) return "";

  const parsedDate = typeof date === "string" ? new Date(date) : date;

  // Use en-GB locale to get dd/mm/yyyy format
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parsedDate);
}

/**
 * Formats a date and time as dd/mm/yyyy HH:MM.
 * @param {Date|string} dateTime - The date and time to format.
 * @returns {string} - The formatted date and time string in dd/mm/yyyy HH:MM format.
 */
export function formatDateTime(dateTime) {
  if (!dateTime) return "";

  const parsedDateTime =
    typeof dateTime === "string" ? new Date(dateTime) : dateTime;

  // Use en-GB locale to get dd/mm/yyyy format with time
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsedDateTime);
}

/**
 * Formats a number as a percentage.
 * @param {number} value - The number to format.
 * @returns {string} - The formatted percentage string.
 */
export function formatPercentage(value) {
  const locale = import.meta.env.VITE_LOCALE || "en-US";
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value / 100);
}
