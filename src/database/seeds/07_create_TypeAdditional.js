exports.seed = async function (knex) {
  await knex("typeAdditional").insert([
    { description: "Qual pão você deseja?", manySelected: false },
    { description: "Deseja adicionais?", manySelected: true },
  ]);
};
