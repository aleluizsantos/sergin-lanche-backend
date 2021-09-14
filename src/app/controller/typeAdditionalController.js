const express = require("express");
const connection = require("../../database/connection");
const authMiddleware = require("../middleware/auth");
const Yup = require("yup");

const router = express.Router();

// Listar o tipos de Adicionais
router.get("/", async (req, res) => {
  try {
    const typeAdditional = await connection("typeAdditional")
      .orderBy("id", "asc")
      .select("*");
    return res.json(typeAdditional);
  } catch (error) {
    return res.json({ error: error.message });
  }
});
// Criar o tipo de Adicional
router.post("/create", async (req, res) => {
  const typeAdditional = ({ description, manySelected } = req.body);

  const schema = Yup.object().shape({
    description: Yup.string().required(),
    manySelected: Yup.boolean().required(),
  });

  // Validar os dados
  if (!schema.isValidSync(typeAdditional))
    return res.json({ error: "Validation data" });

  try {
    // Inserir dados
    const insertId = await connection("typeAdditional").insert(
      typeAdditional,
      "id"
    );

    return res.json({ id: insertId[0], ...typeAdditional });
  } catch (error) {
    return res.json({ error: error.message });
  }
});
// Deletar o tipo de Adicional
router.delete("/delete/:id", async (req, res) => {
  const { id } = req.params;

  const isDelete = await connection("typeAdditional")
    .where("id", "=", id)
    .delete();
  return res.json({
    success: Boolean(isDelete),
    message: isDelete ? "Item foi excluído." : "Falha ao excluir item.",
  });
});
router.put("/edit/:id", async (req, res) => {
  const { id } = req.params;
  const typeAdditional = ({ description, manySelected } = req.body);

  const schema = Yup.object().shape({
    description: Yup.string().required(),
    manySelected: Yup.boolean().required(),
  });

  // Validar os dados
  if (!schema.isValidSync(typeAdditional))
    return res.json({ error: "Validation data" });

  try {
    await connection("typeAdditional")
      .where("id", "=", id)
      .update(typeAdditional);

    return res.json({ id: id, ...typeAdditional });
  } catch (error) {
    return res.json({ error: error.message });
  }
});

module.exports = (app) => app.use("/typeAdditional", router);
