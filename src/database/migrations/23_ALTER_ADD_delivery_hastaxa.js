exports.up = async function (knex) {
  return knex.schema
    .table("deliveryType", (table) => {
      table.boolean("hastaxa").notNullable().defaultTo(false);
    })
    .then(() => {
      return knex("deliveryType").insert([
        {
          description: "Atendimento Mesa",
          hastaxa: false,
        },
      ]);
    });
};
exports.down = async function (knex) {
  return knex.schema.table("deliveryType", (table) => {
    table.dropColumn("hastaxa");
  });
};
