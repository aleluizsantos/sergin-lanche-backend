const fetch = require("cross-fetch");
const connection = require("../../database/connection");

const pushNotification = async (token, title, msg) => {
  const message = {
    to: token,
    sound: "default",
    title: title || "Sergin Lanches 🍔",
    body: msg,
  };

  try {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });
  } catch (error) {
    console.log(error);
  }
};

module.exports = {
  // Push Notification: usuário específico
  async pushNotificationUser(userId, msg) {
    const user = await connection("users").where("id", "=", userId).first();
    const { tokenPushNotification } = user;
    pushNotification(tokenPushNotification, msg);
  },
  /**
   * Push Notifivication grupo de usuários
   * @param {Array} users Lista de token para enviar push
   * @param {String} message Mensagem a ser enviada para o grupo
   */
  async pushNotificationGruop(users, title = "", message) {
    // Enviar push para todos os usuários
    users.map(async (user) => {
      await pushNotification(user, title, message);
    });
  },
};
