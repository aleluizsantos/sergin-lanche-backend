exports.up = async function (knex) {
  return knex.schema
    .createTable("table", (table) => {
      table.increments("id").primary();
      table.integer("amount").notNullable().default(0);
      table.boolean("accessibility").notNullable().default(false);
      table.boolean("busy").notNullable().default(false);
      table.string("tokenOperation", 100).nullable();
    })
    .then(() => {
      return knex("table").insert([
        { amount: 4, accessibility: false, busy: false },
      ]);
    });
};

exports.down = async function (knex) {
  return knex.schema.dropTable("table");
};
