const connection = require("../../database/connection");
const express = require("express");

const authMiddleware = require("../middleware/auth");

const {
  getOrder,
  getAdditional,
  checkCalcTaxaDelivery,
  addToCommad,
} = require("../hooks/myOrders");

const { validationCoupon } = require("../utils/validationCupon");
const { pushNotificationUser } = require("../utils/pushNotification");

const router = express.Router();

router.use(authMiddleware);

router.get("/items/:id", async (req, res) => {
  const { id } = req.params; //Id do pedido;

  if (!Boolean(id))
    return res.json({ error: "Falta do parametro 'id' do pedido" });

  // Buscar a taxa de delivery
  const taxaDelivery = await connection("taxaDelivery").select("*").first();
  // Buscar todos os items do pedidos
  const itemsRequest = await connection("itemsRequets")
    .where("request_id", "=", id)
    .join("product", "itemsRequets.product_id", "product.id")
    .join("measureUnid", "product.measureUnid_id", "measureUnid.id")
    .select(
      "itemsRequets.*",
      "product.name",
      "measureUnid.unid as measureUnid"
    );

  // Buscar todos os adicionais do pedido
  const additionalItemOrder = await connection("additionalItemOrder")
    .where("request_id", "=", id)
    .join("additional", "additionalItemOrder.additional_id", "additional.id")
    .select(
      "additionalItemOrder.*",
      "additional.description",
      "additional.price"
    );

  // Juntar os items do pedido com os adicionais
  const itemsWithAdditional = itemsRequest.map((item) => {
    const addit = additionalItemOrder.filter(
      (additItem) => additItem.itemOrder_id === item.id
    );
    return {
      ...item,
      additional: addit,
    };
  });

  const dataItemRequest = {
    itemsRequest: itemsWithAdditional,
    taxaDelivery: taxaDelivery,
  };

  return res.json(dataItemRequest);
});
// Lista todos tipos de status de pedido, e informa quantos pedidos tem
// neste status
router.get("/group", async (req, res) => {
  try {
    const statusRequest = await connection("request")
      .groupBy("statusRequest_id", "statusRequest.description")
      .count("statusRequest_id as TotalStatus")
      .join("statusRequest", "request.statusRequest_id", "statusRequest.id")
      .select("request.statusRequest_id", "statusRequest.description");
    return res.status(200).json(statusRequest);
  } catch (error) {
    return res.status(500).json({ error: "Erro no servidor." });
  }
});
// Listar todos os pedidos especifico de um usuário
// http://dominio/request
router.get("/", async (req, res) => {
  const order = await getOrder(req);
  return res.json(order);
});
// Criar um pedido
// http://dominio/request
router.post("/create", async (req, res) => {
  const dataCurrent = new Date(); //Data atual
  const user_id = req.userId; //Id do usuário recebido no token;
  let vDiscount = 0;
  let vTaxaDelivery = 0;

  // Dados recebidos na requisição no body
  const {
    commads_id,
    table_id,
    name_client,
    deliveryType_id, // recebendo o id do tipo de entrega
    statusRequest_id = 1, //Status do pedido inicia como 1 'EM ANALISE'
    payment_id, // recebendo o id do tipo de pagamento
    coupon, //recebendo o cupom se tiver
    note,
    address,
    number,
    neighborhood,
    city,
    phone,
    uf,
    PointReferences,
    cash, //Troco
    timeDelivery,
    items, //recebendo um ARRAY de objetos de items do pedido e addicionais
  } = req.body;

  try {
    // Verificar no banco de dados se os valor dos item estão corretos
    // se não houve manipulação do frontend para backend
    const dataItems = await Promise.all(
      items.map(async (item) => {
        const dataPrice = await connection("product")
          .where("id", "=", item.product_id)
          .first()
          .select("price", "promotion", "pricePromotion");

        // Verificação se o produto encontra na promoção
        const priceProduct = dataPrice.promotion
          ? dataPrice.pricePromotion
          : dataPrice.price;

        const { listAdditinal, additionalSum } = await getAdditional(
          item.additionItem
        );

        return {
          amount: Number(item.amount),
          product_id: Number(item.product_id),
          price: priceProduct,
          AdditionalSum: additionalSum,
          note: item.note,
          additionalItem: listAdditinal,
        };
      })
    );

    // Calcular o total do carrinho
    let totalPur = await dataItems.reduce(function (total, item) {
      const amount = Number(item.amount);
      const price = Number(item.price) + Number(item.AdditionalSum);

      return total + amount * price;
    }, 0);

    // Checando a taxa de entrega
    vTaxaDelivery = await checkCalcTaxaDelivery(totalPur, deliveryType_id);

    // Total geral da Compra
    totalPur += vTaxaDelivery;

    // Se o tipo do pedido for Atendimento Mesa
    // Adiconar o valor na Commada
    addToCommad(commads_id, totalPur, deliveryType_id);

    //Verificação do cupom, autenticidade e validade
    if (coupon !== "") {
      const vcoupon = await validationCoupon(coupon);
      vDiscount = vcoupon.error ? 0 : Number(vcoupon.discountAmount);
    }

    // Montar os dados do pedido para ser inseridos
    const request = {
      dateTimeOrder: dataCurrent,
      totalPurchase: totalPur - vDiscount,
      cash: cash || 0,
      vTaxaDelivery: vTaxaDelivery,
      coupon,
      discount: vDiscount,
      note,
      timeDelivery: timeDelivery || "60-80 min",
      address,
      number,
      neighborhood,
      phone,
      city,
      uf,
      PointReferences,
      user_id: Number(user_id),
      deliveryType_id: Number(deliveryType_id),
      statusRequest_id: Number(statusRequest_id),
      payment_id: Number(payment_id),
      commads_id: Number(commads_id),
      table_id: table_id,
      name_client: name_client,
    };

    const trx = await connection.transaction();
    //Inserir o pedido
    const insertReq = await trx("request").insert(request, "id");
    // Capturar o id de do pedido que acabou de ser inserido
    const request_id = insertReq[0];
    // montar os dados do itens do pedido para ser inseridos
    const itemsRequest = dataItems.map((item) => {
      return {
        amount: Number(item.amount),
        price: Number(item.price),
        note: item.note,
        product_id: Number(item.product_id),
        request_id: Number(request_id),
      };
    });

    // Inserir os items do pedido retornando todos os id dos items
    const idItemsInsert = await trx("itemsRequets").insert(itemsRequest, "id");

    // Criar um array vazio para ser inserido os itens adicionais para serem inseridos
    let insertItemAddicional = [];

    // Para cada itens inserido, inserir o addicionais no banco
    for (const [idx, idItem] of idItemsInsert.entries()) {
      for (let index = idx; index <= idx; index++) {
        const element = dataItems[index];
        for (const addit of element.additionalItem) {
          insertItemAddicional.push({
            itemOrder_id: idItem,
            additional_id: addit.id,
            request_id: Number(request_id),
          });
        }
      }
    }

    // Inserir os items dos adicionais
    await trx("additionalItemOrder").insert(insertItemAddicional);

    // Efetivar a gravação se tudo ocorrer com sucesso na inserção do pedido e
    // dos itens casos contrário desfaça tudo
    await trx.commit();

    // Buscar todo o pedido que foi inserido
    getOrder(req).then((resp) => {
      // Pegar apenas o Pedido que foi feito
      const myOrder = resp.filter((item) => item.id === request_id);
      req.io.emit("CreateOrder", {
        CreateOrder: myOrder,
      });
    });

    // Retorna o Pedido e os itens
    return res.status(201).json({ request, itemsRequest });
  } catch (error) {
    console.log(error.message);
    return res.status(400).json({ error: error.message });
  }
});
//Criar item do pedido
router.post("/item", async (req, res) => {
  const { amount, price, product_id, request_id } = req.body;

  const newItemRequest = {
    amount: Number(amount),
    price: Number(price),
    product_id: Number(product_id),
    request_id: Number(request_id),
  };

  // Inserir o novo item
  await connection("itemsRequets").insert(newItemRequest);
  // Calcular o novo valor do pedido após incluir um item
  const result = await calcMyOrder(request_id);
  // Atualizar o pedido com o novo valor
  await connection("request")
    .where("id", "=", request_id)
    .update(result.dataOrder);
  // Retornar o pedido completo
  return res.json(result);
});
// Alterar quantidade dos itens do pedido após a preparação
router.put("/itemChanger", async (req, res) => {
  let changerAmount = false;

  const { myOrder, items } = req.body;

  try {
    // Altarar a Tabela pedido 'request'
    await connection("request").where("id", "=", myOrder.id).update({
      vTaxaDelivery: myOrder.taxaDelivery,
      totalPurchase: myOrder.totalPurchase,
      discount: myOrder.discount,
    });

    // Buscar todos os item do pedido
    const itemCurrent = await connection("itemsRequets")
      .where("request_id", "=", myOrder.id)
      .select("*");

    // Percorrer todo array da Tabela itemPedido checando se houve alteração na quantidade
    itemCurrent.forEach(async (itemCurrent) => {
      const changeItem = items.find(
        (itemChange) => itemChange.product_id === itemCurrent.product_id
      );
      if (Number(itemCurrent.amount) !== Number(changeItem.amount)) {
        changerAmount = true;
        //Atualizar com a nova quantidade na tabela item do pedido
        await connection("itemsRequets")
          .where("id", "=", itemCurrent.id)
          .update({ amount: changeItem.amount });
      }
    });

    // Checar se houve alteraçaõ na quantidade notificar cliente
    if (changerAmount)
      pushNotificationUser(
        myOrder.user_id,
        "Houve alteração em seu pedido, verifique as alterações em seu app."
      );

    return res.status(200).json(true);
  } catch (error) {
    console.log(error.message);
    return res.json({ error: error.message });
  }
});
// Alterar Status de um Pedido pedido
// http://dominio/request
router.put("/", async (req, res) => {
  // FASE DO DELIVERY
  // 1=>Em análise | 2=>Em Preparação | 3=>Rota de Entrega | 6=>Finalizado
  // 1=>Em análise | 2=>Em Preparação | 4=>Retirar na Loja | 6=>Finalizado

  const { id, user_id, nextStage, deliveryType_id } = req.body;

  if (!id) return res.json({ error: "Falta de parametro" });

  let stage = nextStage;

  // VERIFICAR SE O TIPO DE ENTREGA É 1=DELIVERY
  if (deliveryType_id === 1) {
    if (nextStage === 4) stage = 6;
  }
  // VERIFICAR SE O TIPO DE ENTREGA É 2=RETIRADA NA LOJA
  if (deliveryType_id === 2) {
    if (nextStage === 3) stage = 4;
    if (nextStage === 5) stage = 6;
  }

  let nextActionRequest;
  let descriptionNextActionRequest;
  let message;
  // Alteração do STATUS
  switch (stage) {
    // PEDIDO RECEBIDO - EM ANÁLISE
    case 1:
      nextActionRequest = 1; // status 'EM PREPARAÇÃO'
      descriptionNextActionRequest = "Em Preparação";
      message = "Recebemos seu pedido, já estamos encaminhado para preparo.";
      break;
    // PEDIDO EM PREPARAÇÃO
    case 2:
      nextActionRequest = 2; // status 'EM PREPARAÇÃO'
      descriptionNextActionRequest = "Em Preparação";
      message = "Pedido recebido em fila de preparação.";
      break;
    // ROTA DE ENTREGA
    case 3:
      // DELIVERY
      nextActionRequest = 3; // status 'ROTA DE ENTREGA'
      descriptionNextActionRequest = "Rota de Entrega";
      message = "Seu pedido está em rota de entrega.";
      break;
    // RETIRAR NA LOJA
    case 4:
      // Retirada
      nextActionRequest = 4; // status 'RETIRAR NA LOJA'
      descriptionNextActionRequest = "Retirar na Loja";
      message = "Seu pedido está pronto para ser retirado na loja.";
    case 5:
      nextActionRequest = 5; // status 'Agenda'
      descriptionNextActionRequest = "Agendado";
      message = "Pedido agendado, obrigado pela preferência.";
      break;
    // Retirada Realizada
    case 6:
      nextActionRequest = 6; // status 'FINALIADO' - Retirada concluída
      descriptionNextActionRequest = "Finalizado";
      message = "Pedido Finalizado, obrigado pela preferência.";
      break;
    default:
      break;
  }

  try {
    // Atualizar o status do pedido
    const upgradeRequest = await connection("request")
      .where("id", "=", id)
      .update({ statusRequest_id: stage });

    // Enviar pushNotification para o usuário
    stage > 1 && pushNotificationUser(user_id, message);

    // Enviar notificação via socket-io
    req.io.emit("Update", { update: Date.now(), userId: user_id });

    return res.status(200).json({
      success: Boolean(upgradeRequest),
      user_id: user_id,
      nextState: nextActionRequest,
      descriptionNextActionRequest: descriptionNextActionRequest,
    });
  } catch (error) {
    return res.json(error.message);
  }
});
// Alterar colocar com true a impressão
// http://dominio/request/:id
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  // Atualizar a impressão do cupom
  const upgradeRequest = await connection("request")
    .where("id", "=", id)
    .update({ print: true });

  // Enviar notificação via socket-io
  req.io.emit("Update", { update: Date.now() });

  return res.json({ success: upgradeRequest });
});
// Excluir um item do pedido
router.delete("/delete/item/:requestId/:itemId", async (req, res) => {
  const { requestId, itemId } = req.params;

  try {
    // Exluir o item do pedido
    await connection("itemsRequets")
      .where("id", "=", itemId)
      .where("request_id", "=", requestId)
      .delete();

    // Calcular o nova valor do pedido e retorna o pedido completo
    const result = await calcMyOrder(requestId);

    // Atualizar o pedido com o novo valor após excluir o item
    await connection("request")
      .where("id", "=", requestId)
      .update(result.dataOrder);

    return res.json(result);
  } catch (error) {
    return res.json({ error: error.message });
  }
});
// Excluir um pedido
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    // Excluir o pedido
    const isDelete = await connection("request").where("id", "=", id).delete();

    return res.json({ success: Boolean(isDelete) });
  } catch (error) {
    return res.json({ error: error.message });
  }
});
//Calcular o valor do pedido
async function calcMyOrder(request_id) {
  let grandTotal = 0;
  let totalPurchase = 0;
  let totalAdditional = 0;
  let vTaxaDelivery = 0;
  let vDiscount = 0;

  // Buscar todos os dados do Pedido
  const order = await connection("request")
    .where("id", "=", request_id)
    .first();

  //Verificação do cupom, autenticidade e validade
  if (order.coupon) {
    const coupon = await validationCoupon(order.coupon);
    // Se possui um coupon válido setar o valor senão seta ZERO
    vDiscount = coupon.error ? 0 : Number(coupon.discountAmount);
  }

  // Buscar Valor minimo do pedido e o valor da Taxa de entrega
  const { vMinTaxa, taxa } = await connection("taxaDelivery").first();

  // Buscar todos os item do pedido
  const itemsMyOrder = await connection("itemsRequets")
    .where("request_id", "=", request_id)
    .join("product", "itemsRequets.product_id", "product.id")
    .join("measureUnid", "product.measureUnid_id", "measureUnid.id")
    .select(
      "itemsRequets.*",
      "product.name",
      "measureUnid.unid as measureUnid"
    );
  // Buscar todos os addicionais do pedido
  const additionalItem = await connection("additionalItemOrder")
    .where("request_id", "=", request_id)
    .join("additional", "additionalItemOrder.additional_id", "additional.id")
    .select(
      "additionalItemOrder.*",
      "additional.description",
      "additional.price"
    );
  // Juntar os adicionais com seus respectivos items do pedido
  const joinData = itemsMyOrder.map((item) => {
    const addit = additionalItem.filter(
      (addit) => addit.itemOrder_id === item.id
    );
    return { ...item, additional: addit };
  });

  // Calcular o valor do pedido
  joinData.forEach((element) => {
    totalPurchase += element.amount * element.price;
    totalAdditional += element.additional.reduce(
      (total, item) => total + element.amount * Number(item.price),
      0
    );
  });

  // Checar se o total gasto é maior ou igual a taxa minima de entrega
  vTaxaDelivery =
    totalPurchase + totalAdditional >= vMinTaxa ? 0 : parseFloat(taxa);

  // Somando total Geral do pedido
  grandTotal = totalPurchase + totalAdditional + vTaxaDelivery - vDiscount;

  // Atualizar o TotalPurchase e o VTaxaDelivery após a alteração de um item
  const dataOrder = {
    ...order,
    totalPurchase: grandTotal,
    vTaxaDelivery,
    discount: vDiscount,
  };

  return {
    dataOrder,
    items: joinData,
    grandTotal,
    totalPurchase,
    totalAdditional,
    vTaxaDelivery,
    vDiscount,
  };
}

module.exports = (app) => app.use("/request", router);
