exports.up = async function (knex) {
  return knex.schema.table("request", (table) => {
    table.integer("commads_id").notNullable().default(1);
    table.foreign("commads_id").references("id").inTable("commads");
  });
};

exports.down = async function (knex) {
  return knex.schema.table("request", (table) => {
    table.dropForeign("commads_id");
    table.dropColumns("commads_id");
  });
};
