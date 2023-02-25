exports.up = async function (knex) {
  return knex.schema.table("request", (table) => {
    table.integer("table_id").nullable().default(1);
    table.string("name_client", 80).nullable();
    table.string("phone", 80).nullable();
  });
};

exports.down = async function (knex) {
  return knex.schema.table("request", (table) => {
    table.dropColumns("table_id");
    table.dropColumns("name_client");
    table.dropColumns("phone");
  });
};
