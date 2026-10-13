// Carga inicial do EcoImpact: os mesmos dados da seção "2. CREATE" do script original
// (src/ecoimpact_mongodb_script.js). Usada para popular os ambientes de staging/produção.

function dadosIniciais(anoMesAtual) {
  const usuarios = [
    { _id: 1, nome: 'Ana Beatriz Souza',   email: 'ana.souza@ecoimpact.com',         cargo: 'Analista ESG',                 departamento: 'Sustentabilidade', ativo: true,  criado_em: new Date('2025-01-10') },
    { _id: 2, nome: 'Carlos Eduardo Lima', email: 'carlos.lima@ecoimpact.com',       cargo: 'Gerente Operacional',          departamento: 'Operações',        ativo: true,  criado_em: new Date('2025-01-12') },
    { _id: 3, nome: 'Fernanda Torres',     email: 'fernanda.torres@ecoimpact.com',   cargo: 'Coordenadora ESG',             departamento: 'Sustentabilidade', ativo: true,  criado_em: new Date('2025-02-01') },
    { _id: 4, nome: 'João Pedro Alves',    email: 'joao.alves@ecoimpact.com',        cargo: 'Analista Financeiro',          departamento: 'Financeiro',       ativo: true,  criado_em: new Date('2025-02-15') },
    { _id: 5, nome: 'Marina Costa',        email: 'marina.costa@ecoimpact.com',      cargo: 'Diretora de Sustentabilidade', departamento: 'Diretoria',        ativo: true,  criado_em: new Date('2025-03-01'),
      certificacoes: ['GHG Protocol', 'ISO 14001 Lead Auditor'] }, // campo extra - schema flexível
    { _id: 6, nome: 'Ricardo Nunes',       email: 'ricardo.nunes@ecoimpact.com',     cargo: 'Estagiário ESG',               departamento: 'Sustentabilidade', ativo: true,  criado_em: new Date('2025-03-10') },
    { _id: 7, nome: 'Beatriz Fernandes',   email: 'beatriz.fernandes@ecoimpact.com', cargo: 'Analista de Compliance',       departamento: 'Jurídico',         ativo: true,  criado_em: new Date('2025-03-20') },
    { _id: 8, nome: 'Lucas Martins',       email: 'lucas.martins@ecoimpact.com',     cargo: 'Analista ESG Pleno',           departamento: 'Sustentabilidade', ativo: false, criado_em: new Date('2025-04-01'), desativado_em: new Date('2026-01-05') },
    { _id: 9, nome: 'Patrícia Gomes',      email: 'patricia.gomes@ecoimpact.com',    cargo: 'Gerente de RH',                departamento: 'Recursos Humanos', ativo: true,  criado_em: new Date('2025-04-18') },
    { _id: 10, nome: 'Thiago Rocha',       email: 'thiago.rocha@ecoimpact.com',      cargo: 'Coordenador de Operações',     departamento: 'Operações',        ativo: true,  criado_em: new Date('2025-05-02') },
    { _id: 11, nome: 'Camila Duarte',      email: 'camila.duarte@ecoimpact.com',     cargo: 'Analista ESG Junior',          departamento: 'Sustentabilidade', ativo: true,  criado_em: new Date('2025-05-20') },
  ];

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
    { _id: 11, nome: 'Combustível Fóssil - Diesel', descricao: 'Veículo utilitário/comercial a diesel',  fator_emissao_kg: 0.2680, unidade_medida: 'km',     escopo_ghg: 'Escopo 1', ativo: true, criado_em: new Date() },
  ];

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

  const compensacoesBase = [
    { id_usuario: 1, tipo_acao: 'Plantio de árvores',    kg_compensado: 20.0, descricao: 'Plantio de 4 mudas nativas',                  fonte_certificacao: 'SOS Mata Atlântica',  ano_mes: anoMesAtual },
    { id_usuario: 2, tipo_acao: 'Crédito de carbono',    kg_compensado: 50.0, descricao: 'Compra de crédito certificado',               fonte_certificacao: 'VERRA VCS',           ano_mes: anoMesAtual },
    { id_usuario: 3, tipo_acao: 'Energia Solar',         kg_compensado: 15.0, descricao: 'Geração própria fotovoltaica',                fonte_certificacao: null,                  ano_mes: anoMesAtual },
    { id_usuario: 4, tipo_acao: 'Compostagem',           kg_compensado: 8.0,  descricao: 'Compostagem domiciliar',                      fonte_certificacao: null,                  ano_mes: anoMesAtual },
    { id_usuario: 5, tipo_acao: 'Plantio de árvores',    kg_compensado: 30.0, descricao: 'Patrocínio de reflorestamento',               fonte_certificacao: 'Instituto Ecofuturo', ano_mes: anoMesAtual },
    { id_usuario: 1, tipo_acao: 'Crédito de carbono',    kg_compensado: 10.0, descricao: 'Crédito por uso de transporte público',       fonte_certificacao: 'Gold Standard',       ano_mes: anoMesAtual },
    { id_usuario: 6, tipo_acao: 'Compra de créditos REDD+', kg_compensado: 40.0, descricao: 'Créditos de projeto de preservação florestal', fonte_certificacao: 'VERRA VCS',     ano_mes: anoMesAtual },
    { id_usuario: 7, tipo_acao: 'Doação a ONG ambiental', kg_compensado: 5.0, descricao: 'Doação mensal recorrente',                    fonte_certificacao: null,                  ano_mes: anoMesAtual },
    { id_usuario: 9, tipo_acao: 'Instalação de coletor de chuva', kg_compensado: 3.0, descricao: 'Reuso de água pluvial',               fonte_certificacao: null,                  ano_mes: anoMesAtual },
    { id_usuario: 10, tipo_acao: 'Plantio de árvores',   kg_compensado: 25.0, descricao: 'Ação corporativa de reflorestamento',         fonte_certificacao: 'Instituto Ecofuturo', ano_mes: anoMesAtual,
      comprovante: { arquivo: 'certificado_plantio_thiago.pdf', validado_por: 'Marina Costa', validado_em: new Date() } }, // schema flexível
    { id_usuario: 3, tipo_acao: 'Crédito de carbono',    kg_compensado: 12.0, descricao: 'Créditos adicionais adquiridos em leilão',    fonte_certificacao: 'VERRA VCS',           ano_mes: '2026-08' },
  ];

  return { usuarios, categorias, registrosBase, metasBase, compensacoesBase };
}

module.exports = { dadosIniciais };
