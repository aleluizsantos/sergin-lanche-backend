exports.up = function (knex) {
  return knex("payment").insert([
    {
      type: "Pix",
      active: false,
      image: "icopix.png",
    },
  ]);
};

exports.down = function (knex) {};
