const { addMinutes } = require("date-fns");

exports.up = async function (knex) {
  return knex.schema
    .createTable("commads", (table) => {
      table.increments("id").primary();
      table.string("name_client", 60);
      table.boolean("paidOut").default(false);
      table.decimal("totalValueToOrder", 6, 2).defaultTo(0);
      table.timestamp("created_at").defaultTo(knex.fn.now());
      table.string("tokenOperation", 100).nullable();

      table.integer("table_id").notNullable();
      table.foreign("table_id").references("id").inTable("table");
    })
    .then(() => {
      return knex("commads").insert([
        { name_client: "Online", paidOut: true, table_id: 1 },
      ]);
    });
};

exports.down = async function (knex) {
  return knex.schema.dropTable("commads");
};
