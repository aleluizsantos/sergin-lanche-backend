exports.up = async function (knex) {
  return knex.schema
    .createTable("hours_operation", (table) => {
      table.increments("id").primary();
      table.string("hourStart").notNullable();
      table.string("hourEnd").notNullable();
    })
    .then(() => {
      return knex("hours_operation").insert([{ hourStart: 1140, hourEnd: 0 }]);
    });
};

exports.down = function (knex) {
  return knex.schema.dropTable("hours_operation");
};
