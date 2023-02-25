exports.up = async function (knex) {
  return knex.schema.table("openingHours", (table) => {
    table.boolean("open").notNullable().defaultTo(false);
  });
};

exports.down = async function (knex) {
  return knex.schema.table("openingHours", (table) => {
    table.dropColumns("open");
  });
};
