
const date1 = new Date('2023-10-25T10:30:00Z');
const dateString = '2023-10-25';

function formatDate(date) {
  if (!date) return "";

  const parsedDate = typeof date === "string" ? new Date(date) : date;

  // Use en-GB locale to get dd/mm/yyyy format
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parsedDate);
}

console.log('Date Object:', formatDate(date1));
console.log('Date String:', formatDate(dateString));
