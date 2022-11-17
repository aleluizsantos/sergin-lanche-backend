const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  const organizationName = "lesoftware";
  const version = "1.1.0";
  const email = "contato@lesoftware.com.br";
  const site = "www.lesoftware.com.br";
  return res.json({ version, organizationName, email, site });
});

module.exports = (app) => app.use("/version", router);
