exports.seed = async function (knex) {
  await knex("additional").insert([
    {
      description: "Pão de Hambúrguer com Gergelim",
      price: 0,
      typeAdditional_id: 1,
    },
    { description: "Pão Brioche", price: 0, typeAdditional_id: 1 },

    { description: "Burguer 100g", price: 6, typeAdditional_id: 2 },
    { description: "Burguer 200g", price: 12, typeAdditional_id: 2 },
    { description: "Cheddar", price: 5, typeAdditional_id: 2 },
    { description: "Queijo Prato", price: 5, typeAdditional_id: 2 },
    { description: "Salada", price: 4, typeAdditional_id: 2 },
    { description: "Catupiry", price: 5, typeAdditional_id: 2 },
    { description: "Onion Rings", price: 4, typeAdditional_id: 2 },
  ]);
};
