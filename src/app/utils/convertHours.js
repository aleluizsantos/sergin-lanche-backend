module.exports = {
  async convertHourStringToMinutes(hourString) {
    const [hour, minutes] = hourString.split(":").map(Number);
    const minutesAmount = hour * 60 + minutes;
    return minutesAmount;
  },
  async convertMinutesToHourString(minutesAmount) {
    const hour = Math.floor(minutesAmount / 60);
    const minutes = minutesAmount % 60;
    return `${String(hour).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0"
    )}`;
  },
};
