const test = require('node:test');
const assert = require('node:assert/strict');
const { bancoEmMemoria } = require('../support/mock-db');
const { criarServico } = require('../src/servico');
const { criarApp } = require('../src/app');
const { semear } = require('../src/seed');

async function iniciar({ ping } = {}) {
  const db = await bancoEmMemoria();
  await semear(db);
  const app = criarApp(criarServico(db), { ambiente: 'teste', ping });
  const servidor = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const base = `http://127.0.0.1:${servidor.address().port}`;
  const get = async (caminho) => {
    const r = await fetch(base + caminho);
    return { status: r.status, corpo: await r.json() };
  };
  const post = async (caminho, corpo) => {
    const r = await fetch(base + caminho, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: typeof corpo === 'string' ? corpo : JSON.stringify(corpo),
    });
    return { status: r.status, corpo: await r.json() };
  };
  const fechar = async () => {
    await new Promise((resolve) => servidor.close(resolve));
    await db.close(); // mongo-mock mantém um intervalo ativo enquanto o banco está "aberto"
  };
  return { db, get, post, fechar };
}

test('carga inicial é idempotente e cria as 5 collections populadas', async () => {
  const db = await bancoEmMemoria();
  const primeira = await semear(db);
  assert.equal(primeira.semeado, true);
  assert.equal(primeira.usuarios, 11);
  assert.equal(primeira.categorias, 11);
  assert.equal(primeira.registros, 12);

  const segunda = await semear(db);
  assert.equal(segunda.semeado, false);
  assert.equal((await db.collection('categorias_emissao').find({}).toArray()).length, 11);
  await db.close();
});

test('GET /health responde UP quando o banco está acessível', async () => {
  const ctx = await iniciar();
  try {
    const { status, corpo } = await ctx.get('/health');
    assert.equal(status, 200);
    assert.equal(corpo.status, 'UP');
    assert.equal(corpo.ambiente, 'teste');
  } finally {
    await ctx.fechar();
  }
});

test('GET /health responde 503 quando o banco está fora', async () => {
  const ctx = await iniciar({ ping: async () => { throw new Error('sem banco'); } });
  try {
    const { status, corpo } = await ctx.get('/health');
    assert.equal(status, 503);
    assert.equal(corpo.status, 'DOWN');
  } finally {
    await ctx.fechar();
  }
});

test('GET /api/categorias lista e filtra por escopo GHG', async () => {
  const ctx = await iniciar();
  try {
    const todas = await ctx.get('/api/categorias');
    assert.equal(todas.corpo.length, 11);

    const escopo3 = await ctx.get(`/api/categorias?escopo=${encodeURIComponent('Escopo 3')}`);
    assert.equal(escopo3.status, 200);
    assert.equal(escopo3.corpo.length, 6);
    assert.ok(escopo3.corpo.every((c) => c.escopo_ghg === 'Escopo 3'));
  } finally {
    await ctx.fechar();
  }
});

test('metas da carga inicial têm totais, saldo e alerta calculados (antes: triggers)', async () => {
  const ctx = await iniciar();
  try {
    const { corpo: metas } = await ctx.get('/api/metas');
    const mesAtual = new Date().toISOString().slice(0, 7);
    const meta2 = metas.find((m) => m.id_usuario === 2 && m.ano_mes === mesAtual);

    assert.equal(meta2.total_emitido_mes, 108.51); // 300*0,0817 + 400*0,21
    assert.equal(meta2.total_compensado_kg, 50);
    assert.equal(meta2.saldo_carbono_kg, 58.51);
    assert.equal(meta2.alertas.length, 1);
    assert.equal(meta2.alertas[0].tipo_alerta, 'LIMITE_EXCEDIDO');

    const meta5 = metas.find((m) => m.id_usuario === 5 && m.ano_mes === mesAtual);
    assert.equal(meta5.alertas.length, 0); // 13,5 kg emitidos, meta 90
  } finally {
    await ctx.fechar();
  }
});

test('POST /api/registros calcula kg, classifica o impacto e atualiza a meta e o alerta', async () => {
  const ctx = await iniciar();
  try {
    const { status, corpo } = await ctx.post('/api/registros', {
      id_usuario: 7, id_categoria: 7, quantidade: 200, observacao: 'Voo de teste',
    });
    assert.equal(status, 201);
    assert.equal(corpo.registro.kg_co2e, 51);
    assert.equal(corpo.registro.nivel_impacto, 'ALTO');
    assert.equal(corpo.meta.total_emitido_mes, 56.34); // 5,34 do seed + 51
    assert.equal(corpo.meta.alertas.length, 1);
  } finally {
    await ctx.fechar();
  }
});

test('POST /api/compensacoes atualiza total compensado e saldo da meta', async () => {
  const ctx = await iniciar();
  try {
    const { status, corpo } = await ctx.post('/api/compensacoes', {
      id_usuario: 6, tipo_acao: 'Plantio de árvores', kg_compensado: 60, fonte_certificacao: 'Teste',
    });
    assert.equal(status, 201);
    assert.equal(corpo.meta.total_compensado_kg, 100); // 40 do seed + 60
    assert.equal(corpo.meta.saldo_carbono_kg, 104); // 204 - 100
  } finally {
    await ctx.fechar();
  }
});

test('GET /api/resumo ordena usuários pelo total emitido (maior primeiro)', async () => {
  const ctx = await iniciar();
  try {
    const { corpo } = await ctx.get('/api/resumo');
    assert.equal(corpo[0].id_usuario, 6);
    assert.equal(corpo[0].total_kg_co2e, 204);
    for (let i = 1; i < corpo.length; i++) {
      assert.ok(corpo[i - 1].total_kg_co2e >= corpo[i].total_kg_co2e);
    }
  } finally {
    await ctx.fechar();
  }
});

test('validações devolvem 400 / 404', async () => {
  const ctx = await iniciar();
  try {
    assert.equal((await ctx.post('/api/registros', { id_usuario: 1, id_categoria: 1, quantidade: -5 })).status, 400);
    assert.equal((await ctx.post('/api/registros', { id_usuario: 1, id_categoria: 1 })).status, 400);
    assert.equal((await ctx.post('/api/registros', { id_usuario: 99, id_categoria: 1, quantidade: 5 })).status, 404);
    assert.equal((await ctx.post('/api/registros', { id_usuario: 1, id_categoria: 99, quantidade: 5 })).status, 404);
    assert.equal((await ctx.post('/api/compensacoes', { id_usuario: 1, tipo_acao: '', kg_compensado: 5 })).status, 400);
    assert.equal((await ctx.post('/api/registros', '{json quebrado')).status, 400);
    assert.equal((await ctx.get('/api/registros?id_usuario=abc')).status, 400);
  } finally {
    await ctx.fechar();
  }
});

test('categoria inativa não aceita novos registros', async () => {
  const ctx = await iniciar();
  try {
    await ctx.db.collection('categorias_emissao').updateOne({ _id: 11 }, { $set: { ativo: false } });
    const { status, corpo } = await ctx.post('/api/registros', { id_usuario: 10, id_categoria: 11, quantidade: 10 });
    assert.equal(status, 400);
    assert.match(corpo.erro, /inativa/);
  } finally {
    await ctx.fechar();
  }
});
