exports.seed = async function (knex) {
  await knex("typeAdditional").insert([
    {
      description: "Qual pão você deseja?",
      manySelected: false,
      typeAdditionVisible: true,
      limitAdditional: "",
    },
    {
      description: "Deseja adicionais?",
      manySelected: true,
      typeAdditionVisible: true,
      limitAdditional: "",
    },
  ]);
};
