const connection = require("../../database/connection");
const { getUser } = require("../hooks/users");

const useOrder = {
  /**
   * Retorna uma lista com os pedidos
   * @param {Request} request - Recebe a requisição BODY e parametro HEADER: statusrequest
   * @returns {JSON} retorna um json com os pedidos
   */
  getOrder: async (request) => await orders(request),
  /**
   * Retorna uma listagem somente os itens dos pedidos
   * @param {array} orderId array example [{ id: 5 }, ...] contendo os ID dos pedidos
   * @returns {JSON} Json com os itens do pedido.
   */
  getItemOrder: async (orderId) => listItemOrder(orderId),

  /**
   * Retorna uma lista dos adicionais e o valor total deles.
   * @param {String} additional Recebe os ID dos adicionais selecionado
   * @returns {object} Objeto contendo 'listAdditinal', 'additionalSum'
   */
  getAdditional: async (additional) => listAdditionalStringObject(additional),

  /**
   * Calcula a taxa de entrega
   * @param {Number} totalPurchase Total geral da compra
   * @param {Number} typeDelivery Tipo do pedido
   * @returns {Number} taxa de entrega
   */
  checkCalcTaxaDelivery: async (totalPurchase, typeDelivery) =>
    taxaDelivery(totalPurchase, typeDelivery),

  /**
   * Adiciona o total da compra na comada do cliente
   * @param {number} idCommad Id da comanda do cliente
   * @param {number} totalPurchase Total da compra
   * @param {number} typeDelivery Id do tipo de entrega
   * @returns {void} void
   */
  addToCommad: (idCommad, totalPurchase, typeDelivery) =>
    sumAndAddToCommad(idCommad, totalPurchase, typeDelivery),
};

module.exports = useOrder;

// Retorna a TAXA de entrega do pedido
async function taxaDelivery(totalPurchase, typeDelivery) {
  // Validação do parametros
  if (!typeDelivery || totalPurchase < 0) return 0;

  const { hastaxa } = await connection("deliveryType")
    .where("id", "=", typeDelivery)
    .first();

  if (!hastaxa) return 0;

  const { vMinTaxa, taxa } = await connection("taxaDelivery").first();

  return totalPurchase < vMinTaxa && vMinTaxa > 0 ? taxa : 0;
}
// Retorna a lista dos pedidos, conforme o tipo de usuários
async function orders(request) {
  try {
    // Pegar o Id do usuário que esta vindo na requisição
    const userId = request.userId;
    // Identificar o tipo do perfil do usuário
    const { typeUser } = await getUser(userId);

    const listOrder =
      typeUser === "admin" || typeUser === "attendant"
        ? await listAllOrder(request) // Administrador
        : await listOrderUser(request, userId); // Usuário

    return listOrder;
  } catch (error) {
    return { error: error.message };
  }
}
// Listar todos os pedidos modo ADMINISTRADOR
async function listAllOrder(request) {
  try {
    const { statusrequest, commads_id } = request.headers; //Recebendo um STRING de Status de Pedido
    // Verificar se foi passado o ID da comanda
    const hasIdCommads = typeof commads_id === "undefined" ? false : true;

    let arrayStatusreq = [];
    // Convertendo a String em um ARRAY
    if (!statusrequest) {
      arrayStatusreq = [1];
    } else {
      arrayStatusreq = statusrequest.split(",").map((req) => req.trim());
    }

    const response = await connection("request")
      .whereIn("statusRequest_id", arrayStatusreq)
      .where((qb) => hasIdCommads && qb.where("commads_id", "=", commads_id))
      .join("users", "request.user_id", "users.id")
      .join("deliveryType", "request.deliveryType_id", "deliveryType.id")
      .join("statusRequest", "request.statusRequest_id", "statusRequest.id")
      .join("payment", "request.payment_id", "payment.id")
      .select(
        "request.*",
        "users.name",
        "users.email",
        "users.phone As phoneOperator",
        "deliveryType.description As deliveryType",
        "statusRequest.description As statusRequest",
        "statusRequest.BGcolor",
        "payment.type As payment",
        "payment.image"
      )
      .orderBy("request.dateTimeOrder", "desc");

    const serialezeOrder = response.map((item) => {
      return {
        ...item,
        image: `${process.env.HOST}/uploads/${item.image}`,
      };
    });

    const itemOrder = await listItemOrder(serialezeOrder);

    return itemOrder;
  } catch (error) {
    return { error: error.message };
  }
}
// Listar todos os pedidos modo USUÁRIO
async function listOrderUser(request, userId) {
  try {
    const { statusrequest } = request.headers; //Recebendo um STRING de Status de Pedido
    let arrayStatusreq;
    // Convertendo a String em um ARRAY
    if (!statusrequest) {
      arrayStatusreq = [1];
    } else {
      arrayStatusreq = statusrequest.split(",").map((req) => req.trim());
    }
    const response = await connection("request")
      .where("user_id", "=", userId)
      .whereIn("statusRequest_id", arrayStatusreq)
      .join("users", "request.user_id", "users.id")
      .join("deliveryType", "request.deliveryType_id", "deliveryType.id")
      .join("statusRequest", "request.statusRequest_id", "statusRequest.id")
      .join("payment", "request.payment_id", "payment.id")
      .select(
        "request.*",
        "users.name",
        "users.email",
        "users.phone",
        "deliveryType.description As deliveryType",
        "statusRequest.description As statusRequest",
        "statusRequest.BGcolor",
        "payment.type As payment",
        "payment.image"
      )
      .orderBy("request.id", "desc");

    const serialezeOrder = response.map((item) => {
      return {
        ...item,
        image: `${process.env.HOST}/uploads/${item.image}`,
      };
    });

    const itemOrder = await listItemOrder(serialezeOrder);
    return itemOrder;
  } catch (error) {
    return { error: error.message };
  }
}
// Listar os ITEMS DO PEDIDO
async function listItemOrder(order) {
  // Criar um array com todos os Id dos pedidos
  const ordersId = order.map((item) => item.id);
  // GET: todos Itens do pedidos que estão na relação dos Ids 'ordersId'
  const itensOrders = await connection("itemsRequets")
    .whereIn("request_id", ordersId)
    .join("product", "itemsRequets.product_id", "product.id")
    .select(
      "itemsRequets.id as idItem",
      "itemsRequets.amount",
      "itemsRequets.price",
      "itemsRequets.note",
      "itemsRequets.request_id",
      "product.name as product"
    )
    .orderBy("itemsRequets.request_id");

  // GET: Adicionais dos item de cada pedido
  const additonalItensOrders = await connection("additionalItemOrder")
    .whereIn("request_id", ordersId)
    .join("additional", "additionalItemOrder.additional_id", "additional.id")
    .select(
      "additionalItemOrder.itemOrder_id",
      "additional.description",
      "additional.price"
    )
    .orderBy("additionalItemOrder.additional_id");
  // Converter em um ARRAY objetos contendo PEDIDO>ITENS>ADICIONAIS_ITENS
  const joinMyOrderWithItemsAddit = order.map((myOrders) => {
    return {
      ...myOrders,
      item: itensOrders
        .filter((itemOrder) => itemOrder.request_id === myOrders.id)
        .map((items) => {
          const addit = additonalItensOrders.filter(
            (elem) => elem.itemOrder_id === items.idItem
          );
          const additionalSum = addit.reduce(
            (acc, item) => acc + Number(item.price),
            0
          );

          return {
            ...items,
            total: (Number(items.price) + additionalSum) * Number(items.amount),
            totalAdditional: additionalSum,
            additional: addit,
          };
        }),
    };
  });

  return joinMyOrderWithItemsAddit;
}
// Retorna a lista de ADICIONAIS  e a soma de todos eles
async function listAdditionalStringObject(additional) {
  if (additional === "") return { listAdditinal: [], additionalSum: 0 };

  // Converter a string que contém o itens adicionais em ARRAY
  const itemAddit = additional.split(",").flat(Infinity);

  // Buscar todos os dados dos adicionais escolhido
  const listAdditinal = await connection("additional").whereIn("id", itemAddit);

  // soma de Todos os Adicionais
  const additionalSum = listAdditinal.reduce(
    (acc, item) => acc + Number(item.price),
    0
  );

  return { listAdditinal, additionalSum };
}

async function sumAndAddToCommad(idCommad, totalPurchase, typeDelivery) {
  // Validação do parametros
  if (!idCommad || !typeDelivery || totalPurchase < 0) return;

  // Verificar se o tipo de pedido e Atendimento Mesa = 3
  if (typeDelivery === 3) {
    // Buscar os dados da commada
    const totalOrderValue = await connection("commads")
      .where("id", "=", idCommad)
      .first();

    const commadTotal =
      Number(totalOrderValue.totalValueToOrder) + Number(totalPurchase);

    // Atualizar a table da comanda
    await connection("commads").where("id", "=", idCommad).update({
      totalValueToOrder: commadTotal,
    });
  }
}
