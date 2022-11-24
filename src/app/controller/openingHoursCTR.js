const express = require("express");
const connection = require("../../database/connection");
const Yup = require("yup");

const authMiddleware = require("../middleware/auth");

const router = express.Router();

// Referencia dias das semana
// 0:Domingo | 1:Segunda-Feria | 2:Terça-Feira | ... 6:Sábado
const valueWeek = [0, 1, 2, 3, 4, 5, 6];

/**
 * Lista os horários de atendimento do estabelecimento
 * em formato JSON
 */
router.get("/", async (req, res) => {
  const openingHours = await connection("openingHours")
    .orderBy("week_id", "asc")
    .select("*");
  return res.json(openingHours);
});

router.use(authMiddleware);

/**
 * Cria um novo horário de atendimento
 */
router.post("/create", async (req, res) => {
  let openingHours = ({ week, week_id, start, end } = req.body);

  const schema = Yup.object({
    week: Yup.string().required(),
    week_id: Yup.number().required(),
    start: Yup.string().required(),
    end: Yup.string().required(),
  });

  // Checar se o codigo da semana que foi informado esta dentro do intervalo
  // 0:Domingo ... 6:Sábado || Fora do intervalo: -1
  if (!valueWeek.includes(week_id)) {
    openingHours = {
      ...openingHours,
      week_id: -1,
    };
  }

  if (!schema.isValidSync(openingHours)) {
    return res.json({ error: "Validation data" });
  }

  const insertId = await connection("openingHours").insert(openingHours, "id");

  return res.json({ id: insertId[0], ...openingHours });
});
/**
 * Excluir um horário de atendimento
 */
router.delete("/delete/:id", async (req, res) => {
  const { id } = req.params;
  const isDelete = await connection("openingHours")
    .where("id", "=", id)
    .delete();
  return res.json({
    success: Boolean(isDelete),
    message: isDelete ? "Item foi excluído." : "Falha ao excluir item.",
  });
});

/**
 * Atualizar os valores do horáiros
 */
router.put("/update/:id", async (req, res) => {
  const { id } = req.params;
  const openingHours = ({ week, week_id, start, end } = req.body);

  const schema = Yup.object({
    week: Yup.string().required(),
    week_id: Yup.number().required(),
    start: Yup.string().required(),
    end: Yup.string().required(),
  });

  if (!schema.isValidSync(openingHours)) {
    return res.json({ error: "Validation data" });
  }

  const isUpdate = await connection("openingHours")
    .where("id", "=", id)
    .update(openingHours);

  return res.json({
    success: Boolean(isUpdate),
    message: isUpdate ? "Item foi atualizado." : "Falha ao atualizar o item.",
  });
});

module.exports = (app) => app.use("/openingHours", router);
