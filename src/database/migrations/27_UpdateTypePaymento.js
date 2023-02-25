exports.up = function (knex) {
  return knex("payment").where("id", "=", 5).update({
    type: "Nota",
    image: "iconote.png",
  });
};

exports.down = function (knex) {};
