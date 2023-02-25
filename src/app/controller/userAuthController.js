const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const authMiddleware = require("../middleware/auth");
const connection = require("../../database/connection");
const router = express.Router();

//Gerar token
function generateToken(params = {}) {
  return jwt.sign(params, process.env.AUTH_SECRET, {
    expiresIn: "365d",
  });
}

// Checar se o usuário é administrador
async function checkTokenAdmin(token) {
  try {
    const [scheme, token_user] = token.split(" ");
    if (!/^Bearer$/i.test(scheme)) return false;
    // Validando o TOKEN
    const { id } = jwt.verify(token_user, process.env.AUTH_SECRET);
    // Verificar se o usuário é um administrador
    const isAdmin = await connection("users")
      .where("id", "=", id)
      .where("typeUser", "=", "admin")
      .first();

    return isAdmin ? true : false;
  } catch (error) {
    return false;
  }
}

router.get("/checkToken/:token", async (req, res) => {
  // const user_id = req.userId;
  const { token } = req.params;

  let valueToken = token;

  const parts = token.split(" "); //Separar as duas partes
  //Realizar destruturação separando o Bearer e token
  const [scheme, mytoken] = parts;

  if (/^Bearer$/i.test(scheme)) valueToken = mytoken;
  //Fazer a verificação do token usando jwt-(Json Web Token)
  jwt.verify(valueToken, process.env.AUTH_SECRET, async (err) => {
    if (err)
      return res.json({
        status: false,
        message: "Token inválido, Realize o login, ou recadstre novamente.",
      });

    return res.json({ status: true, message: "Token válido." });
  });
});

// Criar um usuário
// http://dominio/auth/register
router.post("/register", async (req, res) => {
  const { authorization } = req.headers;
  const {
    name,
    email,
    phone,
    password,
    tokenPushNotification,
    type_user = "user",
  } = req.body;

  // Verificar se todos os paramentos obrigatórios foram passados
  if (name === "" || email === "" || phone === "" || password === "")
    return res.status(400).send({ error: "campos obrigatórios" });

  // Verificar se foi passado um token
  if (typeof authorization === "undefined")
    return res.json({ message: "No token defined" });

  // Cryptografar a senha
  const crypPassword = await bcrypt.hash(password, 10);

  let user = {
    name,
    email,
    phone,
    typeUser: "user",
    password: crypPassword,
    tokenPushNotification,
  };

  try {
    const isTokenValid = await checkTokenAdmin(authorization);

    // o tipo de usuário pode ser alterado somente se o usuário for administrador
    if (isTokenValid) {
      user = { ...user, typeUser: type_user };
    } else
      return res
        .status(400)
        .send({ error: "Token inválido ou usuário não tem permissão." });

    // Salvar o usuário
    try {
      user = await connection("users")
        .returning([
          "id",
          "blocked",
          "created_at",
          "email",
          "name",
          "password",
          "passwordResetExpires",
          "passwordResetToken",
          "phone",
          "tokenPushNotification",
          "typeUser",
        ])
        .insert(user);
    } catch (error) {
      return res.status(400).json({ message: "E-mail informado já em uso." });
    }

    return res.json(user[0]);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});
// Autenticação de usuário
// http://dominio/auth/authenticate
router.post("/authenticate", async (req, res) => {
  const { email, password } = req.body;

  if (email === "" || password === "")
    return res.status(401).send({ error: "Email ou senha em branco" });

  const user = await connection("users")
    .where("email", "=", email)
    .select("*")
    .first();
  //Verificação se o usuário esta cadastrado
  if (user === undefined)
    return res.status(401).send({ error: "Usuário não cadastrado" });

  // Verificação se passoword esta correto
  if (!(await bcrypt.compare(password, user.password)))
    return res.status(401).send({ error: "Senha incorreta" });

  // Open-Close
  const openClose = await connection("operation").first().select("open_close");
  // Quantidade de pedidos
  const totalPedidosProcess = await connection("request")
    .whereIn("statusRequest_id", [1])
    .count("id as countRequest")
    .first();
  // Quantidade de usuário no sistema
  const totalUsers = await connection("users")
    .where("typeUser", "=", "user")
    .count("id as countUser")
    .first();

  // Retorno caso password estive correto retorna usuário e token
  return res.send({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      typeUser: user.typeUser,
      tokenPushNotification: user.tokenPushNotification,
      blocked: user.blocked,
    },
    token: generateToken({ id: user.id }),
    openClose: openClose.open_close,
    totalPedidosProcess: totalPedidosProcess.countRequest,
    totalUsers: totalUsers.countUser,
  });
});

router.use(authMiddleware);
// Listar todos usuários cadastrados
// http:dominio/auth/users
router.get("/users", async (req, res) => {
  const users = await connection("users")
    .where("typeUser", "<>", "admin")
    .leftJoin("addressUser", "users.id", "addressUser.user_id")
    .select(
      "users.id",
      "users.name",
      "users.email",
      "users.phone",
      "users.passwordResetToken",
      "users.passwordResetExpires",
      "users.typeUser",
      "users.blocked",
      "users.tokenPushNotification",
      "users.created_at",
      "addressUser.address",
      "addressUser.number",
      "addressUser.neighborhood",
      "addressUser.city"
    )
    .orderBy("created_at", "desc");

  return res.status(200).json(users);
});

router.get("/user-system", async (req, res) => {
  const userSystem = await connection("users").whereIn("typeUser", [
    "admin",
    "attendant",
  ]);
  return res.status(200).json(userSystem);
});

// Listar todos usuários específica
// http:dominio/auth/users/:id
router.get("/users/:id", async (req, res) => {
  const { id } = req.params;

  const users = await connection("users")
    .where("users.id", "=", id)
    .join("addressUser", "addressUser.user_id", "users.id")
    .select(
      "users.id",
      "users.name",
      "users.email",
      "users.phone",
      "users.passwordResetToken",
      "users.passwordResetExpires",
      "users.typeUser",
      "users.blocked",
      "users.created_at",
      "addressUser.address as address",
      "addressUser.cep as cep",
      "addressUser.number as number",
      "addressUser.neighborhood as neighborhood",
      "addressUser.city as city",
      "addressUser.uf as uf"
    )
    .orderBy("name", "asc");

  return res.json(users);
});
//Desbloquear ou Bloquear usuário, apenas ADMINISTRADOR
// http://dominio/auth/users/:id
router.get("/blocked/:id", async (req, res) => {
  const { id } = req.params;
  const user_id = req.userId; //Id do usuário recebido no token;

  // Buscar dados do usuário
  const userAdm = await connection("users")
    .where("id", "=", user_id)
    .where("typeUser", "=", "admin")
    .first();
  // Checar se o usuário é administrador
  // caso negativo não pode desbloquear
  if (userAdm !== undefined) {
    const user = await connection("users")
      .where("id", "=", id)
      .select("blocked")
      .first();
    // Gravando as alterações no banco se usuário tive bloqueado
    // será desbloqueado ou vice-versa
    await connection("users")
      .where("id", "=", id)
      .update({ blocked: !user.blocked });

    return res.json(!user.blocked);
  } else {
    return res.json({
      error: "Usuário não tem permissão para realizar esta ação.",
    });
  }
});
// Deletar um usuário
router.delete("/userDelete/:id", async (req, res) => {
  const { id } = req.params;
  const { authorization } = req.headers;

  const isAdmin = await checkTokenAdmin(authorization);

  if (!isAdmin)
    return res.json({
      message: "Usuário não tem permissão para realizar esta ação.",
    });

  const user = await connection("users").where("id", "=", id).delete();
  return res.json({
    message: Boolean(user) ? "Usuário foi apagado." : "Falha na exclusão",
  });
});
// Atualizar os dados de um usuário
router.put("/users/:id", async (req, res) => {
  const idUserLogin = req.userId;
  const { authorization } = req.headers;
  const { id } = req.params;
  const { name, email, phone, blocked, tokenPushNotification } = req.body;
  let statusUpgrade = false;

  const isAdmin = await checkTokenAdmin(authorization);

  try {
    // Checar se o usuário logado é o mesmo que esta alterando os dados
    if (Number(idUserLogin) === Number(id) || isAdmin) {
      await connection("users")
        .where("id", "=", id)
        .update({ name, email, phone, blocked, tokenPushNotification });
      statusUpgrade = true;
    }

    return res.json({
      success: statusUpgrade,
      message: statusUpgrade
        ? "Alteração realizada com sucesso"
        : "Acesso negado, você não tem permissão para alterar os dados",
    });
  } catch (error) {
    return res.json({
      success: false,
      error: "E-mail já vinculado a um usuário",
    });
  }
});
// Alterar a senha do usuário
router.put("/password/:id", async (req, res) => {
  const idUserLogin = req.userId;
  const { id } = req.params;
  const { oldPassword, newPassword } = req.body;

  // Checar se o usuário logado é o mesmo que esta alterando a senha
  if (Number(idUserLogin !== Number(id)))
    return res.json({
      success: false,
      error: "Desculpe, você não tem permissão para fazer isto!",
    });
  // Buscar dados do usuário
  const user = await connection("users")
    .where("id", "=", id)
    .select("*")
    .first();
  // Checar se usuário existe
  if (typeof user === "undefined")
    return res.json({ success: false, error: "Usuário não localizado" });
  // Checar se a senha antiga passada seja igua a cadastrada
  if (!(await bcrypt.compare(oldPassword, user.password)))
    return res.json({
      success: false,
      error: "Desculpe, senha antiga não confere!",
    });
  // Criptografar a nova senha
  const cryptNewPass = await bcrypt.hash(newPassword, 10);

  const statusUpgrade = await connection("users").where("id", "=", id).update({
    password: cryptNewPass,
  });

  return res.json({ success: Boolean(statusUpgrade) });
});

module.exports = (app) => app.use("/auth", router);
