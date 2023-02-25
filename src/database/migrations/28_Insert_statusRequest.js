exports.up = function (knex) {
  return knex("statusRequest").insert([
    {
      description: "Aguardando pagamento",
      BGcolor: "#be7abb",
    },
  ]);
};

exports.down = function (knex) {};
