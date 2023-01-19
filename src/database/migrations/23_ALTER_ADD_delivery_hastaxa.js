exports.up = async function (knex) {
  return knex.schema.table("deliveryType", (table) => {
    table.boolean("hastaxa").notNullable().defaultTo(false);
  });
};
exports.down = async function (knex) {
  return knex.schema.table("deliveryType", (table) => {
    table.dropColumn("hastaxa");
  });
};
