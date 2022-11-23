exports.seed = async function (knex) {
  await knex("users").insert([
    {
      name: "Administrador",
      email: "admin@admin.com",
      phone: "(17) 3632-9350",
      password: "$2a$10$s4F6xxvM/sesHdtbvyK/J.JJiOyYKXs.7ejhwOAClZbhtEuvqiMhC",
      typeUser: "admin",
      blocked: "false",
    },
  ]);

  await knex("deliveryType").insert([
    { description: "Delivery" },
    { description: "Retirada" },
  ]);

  await knex("operation").insert([{ open_close: false }]);
};
