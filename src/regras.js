// Regras de negócio do EcoImpact (antes implementadas como triggers PL/SQL).

/** TRIGGER 4 (TRG_CLASSIFICA_NIVEL_IMPACTO): classifica o impacto pelo kg de CO2e. */
function classificarNivelImpacto(kg) {
  if (kg < 10) return 'BAIXO';
  if (kg <= 50) return 'MEDIO';
  return 'ALTO';
}

function arredondar(valor) {
  return Number(Number(valor).toFixed(4));
}

/** kg de CO2e = quantidade x fator de emissão da categoria. */
function calcularKgCo2e(quantidade, fatorEmissaoKg) {
  return arredondar(quantidade * fatorEmissaoKg);
}

/** Período no formato AAAA-MM (ex.: 2026-10). */
function anoMes(data = new Date()) {
  return data.toISOString().slice(0, 7);
}

/** TRIGGER 2 (TRG_ALERTA_EMISSAO): devolve o alerta se o total emitido passou da meta, senão null. */
function gerarAlertaSeExcedeu(totalEmitido, metaReducaoKg) {
  if (!(totalEmitido > metaReducaoKg)) return null;
  const kgExcedido = arredondar(totalEmitido - metaReducaoKg);
  const percentual = Number(((totalEmitido / metaReducaoKg) * 100).toFixed(2));
  return {
    tipo_alerta: 'LIMITE_EXCEDIDO',
    mensagem: `Atenção! Emissão projetada (${totalEmitido} kg) ultrapassou a meta de ${metaReducaoKg} kg.`,
    kg_excedido: kgExcedido,
    percentual_meta: percentual,
    gerado_em: new Date(),
    lido: false,
  };
}

/** Saldo de carbono = emitido - compensado. */
function calcularSaldo(totalEmitido, totalCompensado) {
  return arredondar(totalEmitido - totalCompensado);
}

module.exports = {
  classificarNivelImpacto,
  arredondar,
  calcularKgCo2e,
  anoMes,
  gerarAlertaSeExcedeu,
  calcularSaldo,
};
