const cron = require("node-cron");
const connection = require("../../database/connection");
const { convertMinutesToHourString } = require("../utils/convertHours");

const scheduleOptions = {
  schedule: false,
  timezone: "America/Sao_Paulo",
  name: "Open-or-Close-store",
  //   recoverMissedExecutions: true,
};

async function getHoursStartEnd() {
  const hoursOperation = await connection("hours_operation").first();
  const hourStart = await convertMinutesToHourString(hoursOperation.hourStart);
  const hourEnd = await convertMinutesToHourString(hoursOperation.hourEnd);

  const [hourS, minuteS] = hourStart.split(":").map(Number);
  const [hourE, minuteE] = hourEnd.split(":").map(Number);

  const start = `${minuteS} ${hourS} * * 0,2,3,4,5,6`;
  const end = `${minuteE} ${hourE} * * 0,2,3,4,5,6`;

  return { start: start, end: end };
}

const scheduleAutoActiveOpen = async (req) => {
  const { start } = await getHoursStartEnd();
  console.log(`[servidor] schedule active to [${start}] OPEN store`);
  return cron.schedule(
    start,
    async () => {
      await connection("operation").where("id", 1).update({
        open_close: true,
      });
      req.io.emit("operation", {
        open_close: true,
      });
    },
    scheduleOptions
  );
};

const scheduleAutoActiveClose = async (req) => {
  const { end } = await getHoursStartEnd();
  console.log(`[servidor] schedule active to [${end}] CLOSE store`);
  return cron.schedule(
    end,
    async () => {
      await connection("operation").where("id", 1).update({
        open_close: false,
      });

      req.io.emit("operation", {
        open_close: false,
      });
    },
    scheduleOptions
  );
};

module.exports = { scheduleAutoActiveOpen, scheduleAutoActiveClose };
