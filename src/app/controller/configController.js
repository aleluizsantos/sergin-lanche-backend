const connection = require("../../database/connection");
const express = require("express");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

router.use(authMiddleware);

router.get("/", async (req, res) => {
  const myConfig = await connection("config").select("config").first();
  return res.status(200).json(myConfig.config);
});

router.put("/", async (req, res) => {
  const json = req.body;

  if (!!!Object.keys(json).length)
    return res
      .status(400)
      .json({ error: "Missing information in the request body" });

  try {
    const upgradeConfig = await connection("config").update({ config: json });
    return res.json({
      message: !!upgradeConfig
        ? "Atualizado com sucesso"
        : "Falha na atualização",
    });
  } catch (error) {
    res.json({ error: error.message });
  }

  return res.status(200).json(json);
});

module.exports = (app) => app.use("/config", router);
