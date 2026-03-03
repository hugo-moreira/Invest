/**
 * Modelo de dados e funções de persistência (localStorage)
 * Painel Finanças 2026
 */

const STORAGE_KEYS = {
    GASTOS: 'painel2026_gastos',
    CARTOES: 'painel2026_cartoes',
    FINANCIAMENTO: 'painel2026_financiamento',
    INVESTIMENTOS: 'painel2026_investimentos',
    METAS: 'painel2026_metas',
    GASTOS_MENSAIS: 'painel2026_gastos_mensais',
    APORTES_MENSAIS: 'painel2026_aportes_mensais',
    API_KEY: 'painel2026_api_key'
};

/**
 * Retorna todos os gastos do localStorage
 * @returns {Array<{id: string, descricao: string, valor: number, valorMax?: number, tipo: string}>}
 */
function getGastos() {
    const data = localStorage.getItem(STORAGE_KEYS.GASTOS);
    return data ? JSON.parse(data) : [];
}

/**
 * Salva gastos no localStorage
 * @param {Array} gastos - Array de gastos
 */
function saveGastos(gastos) {
    localStorage.setItem(STORAGE_KEYS.GASTOS, JSON.stringify(gastos));
}

/**
 * Adiciona um gasto
 * @param {Object} gasto - { descricao, valor, valorMax?, tipo }
 * @returns {Object} - Gasto com id
 */
function addGasto(gasto) {
    const gastos = getGastos();
    const novo = {
        id: 'gasto_' + Date.now(),
        descricao: gasto.descricao,
        valor: parseFloat(gasto.valor) || 0,
        tipo: gasto.tipo || 'fixo'
    };
    if (gasto.valorMax) novo.valorMax = parseFloat(gasto.valorMax);
    gastos.push(novo);
    saveGastos(gastos);
    return novo;
}

/**
 * Atualiza um gasto
 * @param {string} id - ID do gasto
 * @param {Object} dados - Dados a atualizar
 */
function updateGasto(id, dados) {
    const gastos = getGastos();
    const idx = gastos.findIndex(g => g.id === id);
    if (idx >= 0) {
        gastos[idx] = { ...gastos[idx], ...dados };
        saveGastos(gastos);
    }
}

/**
 * Remove um gasto
 * @param {string} id - ID do gasto
 */
function removeGasto(id) {
    const gastos = getGastos().filter(g => g.id !== id);
    saveGastos(gastos);
}

/**
 * Retorna todos os cartões
 * @returns {Array}
 */
function getCartoes() {
    const data = localStorage.getItem(STORAGE_KEYS.CARTOES);
    return data ? JSON.parse(data) : [];
}

/**
 * Salva cartões
 * @param {Array} cartoes
 */
function saveCartoes(cartoes) {
    localStorage.setItem(STORAGE_KEYS.CARTOES, JSON.stringify(cartoes));
}

/**
 * Adiciona ou atualiza cartão
 * @param {Object} cartao - { nome, limite, saldo, parcelas }
 * @returns {Object}
 */
function saveCartao(cartao) {
    const cartoes = getCartoes();
    const existente = cartoes.find(c => c.nome === cartao.nome);
    const dados = {
        id: existente?.id || 'cartao_' + Date.now(),
        nome: cartao.nome,
        limite: parseFloat(cartao.limite) || 0,
        saldo: parseFloat(cartao.saldo) || 0,
        parcelas: parseInt(cartao.parcelas) || 12
    };
    if (existente) {
        const idx = cartoes.findIndex(c => c.id === existente.id);
        cartoes[idx] = dados;
    } else {
        cartoes.push(dados);
    }
    saveCartoes(cartoes);
    return dados;
}

/**
 * Remove cartão
 * @param {string} id
 */
function removeCartao(id) {
    const cartoes = getCartoes().filter(c => c.id !== id);
    saveCartoes(cartoes);
}

/**
 * Retorna dados do financiamento
 * @returns {Object|null}
 */
function getFinanciamento() {
    const data = localStorage.getItem(STORAGE_KEYS.FINANCIAMENTO);
    return data ? JSON.parse(data) : null;
}

/**
 * Salva financiamento
 * @param {Object} fin
 */
function saveFinanciamento(fin) {
    localStorage.setItem(STORAGE_KEYS.FINANCIAMENTO, JSON.stringify(fin));
}

/**
 * Retorna todos os investimentos
 * @returns {Array}
 */
function getInvestimentos() {
    const data = localStorage.getItem(STORAGE_KEYS.INVESTIMENTOS);
    return data ? JSON.parse(data) : [];
}

/**
 * Salva investimentos
 * @param {Array} investimentos
 */
function saveInvestimentos(investimentos) {
    localStorage.setItem(STORAGE_KEYS.INVESTIMENTOS, JSON.stringify(investimentos));
}

/**
 * Adiciona investimento
 * @param {Object} inv - { nome, tipo, quantidade, precoMedio, valorAtual, ticker?, aporteMensal }
 * @returns {Object}
 */
function addInvestimento(inv) {
    const investimentos = getInvestimentos();
    const novo = {
        id: 'inv_' + Date.now(),
        nome: inv.nome,
        tipo: inv.tipo,
        quantidade: parseFloat(inv.quantidade) || 0,
        precoMedio: parseFloat(inv.precoMedio) || 0,
        valorAtual: parseFloat(inv.valorAtual) || 0,
        aporteMensal: parseFloat(inv.aporteMensal) || 0
    };
    if (inv.ticker) novo.ticker = inv.ticker;
    investimentos.push(novo);
    saveInvestimentos(investimentos);
    return novo;
}

/**
 * Atualiza investimento
 * @param {string} id
 * @param {Object} dados
 */
function updateInvestimento(id, dados) {
    const investimentos = getInvestimentos();
    const idx = investimentos.findIndex(i => i.id === id);
    if (idx >= 0) {
        investimentos[idx] = { ...investimentos[idx], ...dados };
        saveInvestimentos(investimentos);
    }
}

/**
 * Remove investimento
 * @param {string} id
 */
function removeInvestimento(id) {
    const investimentos = getInvestimentos().filter(i => i.id !== id);
    saveInvestimentos(investimentos);
}

/**
 * Retorna metas (aporte, taxa, alocação)
 * @returns {Object}
 */
function getMetas() {
    const data = localStorage.getItem(STORAGE_KEYS.METAS);
    return data ? JSON.parse(data) : { aporte: 0, taxa: 10, alocacao: {} };
}

/**
 * Salva metas
 * @param {Object} metas
 */
function saveMetas(metas) {
    localStorage.setItem(STORAGE_KEYS.METAS, JSON.stringify(metas));
}

/**
 * Retorna gastos mensais por mês (para gráfico)
 * @returns {Object} - { "2026-01": 1500, ... }
 */
function getGastosMensais() {
    const data = localStorage.getItem(STORAGE_KEYS.GASTOS_MENSAIS);
    return data ? JSON.parse(data) : {};
}

/**
 * Salva gastos mensais
 * @param {Object} dados
 */
function saveGastosMensais(dados) {
    localStorage.setItem(STORAGE_KEYS.GASTOS_MENSAIS, JSON.stringify(dados));
}

/**
 * Retorna aportes mensais por mês
 * @returns {Object}
 */
function getAportesMensais() {
    const data = localStorage.getItem(STORAGE_KEYS.APORTES_MENSAIS);
    return data ? JSON.parse(data) : {};
}

/**
 * Salva aportes mensais
 * @param {Object} dados
 */
function saveAportesMensais(dados) {
    localStorage.setItem(STORAGE_KEYS.APORTES_MENSAIS, JSON.stringify(dados));
}

/**
 * Retorna chave API
 * @returns {string}
 */
function getApiKey() {
    return localStorage.getItem(STORAGE_KEYS.API_KEY) || '';
}

/**
 * Salva chave API
 * @param {string} key
 */
function saveApiKey(key) {
    localStorage.setItem(STORAGE_KEYS.API_KEY, key);
}

/**
 * Exporta todos os dados como JSON
 * @returns {string}
 */
function exportarDados() {
    return JSON.stringify({
        gastos: getGastos(),
        cartoes: getCartoes(),
        financiamento: getFinanciamento(),
        investimentos: getInvestimentos(),
        metas: getMetas(),
        gastosMensais: getGastosMensais(),
        aportesMensais: getAportesMensais(),
        exportadoEm: new Date().toISOString()
    }, null, 2);
}

/**
 * Importa dados de JSON
 * @param {string} json
 */
function importarDados(json) {
    try {
        const dados = JSON.parse(json);
        if (dados.gastos) saveGastos(dados.gastos);
        if (dados.cartoes) saveCartoes(dados.cartoes);
        if (dados.financiamento) saveFinanciamento(dados.financiamento);
        if (dados.investimentos) saveInvestimentos(dados.investimentos);
        if (dados.metas) saveMetas(dados.metas);
        if (dados.gastosMensais) saveGastosMensais(dados.gastosMensais);
        if (dados.aportesMensais) saveAportesMensais(dados.aportesMensais);
        return true;
    } catch (e) {
        return false;
    }
}
