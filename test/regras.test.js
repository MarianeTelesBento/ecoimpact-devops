const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../src/regras');

test('classificarNivelImpacto respeita as faixas BAIXO / MEDIO / ALTO', () => {
  assert.equal(R.classificarNivelImpacto(0), 'BAIXO');
  assert.equal(R.classificarNivelImpacto(9.99), 'BAIXO');
  assert.equal(R.classificarNivelImpacto(10), 'MEDIO');
  assert.equal(R.classificarNivelImpacto(50), 'MEDIO');
  assert.equal(R.classificarNivelImpacto(50.01), 'ALTO');
});

test('calcularKgCo2e multiplica quantidade pelo fator e arredonda em 4 casas', () => {
  assert.equal(R.calcularKgCo2e(50, 0.21), 10.5);
  assert.equal(R.calcularKgCo2e(300, 0.0817), 24.51);
  assert.equal(R.calcularKgCo2e(3, 6.6), 19.8);
});

test('anoMes devolve o período no formato AAAA-MM', () => {
  assert.equal(R.anoMes(new Date('2026-10-12T12:00:00Z')), '2026-10');
  assert.match(R.anoMes(), /^\d{4}-\d{2}$/);
});

test('gerarAlertaSeExcedeu só gera alerta quando o total passa da meta', () => {
  assert.equal(R.gerarAlertaSeExcedeu(80, 80), null);
  assert.equal(R.gerarAlertaSeExcedeu(50, 80), null);

  const alerta = R.gerarAlertaSeExcedeu(108.51, 80);
  assert.equal(alerta.tipo_alerta, 'LIMITE_EXCEDIDO');
  assert.equal(alerta.kg_excedido, 28.51);
  assert.equal(alerta.percentual_meta, 135.64);
  assert.equal(alerta.lido, false);
});

test('calcularSaldo = emitido - compensado', () => {
  assert.equal(R.calcularSaldo(108.51, 50), 58.51);
  assert.equal(R.calcularSaldo(10, 25), -15);
});
