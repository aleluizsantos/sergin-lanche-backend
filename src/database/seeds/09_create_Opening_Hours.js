exports.seed = async function (knex) {
  await knex("openingHours").insert([
    { week: "Domingo", week_id: "0", start: "19:00", end: "23:00" },
    { week: "Segunda-feira", week_id: "1", start: "19:00", end: "23:00" },
    { week: "Terça-feira", week_id: "2", start: "", end: "" },
    { week: "Quarta-feira", week_id: "3", start: "", end: "" },
    { week: "Quinta-feira", week_id: "4", start: "19:00", end: "23:00" },
    { week: "Sexta-feira", week_id: "5", start: "19:00", end: "00:00" },
    { week: "Sábado", week_id: "6", start: "19:00", end: "00:00" },
  ]);
};
