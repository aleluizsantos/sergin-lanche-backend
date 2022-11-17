const express = require("express");
const router = express.Router();
const package = require("../../../package.json");

router.get("/", (req, res) => {
  const organizationName = "lesoftware";
  const { version, description } = package;

  const email = "contato@lesoftware.com.br";
  const site = "www.lesoftware.com.br";
  return res.json({ version, organizationName, description, email, site });
});

module.exports = (app) => app.use("/version", router);
