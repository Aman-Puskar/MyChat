export function getTimeAgo(timestamp) {
  const inputDate = new Date(timestamp);

  // Check if input is in UTC format (contains 'Z')
  const isUTC = typeof timestamp === "string" && timestamp.endsWith("Z");

  // Adjust only if it's a backend UTC timestamp
  const localDate = isUTC
    ? new Date(inputDate.getTime() + (new Date().getTimezoneOffset() * -60000))
    : inputDate;

  const now = new Date();
  const secondsAgo = Math.floor((now - localDate) / 1000);

  if (secondsAgo < 60) return `just now`;
  const minutesAgo = Math.floor(secondsAgo / 60);
  if (minutesAgo < 60) return `${minutesAgo} minutes ago`;
  const hoursAgo = Math.floor(minutesAgo / 60);
  if (hoursAgo < 24) return `${hoursAgo} hours ago`;
  const daysAgo = Math.floor(hoursAgo / 24);
  if (daysAgo < 7) return `${daysAgo} days ago`;
  const weeksAgo = Math.floor(daysAgo / 7);
  if (weeksAgo < 4) return `${weeksAgo} weeks ago`;
  const monthsAgo = Math.floor(daysAgo / 30);
  if (monthsAgo < 12) return `${monthsAgo} months ago`;
  const yearsAgo = Math.floor(daysAgo / 365);
  return `${yearsAgo} years ago`;
}
