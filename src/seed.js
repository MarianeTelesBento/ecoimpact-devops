const C = require('./colecoes');
const R = require('./regras');
const { dadosIniciais } = require('./seed-data');
const { criarServico } = require('./servico');

/**
 * Popula o banco com a carga inicial do EcoImpact. É idempotente: se já houver
 * categorias cadastradas, não faz nada (seguro para rodar a cada subida do contêiner).
 */
async function semear(db, { anoMesAtual = R.anoMes() } = {}) {
  const existentes = await db.collection(C.CATEGORIAS).find({}).toArray();
  if (existentes.length > 0) return { semeado: false };

  const { usuarios, categorias, registrosBase, metasBase, compensacoesBase } = dadosIniciais(anoMesAtual);
  const catMap = Object.fromEntries(categorias.map((c) => [c._id, c]));

  await db.collection(C.METAS).createIndex({ id_usuario: 1, ano_mes: 1 }, { unique: true }); // UK_META_USUARIO_MES

  await db.collection(C.USUARIOS).insertMany(usuarios);
  await db.collection(C.CATEGORIAS).insertMany(categorias);

  const registros = registrosBase.map((reg) => {
    const cat = catMap[reg.id_categoria];
    const kg = R.calcularKgCo2e(reg.quantidade, cat.fator_emissao_kg);
    return {
      id_usuario: reg.id_usuario,
      categoria: { id_categoria: cat._id, nome: cat.nome, unidade_medida: cat.unidade_medida, escopo_ghg: cat.escopo_ghg },
      ano_mes: anoMesAtual,
      data_registro: new Date(),
      quantidade: reg.quantidade,
      kg_co2e: kg,
      nivel_impacto: R.classificarNivelImpacto(kg),
      observacao: reg.observacao,
    };
  });
  // schema flexível: o último registro ganha um campo extra de geolocalização
  registros[registros.length - 1].geolocalizacao = { lat: -19.9245, lng: -43.9352, cidade: 'Belo Horizonte' };
  await db.collection(C.REGISTROS).insertMany(registros);

  await db.collection(C.METAS).insertMany(
    metasBase.map((m) => ({
      id_usuario: m.id_usuario,
      ano_mes: m.ano_mes,
      meta_reducao_kg: m.meta_reducao_kg,
      total_emitido_mes: 0,
      total_compensado_kg: 0,
      saldo_carbono_kg: 0,
      alertas: [],
      ultima_atualizacao: new Date(),
    }))
  );
  await db.collection(C.COMPENSACOES).insertMany(compensacoesBase);

  // Totais, saldo e alertas (antes: triggers 1, 2 e 3)
  const servico = criarServico(db);
  for (const m of metasBase) {
    await servico.recalcularMeta(m.id_usuario, m.ano_mes);
  }

  return {
    semeado: true,
    usuarios: usuarios.length,
    categorias: categorias.length,
    registros: registros.length,
    metas: metasBase.length,
    compensacoes: compensacoesBase.length,
  };
}

module.exports = { semear };
