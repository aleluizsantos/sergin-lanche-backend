exports.seed = async function (knex) {
  await knex("addressStore").insert([
    {
      cep: "15700-030",
      address: "Rua 12",
      number: "0000",
      neighborhood: "Centro",
      city: "Jales",
      uf: "SP",
      phone: "170000-0000",
      latitude: "-20.268422448574235",
      longitude: "-50.54721432804327",
      active: true,
    },
  ]);
};
