const connection = require("../../database/connection");
const { getUser } = require("../hooks/users");

const useOrder = {
  /**
   * Retorna uma lista com os pedidos
   * @param {Request} request - parametro HEADER: statusrequest
   * @returns {JSON} retorna um json com os pedidos
   */
  getOrder: async (request) => await orders(request),
  /**
   * Retorna uma listagem somente os itens dos pedidos
   * @param {array} orderId array example [{ id: 5 }, ...] contendo os ID dos pedidos
   * @returns {JSON} Json com os itens do pedido.
   */
  getItemOrder: async (orderId) => listItemOrder(orderId),
};
module.exports = useOrder;

const orders = async (request) => {
  try {
    // Pegar o Id do usuário que esta vindo na requisição
    const userId = request.userId;
    // Identificar o tipo do perfil do usuário
    const { typeUser } = await getUser(userId);

    const listOrder =
      typeUser === "admin"
        ? await listAllOrder(request) // Administrador
        : await listOrderUser(request, userId); // Usuário

    return listOrder;
  } catch (error) {
    return { error: error.message };
  }
};
// Listar todos os pedidos modo ADMINISTRADOR
const listAllOrder = async (request) => {
  try {
    const { statusrequest } = request.headers; //Recebendo um STRING de Status de Pedido

    let arrayStatusreq = [];
    // Convertendo a String em um ARRAY
    if (!statusrequest) {
      arrayStatusreq = [1];
    } else {
      arrayStatusreq = statusrequest.split(",").map((req) => req.trim());
    }

    const response = await connection("request")
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
        "payment.type As payment"
      )
      .orderBy("request.dateTimeOrder", "desc");

    const itemOrder = await listItemOrder(response);

    return itemOrder;
  } catch (error) {
    return { error: error.message };
  }
};
// Listar todos os pedidos modo USUÁRIO
const listOrderUser = async (request, userId) => {
  try {
    const { statusrequest } = request.headers; //Recebendo um STRING de Status de Pedido
    let arrayStatusreq;
    // Convertendo a String em um ARRAY
    if (!statusrequest) {
      arrayStatusreq = [1, 2, 3, 4, 5, 6];
    } else {
      arrayStatusreq = statusrequest.split(",").map((req) => req.trim());
    }
    const response = await connection("request")
      .where("user_id", "=", userId)
      .whereIn("statusRequest_id", arrayStatusreq)
      .join("deliveryType", "request.deliveryType_id", "deliveryType.id")
      .join("statusRequest", "request.statusRequest_id", "statusRequest.id")
      .join("payment", "request.payment_id", "payment.id")
      .select(
        "request.*",
        "deliveryType.description As deliveryType",
        "statusRequest.description As statusRequest",
        "statusRequest.BGcolor",
        "payment.type As payment"
      )
      .orderBy("request.id", "desc");

    const itemOrder = await listItemOrder(response);
    return itemOrder;
  } catch (error) {
    return { error: error.message };
  }
};
// Listar os itens do pedido
const listItemOrder = async (order) => {
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
          return {
            ...items,
            total: Number(items.price) * Number(items.amount),
            additional: additonalItensOrders.filter(
              (elem) => elem.itemOrder_id === items.idItem
            ),
          };
        }),
    };
  });

  return joinMyOrderWithItemsAddit;
};
