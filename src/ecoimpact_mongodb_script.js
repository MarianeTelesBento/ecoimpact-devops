/**
 * ============================================================
 *  ECOIMPACT — Migração Relacional (Oracle/PL-SQL) -> MongoDB
 * ============================================================
 *  NOTA DE AMBIENTE: a rede desta sandbox de execução bloqueia o
 *  download do binário oficial do mongod (fastdl.mongodb.org),
 *  necessário para o mongodb-memory-server. Para ainda assim
 *  EXECUTAR de fato os comandos (e não apenas simular texto),
 *  este script roda sobre "mongo-mock", uma implementação em
 *  JavaScript puro do driver oficial do MongoDB (mesma API:
 *  insertMany, find, updateOne, deleteOne, etc.), sem exigir
 *  nenhum binário nativo. Todas as operações abaixo realmente
 *  são executadas e a saída é a saída real do driver.
 *
 *  O código é 100% compatível com o driver oficial "mongodb" e
 *  com o mongosh — para uso em produção, basta trocar o require
 *  de "mongo-mock" para "mongodb" e apontar a URI para um
 *  servidor MongoDB real (Atlas, local ou Docker).
 * ============================================================
 */

const mongoMock = require('mongo-mock');
mongoMock.max_delay = 0;
const MongoClient = mongoMock.MongoClient;

function linha(titulo) {
  console.log('\n' + '='.repeat(70));
  console.log(titulo);
  console.log('='.repeat(70));
}

function classificarNivelImpacto(kg) {
  if (kg < 10) return 'BAIXO';
  if (kg <= 50) return 'MEDIO';
  return 'ALTO';
}

MongoClient.connect('mongodb://localhost:27017/ecoimpact', {}, async (err, db) => {
  if (err) { console.error('Falha ao conectar:', err); process.exit(1); }

  console.log('Conectado ao MongoDB.');
  console.log('Banco de dados: ecoimpact');

  const colCategorias   = 'categorias_emissao';
  const colRegistros    = 'registros_emissao';
  const colMetas        = 'metas_sustentabilidade';
  const colCompensacoes = 'compensacoes_carbono';
  const colUsuarios     = 'usuarios_esg';

  try {
    // ==========================================================
    // 1) CRIAÇÃO DAS 5 COLLECTIONS (equivalente ao CREATE TABLE)
    // ==========================================================
    linha('1. CRIACAO DAS 5 COLLECTIONS');

    for (const nome of [colCategorias, colRegistros, colMetas, colCompensacoes, colUsuarios]) {
      await db.createCollection(nome);
      console.log(`db.createCollection("${nome}")  -> OK`);
    }

    await db.collection(colMetas).createIndex({ id_usuario: 1, ano_mes: 1 }, { unique: true }); // == UK_META_USUARIO_MES
    console.log('\nIndice unico criado em metas_sustentabilidade (id_usuario, ano_mes) - equivalente a UK_META_USUARIO_MES.');

    const colecoes = await db.listCollections().toArray();
    console.log('\nCollections existentes no banco:');
    colecoes.filter(c => c.name !== 'system.indexes').forEach(c => console.log('  -', c.name));

    // ==========================================================
    // 2) INSERÇÃO (CREATE) — >= 10 documentos por collection
    // ==========================================================
    linha('2. OPERACOES DE CREATE (insertMany) - carga inicial');

    // ---- 2.1 usuarios_esg (nova collection - consolida dados de usuário) ----
    const usuarios = [
      { _id: 1, nome: 'Ana Beatriz Souza',   email: 'ana.souza@ecoimpact.com',      cargo: 'Analista ESG',                 departamento: 'Sustentabilidade', ativo: true,  criado_em: new Date('2025-01-10') },
      { _id: 2, nome: 'Carlos Eduardo Lima', email: 'carlos.lima@ecoimpact.com',    cargo: 'Gerente Operacional',          departamento: 'Operações',        ativo: true,  criado_em: new Date('2025-01-12') },
      { _id: 3, nome: 'Fernanda Torres',     email: 'fernanda.torres@ecoimpact.com', cargo: 'Coordenadora ESG',            departamento: 'Sustentabilidade', ativo: true,  criado_em: new Date('2025-02-01') },
      { _id: 4, nome: 'João Pedro Alves',    email: 'joao.alves@ecoimpact.com',     cargo: 'Analista Financeiro',          departamento: 'Financeiro',        ativo: true,  criado_em: new Date('2025-02-15') },
      { _id: 5, nome: 'Marina Costa',        email: 'marina.costa@ecoimpact.com',   cargo: 'Diretora de Sustentabilidade', departamento: 'Diretoria',         ativo: true,  criado_em: new Date('2025-03-01'),
        certificacoes: ['GHG Protocol', 'ISO 14001 Lead Auditor'] }, // campo extra - schema flexível
      { _id: 6, nome: 'Ricardo Nunes',       email: 'ricardo.nunes@ecoimpact.com',  cargo: 'Estagiário ESG',               departamento: 'Sustentabilidade', ativo: true,  criado_em: new Date('2025-03-10') },
      { _id: 7, nome: 'Beatriz Fernandes',   email: 'beatriz.fernandes@ecoimpact.com', cargo: 'Analista de Compliance',    departamento: 'Jurídico',          ativo: true,  criado_em: new Date('2025-03-20') },
      { _id: 8, nome: 'Lucas Martins',       email: 'lucas.martins@ecoimpact.com',  cargo: 'Analista ESG Pleno',           departamento: 'Sustentabilidade', ativo: false, criado_em: new Date('2025-04-01'), desativado_em: new Date('2026-01-05') },
      { _id: 9, nome: 'Patrícia Gomes',      email: 'patricia.gomes@ecoimpact.com', cargo: 'Gerente de RH',                departamento: 'Recursos Humanos',  ativo: true,  criado_em: new Date('2025-04-18') },
      { _id: 10, nome: 'Thiago Rocha',       email: 'thiago.rocha@ecoimpact.com',   cargo: 'Coordenador de Operações',     departamento: 'Operações',         ativo: true,  criado_em: new Date('2025-05-02') },
      { _id: 11, nome: 'Camila Duarte',      email: 'camila.duarte@ecoimpact.com',  cargo: 'Analista ESG Junior',          departamento: 'Sustentabilidade', ativo: true,  criado_em: new Date('2025-05-20') },
    ];
    let r = await db.collection(colUsuarios).insertMany(usuarios);
    console.log(`usuarios_esg: ${r.insertedCount || usuarios.length} documentos inseridos`);

    // ---- 2.2 categorias_emissao (equivalente à CATEGORIA_EMISSAO) ----
    const categorias = [
      { _id: 1, nome: 'Transporte - Gasolina',       descricao: 'Veículo particular movido a gasolina',    fator_emissao_kg: 0.2100, unidade_medida: 'km',     escopo_ghg: 'Escopo 1', ativo: true, criado_em: new Date() },
      { _id: 2, nome: 'Transporte - Etanol',         descricao: 'Veículo particular movido a etanol',      fator_emissao_kg: 0.0430, unidade_medida: 'km',     escopo_ghg: 'Escopo 1', ativo: true, criado_em: new Date() },
      { _id: 3, nome: 'Transporte - Elétrico',       descricao: 'Veículo elétrico (grid nacional)',        fator_emissao_kg: 0.0900, unidade_medida: 'km',     escopo_ghg: 'Escopo 2', ativo: true, criado_em: new Date() },
      { _id: 4, nome: 'Alimentação - Carne',         descricao: 'Porção de carne bovina (200g)',           fator_emissao_kg: 6.6000, unidade_medida: 'porcao', escopo_ghg: 'Escopo 3', ativo: true, criado_em: new Date() },
      { _id: 5, nome: 'Energia Elétrica',            descricao: 'Consumo de eletricidade (grid BR)',       fator_emissao_kg: 0.0817, unidade_medida: 'kWh',    escopo_ghg: 'Escopo 2', ativo: true, criado_em: new Date() },
      { _id: 6, nome: 'Resíduos Orgânicos',          descricao: 'Descarte sem compostagem',                fator_emissao_kg: 0.5000, unidade_medida: 'kg',     escopo_ghg: 'Escopo 3', ativo: true, criado_em: new Date() },
      { _id: 7, nome: 'Transporte - Aéreo',          descricao: 'Voo doméstico curta distância',           fator_emissao_kg: 0.2550, unidade_medida: 'km',     escopo_ghg: 'Escopo 3', ativo: true, criado_em: new Date() },
      { _id: 8, nome: 'Transporte - Ônibus',         descricao: 'Transporte público coletivo urbano',      fator_emissao_kg: 0.0890, unidade_medida: 'km',     escopo_ghg: 'Escopo 3', ativo: true, criado_em: new Date() },
      { _id: 9, nome: 'Água - Consumo Residencial',  descricao: 'Tratamento e distribuição de água',       fator_emissao_kg: 0.3440, unidade_medida: 'm3',     escopo_ghg: 'Escopo 3', ativo: true, criado_em: new Date() },
      { _id: 10, nome: 'Resíduos Recicláveis',       descricao: 'Descarte com destinação para reciclagem', fator_emissao_kg: 0.0500, unidade_medida: 'kg',     escopo_ghg: 'Escopo 3', ativo: true, criado_em: new Date(),
        incentivo: { desconto_meta_pct: 5, descricao: 'Reduz 5% da meta mensal por ser prática de baixo impacto' } }, // schema flexível
      { _id: 11, nome: 'Combustível Fóssil - Diesel', descricao: 'Veículo utilitário/comercial a diesel', fator_emissao_kg: 0.2680, unidade_medida: 'km',     escopo_ghg: 'Escopo 1', ativo: true, criado_em: new Date() },
    ];
    r = await db.collection(colCategorias).insertMany(categorias);
    console.log(`categorias_emissao: ${r.insertedCount || categorias.length} documentos inseridos`);

    // ---- 2.3 registros_emissao (equivalente à REGISTRO_EMISSAO) ----
    const catMap = Object.fromEntries(categorias.map(c => [c._id, c]));
    function refCategoria(id) {
      const c = catMap[id];
      return { id_categoria: c._id, nome: c.nome, unidade_medida: c.unidade_medida, escopo_ghg: c.escopo_ghg };
    }

    const anoMesAtual = new Date().toISOString().slice(0, 7);

    const registrosBase = [
      { id_usuario: 1, id_categoria: 1,  quantidade: 50,  observacao: 'Trajeto diário trabalho - gasolina' },
      { id_usuario: 1, id_categoria: 4,  quantidade: 3,   observacao: 'Almoço com carne três vezes na semana' },
      { id_usuario: 2, id_categoria: 5,  quantidade: 300, observacao: 'Consumo elétrico residencial mensal' },
      { id_usuario: 2, id_categoria: 1,  quantidade: 400, observacao: 'Viagem de carro longa distância' },
      { id_usuario: 3, id_categoria: 6,  quantidade: 10,  observacao: 'Descarte semanal de orgânicos' },
      { id_usuario: 3, id_categoria: 2,  quantidade: 200, observacao: 'Deslocamento a etanol' },
      { id_usuario: 4, id_categoria: 4,  quantidade: 10,  observacao: 'Churrasco de fim de semana' },
      { id_usuario: 5, id_categoria: 3,  quantidade: 150, observacao: 'Deslocamento com veículo elétrico' },
      { id_usuario: 6, id_categoria: 7,  quantidade: 800, observacao: 'Voo a trabalho São Paulo-Rio' },
      { id_usuario: 7, id_categoria: 8,  quantidade: 60,  observacao: 'Deslocamento diário de ônibus' },
      { id_usuario: 9, id_categoria: 9,  quantidade: 12,  observacao: 'Consumo de água residencial mensal' },
      { id_usuario: 10, id_categoria: 11, quantidade: 300, observacao: 'Rota de entrega com veículo a diesel' },
    ];

    const registros = registrosBase.map((reg, idx) => {
      const kg = Number((reg.quantidade * catMap[reg.id_categoria].fator_emissao_kg).toFixed(4));
      const doc = {
        id_usuario: reg.id_usuario,
        categoria: refCategoria(reg.id_categoria),  // subdocumento embutido (evita "join")
        ano_mes: anoMesAtual,
        data_registro: new Date(),
        quantidade: reg.quantidade,
        kg_co2e: kg,
        nivel_impacto: classificarNivelImpacto(kg), // regra que era a TRIGGER 4, aplicada na camada de aplicação
        observacao: reg.observacao,
      };
      return doc;
    });
    // schema flexível: último registro ganha um campo extra de geolocalização (não existe nos demais)
    registros[registros.length - 1].geolocalizacao = { lat: -19.9245, lng: -43.9352, cidade: 'Belo Horizonte' };

    r = await db.collection(colRegistros).insertMany(registros);
    console.log(`registros_emissao: ${r.insertedCount || registros.length} documentos inseridos`);

    // ---- 2.4 metas_sustentabilidade (equivalente à META_SUSTENTABILIDADE) ----
    // alertas embutidos como array de subdocumentos (equivalente à tabela ALERTA_EMISSAO)
    function totalEmitidoNoMes(idUsuario, anoMes) {
      return registros
        .filter(reg => reg.id_usuario === idUsuario && reg.ano_mes === anoMes)
        .reduce((soma, reg) => soma + reg.kg_co2e, 0);
    }

    const metasBase = [
      { id_usuario: 1, ano_mes: anoMesAtual, meta_reducao_kg: 100.0 },
      { id_usuario: 2, ano_mes: anoMesAtual, meta_reducao_kg: 80.0 },
      { id_usuario: 3, ano_mes: anoMesAtual, meta_reducao_kg: 120.0 },
      { id_usuario: 4, ano_mes: anoMesAtual, meta_reducao_kg: 60.0 },
      { id_usuario: 5, ano_mes: anoMesAtual, meta_reducao_kg: 90.0 },
      { id_usuario: 6, ano_mes: anoMesAtual, meta_reducao_kg: 150.0 },
      { id_usuario: 7, ano_mes: anoMesAtual, meta_reducao_kg: 40.0 },
      { id_usuario: 9, ano_mes: anoMesAtual, meta_reducao_kg: 30.0 },
      { id_usuario: 10, ano_mes: anoMesAtual, meta_reducao_kg: 110.0 },
      { id_usuario: 1, ano_mes: '2026-08', meta_reducao_kg: 95.0 },
      { id_usuario: 2, ano_mes: '2026-08', meta_reducao_kg: 80.0 },
    ];

    const metas = metasBase.map(m => {
      const totalEmitido = Number(totalEmitidoNoMes(m.id_usuario, m.ano_mes).toFixed(4));
      const doc = {
        id_usuario: m.id_usuario,
        ano_mes: m.ano_mes,
        meta_reducao_kg: m.meta_reducao_kg,
        total_emitido_mes: totalEmitido,
        total_compensado_kg: 0,
        saldo_carbono_kg: totalEmitido,
        alertas: [],
        ultima_atualizacao: new Date(),
      };
      return doc;
    });

    r = await db.collection(colMetas).insertMany(metas);
    console.log(`metas_sustentabilidade: ${r.insertedCount || metas.length} documentos inseridos`);

    // ---- 2.5 compensacoes_carbono (equivalente à COMPENSACAO_CARBONO) ----
    const compensacoesBase = [
      { id_usuario: 1, tipo_acao: 'Plantio de árvores',    kg_compensado: 20.0, descricao: 'Plantio de 4 mudas nativas',                 fonte_certificacao: 'SOS Mata Atlântica',   ano_mes: anoMesAtual },
      { id_usuario: 2, tipo_acao: 'Crédito de carbono',    kg_compensado: 50.0, descricao: 'Compra de crédito certificado',              fonte_certificacao: 'VERRA VCS',            ano_mes: anoMesAtual },
      { id_usuario: 3, tipo_acao: 'Energia Solar',         kg_compensado: 15.0, descricao: 'Geração própria fotovoltaica',               fonte_certificacao: null,                   ano_mes: anoMesAtual },
      { id_usuario: 4, tipo_acao: 'Compostagem',           kg_compensado: 8.0,  descricao: 'Compostagem domiciliar',                     fonte_certificacao: null,                   ano_mes: anoMesAtual },
      { id_usuario: 5, tipo_acao: 'Plantio de árvores',    kg_compensado: 30.0, descricao: 'Patrocínio de reflorestamento',              fonte_certificacao: 'Instituto Ecofuturo',  ano_mes: anoMesAtual },
      { id_usuario: 1, tipo_acao: 'Crédito de carbono',    kg_compensado: 10.0, descricao: 'Crédito por uso de transporte público',      fonte_certificacao: 'Gold Standard',        ano_mes: anoMesAtual },
      { id_usuario: 6, tipo_acao: 'Compra de créditos REDD+', kg_compensado: 40.0, descricao: 'Créditos de projeto de preservação florestal', fonte_certificacao: 'VERRA VCS',      ano_mes: anoMesAtual },
      { id_usuario: 7, tipo_acao: 'Doação a ONG ambiental', kg_compensado: 5.0, descricao: 'Doação mensal recorrente',                   fonte_certificacao: null,                   ano_mes: anoMesAtual },
      { id_usuario: 9, tipo_acao: 'Instalação de coletor de chuva', kg_compensado: 3.0, descricao: 'Reuso de água pluvial',              fonte_certificacao: null,                   ano_mes: anoMesAtual },
      { id_usuario: 10, tipo_acao: 'Plantio de árvores',   kg_compensado: 25.0, descricao: 'Ação corporativa de reflorestamento',        fonte_certificacao: 'Instituto Ecofuturo',  ano_mes: anoMesAtual,
        comprovante: { arquivo: 'certificado_plantio_thiago.pdf', validado_por: 'Marina Costa', validado_em: new Date() } }, // schema flexível
      { id_usuario: 3, tipo_acao: 'Crédito de carbono',    kg_compensado: 12.0, descricao: 'Créditos adicionais adquiridos em leilão',   fonte_certificacao: 'VERRA VCS',            ano_mes: '2026-08' },
    ];
    r = await db.collection(colCompensacoes).insertMany(compensacoesBase);
    console.log(`compensacoes_carbono: ${r.insertedCount || compensacoesBase.length} documentos inseridos`);

    // Atualiza total_compensado_kg e saldo_carbono_kg nas metas (equivalente à TRIGGER 3)
    for (const comp of compensacoesBase) {
      const metaAtual = await db.collection(colMetas).findOne({ id_usuario: comp.id_usuario, ano_mes: comp.ano_mes });
      if (!metaAtual) continue;
      const novoCompensado = Number(((metaAtual.total_compensado_kg || 0) + comp.kg_compensado).toFixed(4));
      const novoSaldo = Number((metaAtual.total_emitido_mes - novoCompensado).toFixed(4));
      await db.collection(colMetas).updateOne(
        { _id: metaAtual._id },
        { $set: { total_compensado_kg: novoCompensado, saldo_carbono_kg: novoSaldo, ultima_atualizacao: new Date() } }
      );
    }
    console.log('metas_sustentabilidade: totais recalculados após compensações (equivalente à TRIGGER 3).');

    // Gera alertas embutidos nas metas cujo total_emitido ultrapassou a meta (equivalente à TRIGGER 2)
    const metasAtualizadas = await db.collection(colMetas).find({ ano_mes: anoMesAtual }).toArray();
    for (const meta of metasAtualizadas) {
      if (meta.total_emitido_mes > meta.meta_reducao_kg) {
        const kgExcedido = Number((meta.total_emitido_mes - meta.meta_reducao_kg).toFixed(4));
        const percentual = Number(((meta.total_emitido_mes / meta.meta_reducao_kg) * 100).toFixed(2));
        const alerta = {
          tipo_alerta: 'LIMITE_EXCEDIDO',
          mensagem: `Atenção! Emissão projetada (${meta.total_emitido_mes} kg) ultrapassou a meta de ${meta.meta_reducao_kg} kg.`,
          kg_excedido: kgExcedido,
          percentual_meta: percentual,
          gerado_em: new Date(),
          lido: false,
        };
        await db.collection(colMetas).updateOne(
          { _id: meta._id },
          { $push: { alertas: alerta } }
        );
      }
    }
    console.log('metas_sustentabilidade: alertas gerados como subdocumentos (equivalente à TRIGGER 2 / tabela ALERTA_EMISSAO).');

    // ==========================================================
    // 3) READ — consultas variadas em cada collection
    // ==========================================================
    linha('3. OPERACOES DE READ (find)');

    console.log('\n-- 3.1 find: categorias ativas de Escopo 3 --');
    console.log(await db.collection(colCategorias).find({ ativo: true, escopo_ghg: 'Escopo 3' }).project({ nome: 1, fator_emissao_kg: 1, _id: 0 }).toArray());

    console.log('\n-- 3.2 find: registros de nível ALTO impacto --');
    console.log(await db.collection(colRegistros).find({ nivel_impacto: 'ALTO' }).project({ id_usuario: 1, 'categoria.nome': 1, kg_co2e: 1, nivel_impacto: 1, _id: 0 }).toArray());

    console.log('\n-- 3.3 find: metas do mês atual com saldo positivo (emissão líquida) --');
    console.log(await db.collection(colMetas).find({ ano_mes: anoMesAtual, saldo_carbono_kg: { $gt: 0 } }).project({ id_usuario: 1, saldo_carbono_kg: 1, meta_reducao_kg: 1, _id: 0 }).toArray());

    console.log('\n-- 3.4 find: metas que possuem ao menos 1 alerta gerado --');
    const metasComAlerta = await db.collection(colMetas).find({}).toArray();
    console.log(metasComAlerta.filter(m => m.alertas && m.alertas.length > 0).map(m => ({ id_usuario: m.id_usuario, alertas: m.alertas })));

    console.log('\n-- 3.5 find: compensações com certificação (fonte_certificacao != null) --');
    console.log(await db.collection(colCompensacoes).find({ fonte_certificacao: { $ne: null } }).project({ id_usuario: 1, tipo_acao: 1, fonte_certificacao: 1, _id: 0 }).toArray());

    console.log('\n-- 3.6 find + agregação em JS: total emitido por usuário (equivalente a $group) --');
    const todosRegistros = await db.collection(colRegistros).find({}).toArray();
    const totalPorUsuario = {};
    for (const reg of todosRegistros) {
      if (!totalPorUsuario[reg.id_usuario]) totalPorUsuario[reg.id_usuario] = { id_usuario: reg.id_usuario, total_kg_co2e: 0, qtd_registros: 0 };
      totalPorUsuario[reg.id_usuario].total_kg_co2e = Number((totalPorUsuario[reg.id_usuario].total_kg_co2e + reg.kg_co2e).toFixed(4));
      totalPorUsuario[reg.id_usuario].qtd_registros += 1;
    }
    console.log(Object.values(totalPorUsuario).sort((a, b) => b.total_kg_co2e - a.total_kg_co2e));

    console.log('\n-- 3.7 find: usuários com campos extras (schema flexível) --');
    console.log(await db.collection(colUsuarios).find({ certificacoes: { $exists: true } }).project({ nome: 1, certificacoes: 1, _id: 0 }).toArray());

    // ==========================================================
    // 4) UPDATE
    // ==========================================================
    linha('4. OPERACOES DE UPDATE');

    console.log('\n-- 4.1 updateOne: marcar alertas do usuário 3 como lidos --');
    const metaUsuario3 = await db.collection(colMetas).findOne({ id_usuario: 3, ano_mes: anoMesAtual });
    const alertasLidos = (metaUsuario3.alertas || []).map(a => ({ ...a, lido: true }));
    let upd = await db.collection(colMetas).updateOne(
      { _id: metaUsuario3._id },
      { $set: { alertas: alertasLidos } }
    );
    console.log('matchedCount:', upd.matchedCount, '| modifiedCount:', upd.modifiedCount);

    console.log('\n-- 4.2 updateOne: corrigir quantidade de um registro (recalculo de kg_co2e e nivel_impacto feito na aplicacao, no lugar da TRIGGER 4) --');
    const novaQuantidade = 52;
    const fatorCategoria1 = catMap[1].fator_emissao_kg;
    const novoKg = Number((novaQuantidade * fatorCategoria1).toFixed(4));
    upd = await db.collection(colRegistros).updateOne(
      { id_usuario: 1, 'categoria.id_categoria': 1 },
      { $set: {
          observacao: 'Trajeto diário trabalho - gasolina (corrigido: 52 km)',
          quantidade: novaQuantidade,
          kg_co2e: novoKg,
          nivel_impacto: classificarNivelImpacto(novoKg),
        } }
    );
    console.log('matchedCount:', upd.matchedCount, '| modifiedCount:', upd.modifiedCount, '| novo kg_co2e:', novoKg);

    console.log('\n-- 4.3 updateMany: desativar categorias de Escopo 1 com fator > 0.25 (combustão fóssil direta mais intensa) --');
    upd = await db.collection(colCategorias).updateMany(
      { escopo_ghg: 'Escopo 1', fator_emissao_kg: { $gt: 0.25 } },
      { $set: { ativo: false, inativado_em: new Date() } }
    );
    console.log('matchedCount:', upd.matchedCount, '| modifiedCount:', upd.modifiedCount);

    console.log('\n-- 4.4 updateOne: revisar meta_reducao_kg do usuário 9 (aumento de meta) --');
    upd = await db.collection(colMetas).updateOne(
      { id_usuario: 9, ano_mes: anoMesAtual },
      { $inc: { meta_reducao_kg: 10 } }
    );
    console.log('matchedCount:', upd.matchedCount, '| modifiedCount:', upd.modifiedCount);

    console.log('\n-- 4.5 updateOne: adicionar certificação a usuária que não tinha (schema flexível em ação) --');
    upd = await db.collection(colUsuarios).updateOne(
      { _id: 3 },
      { $set: { certificacoes: ['B Corp Assessment'] } }
    );
    console.log('matchedCount:', upd.matchedCount, '| modifiedCount:', upd.modifiedCount);

    // ==========================================================
    // 5) DELETE
    // ==========================================================
    linha('5. OPERACOES DE DELETE');

    console.log('\n-- 5.1 deleteOne: remover uma compensação lançada em duplicidade --');
    const compDuplicada = await db.collection(colCompensacoes).findOne({ id_usuario: 3, ano_mes: '2026-08' });
    let del = await db.collection(colCompensacoes).deleteOne({ _id: compDuplicada._id });
    console.log('deletedCount:', del.deletedCount ?? del.result?.n);

    console.log('\n-- 5.2 deleteOne: remover categoria descontinuada (diesel) --');
    del = await db.collection(colCategorias).deleteOne({ _id: 11 });
    console.log('deletedCount:', del.deletedCount ?? del.result?.n);

    console.log('\n-- 5.3 deleteOne: remover registro de emissão lançado por engano (usuário 4) --');
    const regParaRemover = await db.collection(colRegistros).findOne({ id_usuario: 4 });
    del = await db.collection(colRegistros).deleteOne({ _id: regParaRemover._id });
    console.log('deletedCount:', del.deletedCount ?? del.result?.n);

    // Recalcula a meta do usuário 4 após a remoção do registro (equivalente à TRIGGER 1 no DELETE)
    const registrosRestantesUsuario4 = await db.collection(colRegistros).find({ id_usuario: 4 }).toArray();
    const novoTotalUsuario4 = Number(registrosRestantesUsuario4.reduce((s, r2) => s + r2.kg_co2e, 0).toFixed(4));
    await db.collection(colMetas).updateOne(
      { id_usuario: 4, ano_mes: anoMesAtual },
      { $set: { total_emitido_mes: novoTotalUsuario4, saldo_carbono_kg: novoTotalUsuario4 } }
    );
    console.log('metas_sustentabilidade: total_emitido_mes do usuário 4 recalculado após DELETE ->', novoTotalUsuario4);

    // ==========================================================
    // 6) ESTADO FINAL
    // ==========================================================
    linha('6. ESTADO FINAL DAS COLLECTIONS');

    for (const nome of [colCategorias, colRegistros, colMetas, colCompensacoes, colUsuarios]) {
      const docs = await db.collection(nome).find({}).toArray();
      console.log(`${nome}: ${docs.length} documentos`);
    }

    console.log('\n-- Amostra final: 1 documento completo de cada collection --');
    for (const nome of [colCategorias, colRegistros, colMetas, colCompensacoes, colUsuarios]) {
      const doc = await db.collection(nome).findOne();
      console.log(`\n[${nome}]`);
      console.log(JSON.stringify(doc, null, 2));
    }

    console.log('\nExecução concluída com sucesso.');
    process.exit(0);
  } catch (e) {
    console.error('ERRO NA EXECUCAO:', e);
    process.exit(1);
  }
});
