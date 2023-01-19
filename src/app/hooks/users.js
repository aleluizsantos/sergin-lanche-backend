const connection = require("../../database/connection");

const users = {
  getUser: async (userId) => await user(userId),
  getUsers: async () => await userAll(),
};
module.exports = users;

const user = async (userId) => {
  return await connection("users")
    .where("id", "=", userId)
    .first()
    .select("id", "name", "email", "phone", "typeUser");
};

const userAll = async () => {
  return await connection("users").select(
    "id",
    "name",
    "email",
    "phone",
    "typeUser"
  );
};
