const express = require('express');
const { ErroValidacao, ErroNaoEncontrado } = require('./erros');

/**
 * Cria a aplicação Express.
 * @param {object} servico  camada de serviço (ver servico.js)
 * @param {object} opcoes   { ambiente, ping } - ping() deve resolver se o banco estiver acessível
 */
function criarApp(servico, { ambiente = 'local', ping = async () => {} } = {}) {
  const app = express();
  app.use(express.json());

  const rota = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);

  const inteiroOpcional = (valor, campo) => {
    if (valor === undefined) return undefined;
    const n = Number(valor);
    if (!Number.isInteger(n)) throw new ErroValidacao(`${campo} deve ser um inteiro`);
    return n;
  };

  app.get('/', (req, res) => {
    res.json({
      aplicacao: 'EcoImpact - Cidades ESG Inteligentes',
      ambiente,
      endpoints: [
        '/health',
        '/api/usuarios',
        '/api/categorias?escopo=Escopo 3',
        '/api/registros?id_usuario=1',
        '/api/metas?ano_mes=AAAA-MM',
        '/api/compensacoes',
        '/api/resumo',
      ],
    });
  });

  app.get('/health', async (req, res) => {
    try {
      await ping();
      res.json({ status: 'UP', banco: 'UP', ambiente });
    } catch (e) {
      res.status(503).json({ status: 'DOWN', banco: 'DOWN', ambiente });
    }
  });

  app.get('/api/usuarios', rota(async (req, res) => res.json(await servico.listarUsuarios())));

  app.get('/api/categorias', rota(async (req, res) => {
    const ativo = req.query.ativo === undefined ? undefined : req.query.ativo === 'true';
    res.json(await servico.listarCategorias({ escopo: req.query.escopo, ativo }));
  }));

  app.get('/api/registros', rota(async (req, res) => {
    res.json(await servico.listarRegistros({ idUsuario: inteiroOpcional(req.query.id_usuario, 'id_usuario') }));
  }));

  app.post('/api/registros', rota(async (req, res) => {
    res.status(201).json(await servico.registrarEmissao(req.body));
  }));

  app.get('/api/metas', rota(async (req, res) => {
    res.json(await servico.listarMetas({ anoMes: req.query.ano_mes }));
  }));

  app.get('/api/compensacoes', rota(async (req, res) => {
    res.json(await servico.listarCompensacoes({ idUsuario: inteiroOpcional(req.query.id_usuario, 'id_usuario') }));
  }));

  app.post('/api/compensacoes', rota(async (req, res) => {
    res.status(201).json(await servico.registrarCompensacao(req.body));
  }));

  app.get('/api/resumo', rota(async (req, res) => res.json(await servico.resumoPorUsuario())));

  // JSON malformado no corpo
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err instanceof ErroValidacao) return res.status(400).json({ erro: err.message });
    if (err instanceof ErroNaoEncontrado) return res.status(404).json({ erro: err.message });
    if (err.type === 'entity.parse.failed') return res.status(400).json({ erro: 'JSON inválido' });
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  });

  return app;
}

module.exports = { criarApp };
