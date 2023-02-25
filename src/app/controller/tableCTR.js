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

router.get("/:id", async (req, res) => {
  const { id } = req.params;
  const tables = await connection("table").where("id", "=", id).orderBy("id");
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
 * CRIAR MESA
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

    tables.length && (await connection("table").insert(tables));

    return res
      .status(201)
      .json({ success: `${repeat} novas mesas foram criadas` });
  } catch (error) {
    return res.status(400).json(error.message);
  }
});

/**
 * ROUTER: http://host/table/delete
 * DELETAR MESA
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
 * RETORNA TODOS OS PEDIDOS COM SEUS ITEMS REFERENTE A COMMADA
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
 * CRIAR UMA COMANDA
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
    paidOut: false,
    created_at: new Date(),
    tokenOperation: tokenOp,
    totalValueToOrder: 0,
  };

  // Validação dos dados
  if (!schemaCommads.isValidSync(commadsNew))
    return res.status(400).json({ error: "Valor incorreto." });

  const id_commads = await connection("commads").insert(commadsNew, "id");

  return res.json({ id_commads: id_commads[0], ...commadsNew });
});

/**
 * ROUTER: http://host/table/commads/delete/${idcommads}
 * EXCLUIR UMA COMANDA
 * Parameters:
 * Authorization Bearer<Token> | HEADERS
 * idCommad <string> | PARAMS
 */
router.delete("/commads/delete/:idCommad", async (req, res) => {
  const { idCommad } = req.params;
  try {
    const { totalValueToOrder, tokenOperation } = await connection("commads")
      .where("id", "=", idCommad)
      .first();

    // Verificar se a comanda possui conta para ser paga
    const haveAnAccount = Number(totalValueToOrder) > 0 ? true : false;
    // Caso tenha um conta retorna que o pagamento é necessário
    if (haveAnAccount)
      return res.status(402).json({ message: "Pagamento requerido." });

    // Caso não possua conta exclui a comanda
    const hasDelete = await connection("commads")
      .where("id", "=", idCommad)
      .delete();

    // Verificar se existe commadas abertas
    const hasCommads = await connection("commads")
      .where("tokenOperation", "=", tokenOperation)
      .where("paidOut", "=", false);

    // Não possui mais nenhuma commada ABERTA
    if (hasCommads.length <= 0) {
      // LIBERAR A MESA
      await connection("table")
        .where("tokenOperation", "=", tokenOperation)
        .update({
          busy: false,
          tokenOperation: null,
        });
    }

    return res.status(200).json({
      message: hasDelete ? "Exclusão com sucesso." : "Falha na exclusão",
    });
  } catch (error) {
    return res.status(400).json(error.message);
  }
});

/**
 * ATUALIZAR A COMMANDA COM PAGO
 * Parameters:
 * Authorization: Bearrer<token> | HEADERS
 * typePayment <string> | HEADERS
 * idCommads <string> | PARAMS
 */
router.put("/commads/payment/:idCommads", async (req, res) => {
  const { idCommads } = req.params;
  const { type_payment, tokenoperation, cash } = req.body;

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

    // Atualizar o table de Pedidos colocando o modo de pagamento efetuado
    // Se a comanda foi atualizada atualizar também a tabela pedido
    if (hasUpgradeCommads) {
      await connection("request")
        .where("commads_id", "=", idCommads)
        .update({
          statusRequest_id: 6,
          payment_id: type_payment,
          cash: cash || 0,
        });
    }

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
