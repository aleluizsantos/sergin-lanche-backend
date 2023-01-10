exports.up = async function (knex) {
  return knex.schema.table("request", (table) => {
    table.boolean("print").notNullable().defaultTo(false);
  });
};
exports.down = async function (knex) {
  return knex.schema.table("request", (table) => {
    table.dropColumn("print");
  });
};
