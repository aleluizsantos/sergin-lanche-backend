const express = require("express");
const connection = require("../../database/connection");
const Yup = require("yup");

const authMiddleware = require("../middleware/auth");
const { generete_uuidv4 } = require("../hooks/utils");
const { getOrder } = require("../hooks/myOrders");

const router = express.Router();

const schemaTable = Yup.object().shape({
  amountofplace: Yup.number().integer().required().min(0).max(100),
});

const shcemaUUID = Yup.object().shape({
  tokenoperation: Yup.string().uuid(),
});

const schemaCommads = Yup.object().shape({
  name_client: Yup.string().required("Nome do cliente obrigatório"),
  table_id: Yup.number().integer().required("Número da mesa obrigatório"),
  tokenoperation: Yup.string().uuid(),
});

router.use(authMiddleware);

/**
 * ROUTER: http://host/table
 * Retornar todas as mesas cadastada com as comandas vinculadas
 * Parameters: Authorization Bearer<Token>
 */
router.get("/", async (req, res) => {
  const tables = await connection("table").orderBy("id");
  const commads = await connection("commads")
    .where("paidOut", "=", false)
    .select(
      "id as id_commads",
      "name_client",
      "created_at",
      "paidOut",
      "table_id",
      "totalValueToOrder",
      "tokenOperation"
    );

  const joinTableWithCommads = await Promise.all(
    tables.map(async (table) => {
      const comm = commads.filter((commads) => commads.table_id === table.id);

      // Calcular total da mesa
      let tableGrandTotal = await comm.reduce(function (total, itemComm) {
        return total + Number(itemComm.totalValueToOrder);
      }, 0);

      return {
        ...table,
        tableGrandTotal,
        commads: comm,
      };
    })
  );

  return res.status(200).json(joinTableWithCommads);
});

/**
 * ROUTER: http://host/table/create
 * Criar measas
 * Parameters:
 * Authorization Bearer<Token> | HEADERS
 * amountofplace <Number> inteiro entre 1 a 100 | BODY
 * repeat <Number> inteiro | BODY
 */
router.post("/create", async (req, res) => {
  try {
    const { amountofplace, repeat } = req.body;

    if (!schemaTable.isValidSync({ amountofplace }))
      return res.status(400).json({ error: "Valor incorreto." });

    let tables = [];
    let i = 0;

    while (i < repeat) {
      tables.push({ amount: amountofplace });
      i++;
    }

    // tables.length && (await connection("table").insert(tables));

    return res
      .status(201)
      .json({ success: `${repeat} novas mesas foram criadas` });
  } catch (error) {
    return res.status(400).json(error.message);
  }
});

/**
 * ROUTER: http://host/table/delete
 * Deletar measas
 * Parameters:
 * Authorization Bearer<Token> | HEADERS
 * tableDelete <Array> | BODY
 */
router.delete("/delete", async (req, res) => {
  const { tableDelete } = req.body;

  try {
    const hasDelete = await connection("table")
      .whereIn("id", tableDelete)
      .delete();

    return res.json({ delete: `Foram apagados '${hasDelete}' registro` });
  } catch (error) {
    return res.status(400).json(error.message);
  }
});

/**
 * ROUTER: http://host/table/commads/items
 * Retorna todos os Pedidos com seus items referente a commada
 * Parameters:
 * Authorization Bearer<Token> | HEADERS
 * commads_id <string> | HEADERS
 * statusrequest <string> | HEADERS
 */
router.get("/commads/items", async (req, res) => {
  const { commads_id, statusrequest } = req.headers;

  // Checar se foi enviado no parametros os OperationToken e Idcommads
  if (!commads_id || !statusrequest)
    return res.status(400).json({
      error:
        "Parametro incorreto, espera o 'idCommads' e statusRequest no Headers",
    });

  // Buscar todos os pedidos com os item da comanda
  const myOrder = await getOrder(req);

  return res.status(200).json(myOrder);
});

/**
 * ROUTER: http://host/table/${idtable}/commads/create
 * Criar um comanda
 * Parameters:
 * Authorization Bearer<Token> | HEADERS
 * idtable <string> | PARAMS
 * tokenoperation <uuid>| HEADERS
 * nameclient <string> | BODY
 */
router.post("/:idtable/commads/create/", async (req, res) => {
  const { idtable } = req.params;
  const { tokenoperation } = req.headers;
  const { nameclient } = req.body;

  let tokenOp = tokenoperation;

  // Verificar se a mesa esta OCULPADA
  const isTable = await connection("table").where("id", "=", idtable).first();

  // Se estiver Desoculpada
  // Atualizar o Perfil da Mesa para Busy=true e gerar tokeOperation
  if (!isTable.busy) {
    tokenOp = await generete_uuidv4();
    // Atualizar o perfil da MESA para OCULPADA
    await connection("table").where("id", "=", idtable).update({
      busy: true,
      tokenOperation: tokenOp,
    });
  }

  // Validação do token
  if (!shcemaUUID.isValidSync({ tokenoperation: tokenOp }))
    return res.status(400).json({
      error: "Parâmetro obrigatório 'tokenOperation' faltando o incorreto",
    });

  // Nova comanda
  const commadsNew = {
    name_client: nameclient,
    table_id: idtable,
    tokenOperation: tokenOp,
    totalValueToOrder: 0,
  };

  // Validação dos dados
  if (!schemaCommads.isValidSync(commadsNew))
    return res.status(400).json({ error: "Valor incorreto." });

  const commadsID = await connection("commads").insert(commadsNew, "id");

  return res.json({ commadsID: commadsID[0], ...commadsNew });
});

/**
 * Atualizar a commanda com Pago
 * Parameters:
 * Authorization: Bearrer<token> | HEADERS
 * idCommads <string> | PARAMS
 */
router.put("/commads/payment/:idCommads", async (req, res) => {
  const { idCommads } = req.params;
  const { tokenoperation } = req.headers;

  try {
    if (!shcemaUUID.isValidSync({ tokenoperation }))
      return res.status(400).json({
        error: "Parâmetro obrigatório 'tokenOperation' faltando o incorreto",
      });

    const hasUpgradeCommads = await connection("commads")
      .where("paidOut", "=", false)
      .where("id", "=", idCommads)
      .where("tokenOperation", "=", tokenoperation)
      .update({ paidOut: true });

    if (!hasUpgradeCommads)
      return res
        .status(400)
        .json({ error: "Dados incorretos, verifique os parametro passados" });

    // Verificar se existe commadas abertas
    const hasCommads = await connection("commads")
      .where("tokenOperation", "=", tokenoperation)
      .where("paidOut", "=", false);

    // Não possui mais nenhuma commada ABERTA
    if (hasCommads.length <= 0) {
      // LIBERAR A MESA
      await connection("table")
        .where("tokenOperation", "=", tokenoperation)
        .update({
          busy: false,
          tokenOperation: null,
        });
    }

    return res.json({
      table_busy: hasCommads.length <= 0 ? "MESA LIBERADA" : "MESA OCULPADA",
      message: hasUpgradeCommads
        ? `Realizado pagamento da comanda '${idCommads}'.`
        : "Dados incorretos",
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

module.exports = (app) => app.use("/table", router);
