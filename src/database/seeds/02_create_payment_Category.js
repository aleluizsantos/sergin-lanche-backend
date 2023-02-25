exports.seed = async function (knex) {
  await knex("payment").insert([
    { type: "Dinheiro", active: 1, image: "icoCast.png" },
    { type: "Cartão Crédito", active: 1, image: "icocartaocredito.png" },
    { type: "Cartão Débito", active: 1, image: "iconcartaodebito.png" },
    { type: "Pix", active: 1, image: "icopix.png" },
    { type: "Nota", active: 0, image: "iconote.png" },
  ]);

  await knex("category").insert([
    { name: "Hambúrgueres", image: "default.jpg", categoryVisible: true },
    { name: "Bebidas", image: "default.jpg", categoryVisible: true },
  ]);
};
