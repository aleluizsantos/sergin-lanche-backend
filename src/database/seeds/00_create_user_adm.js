exports.seed = async function (knex) {
  await knex("users").insert([
    {
      name: "Sergin Lanche",
      email: "admin@admin.com",
      phone: "(17) 3632-9350",
      password: "$2a$10$ag3gNBv9wXR43I0FOjY6weW9pBkSytFavLxUdkf7EWB75BDyKmvPm",
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
