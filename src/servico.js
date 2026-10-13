const C = require('./colecoes');
const R = require('./regras');
const { ErroValidacao, ErroNaoEncontrado } = require('./erros');

function exigirNumeroPositivo(valor, campo) {
  if (typeof valor !== 'number' || !Number.isFinite(valor) || valor <= 0) {
    throw new ErroValidacao(`${campo} deve ser um número maior que zero`);
  }
}

/**
 * Camada de serviço: recebe um objeto "db" (driver oficial do MongoDB, ou mongo-mock nos testes)
 * e usa apenas operações comuns às duas implementações.
 */
function criarServico(db) {
  const col = (nome) => db.collection(nome);

  // ---------- leituras ----------
  async function listarUsuarios() {
    return col(C.USUARIOS).find({}).toArray();
  }

  async function listarCategorias({ escopo, ativo } = {}) {
    const filtro = {};
    if (escopo) filtro.escopo_ghg = escopo;
    if (ativo !== undefined) filtro.ativo = ativo;
    return col(C.CATEGORIAS).find(filtro).toArray();
  }

  async function listarRegistros({ idUsuario } = {}) {
    const filtro = {};
    if (idUsuario !== undefined) filtro.id_usuario = idUsuario;
    return col(C.REGISTROS).find(filtro).toArray();
  }

  async function listarMetas({ anoMes } = {}) {
    const filtro = {};
    if (anoMes) filtro.ano_mes = anoMes;
    return col(C.METAS).find(filtro).toArray();
  }

  async function listarCompensacoes({ idUsuario } = {}) {
    const filtro = {};
    if (idUsuario !== undefined) filtro.id_usuario = idUsuario;
    return col(C.COMPENSACOES).find(filtro).toArray();
  }

  /** Total emitido por usuário (equivalente a um $group), do maior para o menor. */
  async function resumoPorUsuario() {
    const registros = await col(C.REGISTROS).find({}).toArray();
    const totais = {};
    for (const reg of registros) {
      const t = totais[reg.id_usuario] || (totais[reg.id_usuario] = { id_usuario: reg.id_usuario, total_kg_co2e: 0, qtd_registros: 0 });
      t.total_kg_co2e = R.arredondar(t.total_kg_co2e + reg.kg_co2e);
      t.qtd_registros += 1;
    }
    return Object.values(totais).sort((a, b) => b.total_kg_co2e - a.total_kg_co2e);
  }

  // ---------- regras que eram triggers ----------
  /**
   * TRIGGERS 1, 2 e 3: recalcula total emitido, total compensado e saldo da meta do mês
   * e gera o alerta de limite excedido (sem duplicar o mesmo alerta).
   */
  async function recalcularMeta(idUsuario, anoMes) {
    const meta = await col(C.METAS).findOne({ id_usuario: idUsuario, ano_mes: anoMes });
    if (!meta) return null;

    const registros = await col(C.REGISTROS).find({ id_usuario: idUsuario, ano_mes: anoMes }).toArray();
    const compensacoes = await col(C.COMPENSACOES).find({ id_usuario: idUsuario, ano_mes: anoMes }).toArray();

    const totalEmitido = R.arredondar(registros.reduce((s, r) => s + r.kg_co2e, 0));
    const totalCompensado = R.arredondar(compensacoes.reduce((s, c) => s + c.kg_compensado, 0));

    const campos = {
      total_emitido_mes: totalEmitido,
      total_compensado_kg: totalCompensado,
      saldo_carbono_kg: R.calcularSaldo(totalEmitido, totalCompensado),
      ultima_atualizacao: new Date(),
    };
    await col(C.METAS).updateOne({ _id: meta._id }, { $set: campos });

    const alerta = R.gerarAlertaSeExcedeu(totalEmitido, meta.meta_reducao_kg);
    const jaExiste = (meta.alertas || []).some(
      (a) => a.tipo_alerta === 'LIMITE_EXCEDIDO' && a.kg_excedido === (alerta && alerta.kg_excedido)
    );
    if (alerta && !jaExiste) {
      await col(C.METAS).updateOne({ _id: meta._id }, { $push: { alertas: alerta } });
    }
    return col(C.METAS).findOne({ _id: meta._id });
  }

  // ---------- escritas ----------
  async function registrarEmissao({ id_usuario, id_categoria, quantidade, observacao } = {}) {
    if (!Number.isInteger(id_usuario)) throw new ErroValidacao('id_usuario deve ser um inteiro');
    if (!Number.isInteger(id_categoria)) throw new ErroValidacao('id_categoria deve ser um inteiro');
    exigirNumeroPositivo(quantidade, 'quantidade');

    const usuario = await col(C.USUARIOS).findOne({ _id: id_usuario });
    if (!usuario) throw new ErroNaoEncontrado(`Usuário ${id_usuario} não encontrado`);
    const categoria = await col(C.CATEGORIAS).findOne({ _id: id_categoria });
    if (!categoria) throw new ErroNaoEncontrado(`Categoria ${id_categoria} não encontrada`);
    if (categoria.ativo === false) throw new ErroValidacao(`Categoria ${id_categoria} está inativa`);

    const kg = R.calcularKgCo2e(quantidade, categoria.fator_emissao_kg);
    const doc = {
      id_usuario,
      categoria: {
        id_categoria: categoria._id,
        nome: categoria.nome,
        unidade_medida: categoria.unidade_medida,
        escopo_ghg: categoria.escopo_ghg,
      },
      ano_mes: R.anoMes(),
      data_registro: new Date(),
      quantidade,
      kg_co2e: kg,
      nivel_impacto: R.classificarNivelImpacto(kg),
      observacao: observacao || null,
    };
    await col(C.REGISTROS).insertOne(doc);
    const meta = await recalcularMeta(id_usuario, doc.ano_mes);
    return { registro: doc, meta };
  }

  async function registrarCompensacao({ id_usuario, tipo_acao, kg_compensado, descricao, fonte_certificacao } = {}) {
    if (!Number.isInteger(id_usuario)) throw new ErroValidacao('id_usuario deve ser um inteiro');
    if (typeof tipo_acao !== 'string' || !tipo_acao.trim()) throw new ErroValidacao('tipo_acao é obrigatório');
    exigirNumeroPositivo(kg_compensado, 'kg_compensado');

    const usuario = await col(C.USUARIOS).findOne({ _id: id_usuario });
    if (!usuario) throw new ErroNaoEncontrado(`Usuário ${id_usuario} não encontrado`);

    const doc = {
      id_usuario,
      tipo_acao: tipo_acao.trim(),
      kg_compensado,
      descricao: descricao || null,
      fonte_certificacao: fonte_certificacao || null,
      ano_mes: R.anoMes(),
    };
    await col(C.COMPENSACOES).insertOne(doc);
    const meta = await recalcularMeta(id_usuario, doc.ano_mes);
    return { compensacao: doc, meta };
  }

  return {
    listarUsuarios,
    listarCategorias,
    listarRegistros,
    listarMetas,
    listarCompensacoes,
    resumoPorUsuario,
    recalcularMeta,
    registrarEmissao,
    registrarCompensacao,
  };
}

module.exports = { criarServico };
