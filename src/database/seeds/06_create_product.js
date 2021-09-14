exports.seed = async function (knex) {
  await knex("product").insert([
    {
      name: "Coca Cola Lata 350ml",
      description: "Bebidas",
      ingredient: "",
      price: 4.5,
      additional: "",
      image: "default.jpg",
      promotion: false,
      pricePromotion: 0,
      category_id: 2,
      measureUnid_id: 59,
      visibleApp: true,
    },
  ]);
};
