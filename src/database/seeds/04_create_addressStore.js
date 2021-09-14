exports.seed = async function (knex) {
  await knex("addressStore").insert([
    {
      cep: "15700-030",
      address: "Rua 11",
      number: "2068",
      neighborhood: "Centro",
      city: "Jales",
      uf: "SP",
      phone: "17996197628",
      latitude: "-20.2719212",
      longitude: "-50.5448145",
      active: true,
    },
  ]);
};
