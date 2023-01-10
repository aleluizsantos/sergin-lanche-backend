exports.up = async function (knex) {
  return knex.schema.table("payment", (table) => {
    table.string("key_pix");
  });
};
exports.down = async function (knex) {
  return knex.schema.table("payment", (table) => {
    table.dropColumn("key_pix");
  });
};
