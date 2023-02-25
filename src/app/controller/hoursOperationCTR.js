const express = require("express");
const connection = require("../../database/connection");
const authMiddleware = require("../middleware/auth");

const {
  convertHourStringToMinutes,
  convertMinutesToHourString,
} = require("../utils/convertHours");

const router = express.Router();

router.use(authMiddleware);

router.get("/", async (req, res) => {
  const hoursOperation = await connection("hours_operation").first();
  const hours = await convertMinutesToHourString(hoursOperation.hourStart);
  const minutes = await convertMinutesToHourString(hoursOperation.hourEnd);
  return res.status(200).json({
    hourStart: hours,
    hourEnd: minutes,
  });
});

router.post("/create", async (req, res) => {
  const { hourStart, hourEnd } = req.body;

  try {
    const hourStartToMinutes = await convertHourStringToMinutes(hourStart);
    const hourEndToMinutes = await convertHourStringToMinutes(hourEnd);

    await connection("hours_operation").insert({
      hourStart: hourStartToMinutes,
      hourEnd: hourEndToMinutes,
    });

    return res.status(201).json({
      message: "Horário de funcionamento do estabelecimento criado.",
      hourStart,
      hourEnd,
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

router.put("/update/:id", async (req, res) => {
  const { id } = req.params;
  const { hourStart, hourEnd } = req.body;

  try {
    const hourStartToMinutes = await convertHourStringToMinutes(hourStart);
    const hourEndToMinutes = await convertHourStringToMinutes(hourEnd);

    await connection("hours_operation").where("id", "=", id).update({
      hourStart: hourStartToMinutes,
      hourEnd: hourEndToMinutes,
    });

    return res.status(200).json({
      message: "Horário de funcionamento do estabelecimento Atualizado.",
      hourStart,
      hourEnd,
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

module.exports = (app) => app.use("/hours-operation", router);
