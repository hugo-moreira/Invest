/**
 * Modelo de dados e funções de persistência (localStorage)
 * Painel Finanças 2026
 */

const STORAGE_KEYS = {
    GASTOS: 'painel2026_gastos',
    CARTOES: 'painel2026_cartoes',
    FATURAS_RESUMO: 'painel2026_faturas_resumo',
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
 * Retorna a competência atual no formato AAAA-MM.
 * @returns {string}
 */
function obterCompetenciaAtual() {
    const agora = new Date();
    return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`;
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
        tipo: gasto.tipo || 'fixo',
        competencia: gasto.competencia || obterCompetenciaAtual()
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
 * Retorna os resumos importados das faturas.
 * @returns {Array}
 */
function getFaturasResumo() {
    const data = localStorage.getItem(STORAGE_KEYS.FATURAS_RESUMO);
    return data ? JSON.parse(data) : [];
}

/**
 * Salva os resumos importados das faturas.
 * @param {Array} faturasResumo
 */
function saveFaturasResumo(faturasResumo) {
    localStorage.setItem(STORAGE_KEYS.FATURAS_RESUMO, JSON.stringify(faturasResumo));
}

/**
 * Adiciona ou atualiza cartão
 * @param {Object} cartao - { nome, limite, saldo, parcelas, jurosMensal?, parcelaPlanejada? }
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
        parcelas: parseInt(cartao.parcelas) || 12,
        jurosMensal: parseFloat(cartao.jurosMensal) || 0,
        parcelaPlanejada: parseFloat(cartao.parcelaPlanejada) || 0
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
    return data ? JSON.parse(data).map(normalizarInvestimento) : [];
}

/**
 * Normaliza um investimento para o formato interno esperado pelo painel.
 * @param {Object} inv
 * @returns {Object}
 */
function normalizarInvestimento(inv) {
    const normalizado = {
        id: inv.id || 'inv_' + Date.now(),
        nome: inv.nome || '',
        tipo: inv.tipo || 'renda_fixa',
        objetivo: inv.objetivo || '',
        liquidez: inv.liquidez || '',
        risco: inv.risco || '',
        quantidade: parseFloat(inv.quantidade) || 0,
        precoMedio: parseFloat(inv.precoMedio) || 0,
        valorAtual: parseFloat(inv.valorAtual) || 0,
        aporteMensal: parseFloat(inv.aporteMensal) || 0,
        minimo: parseFloat(inv.minimo) || 0,
        taxa: parseFloat(inv.taxa) || 0,
        tributacaoRegime: inv.tributacaoRegime || '',
        comeCotas: Boolean(inv.comeCotas),
        rentabilidadeReal: parseFloat(inv.rentabilidadeReal) || 0,
        vencimento: inv.vencimento || '',
        marcacaoMercado: Boolean(inv.marcacaoMercado)
    };
    if (inv.ticker) normalizado.ticker = inv.ticker;
    return normalizado;
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
 * @param {Object} inv - { nome, tipo, objetivo?, liquidez?, risco?, quantidade, precoMedio, valorAtual, ticker?, aporteMensal, minimo?, taxa?, tributacaoRegime?, comeCotas?, rentabilidadeReal?, vencimento?, marcacaoMercado? }
 * @returns {Object}
 */
function addInvestimento(inv) {
    const investimentos = getInvestimentos();
    const novo = normalizarInvestimento({ ...inv, id: 'inv_' + Date.now() });
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
        investimentos[idx] = normalizarInvestimento({ ...investimentos[idx], ...dados, id });
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
    return data
        ? JSON.parse(data)
        : { aporte: 0, aporteMin: 0, aporteMax: 0, taxa: 10, reservaMesesMeta: 6, alocacao: {} };
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
        faturasResumo: getFaturasResumo(),
        investimentos: getInvestimentos(),
        metas: getMetas(),
        gastosMensais: getGastosMensais(),
        aportesMensais: getAportesMensais(),
        exportadoEm: new Date().toISOString()
    }, null, 2);
}

/**
 * Gera uma chave estável para deduplicar gastos importados.
 * @param {Object} gasto
 * @returns {string}
 */
function criarChaveGasto(gasto) {
    const descricao = String(gasto.descricao || '').trim().toLowerCase();
    const valor = (parseFloat(gasto.valor) || 0).toFixed(2);
    const tipo = String(gasto.tipo || '').trim().toLowerCase();
    const dataCompra = String(gasto.dataCompra || '').trim();
    const statusParcelamento = String(gasto.statusParcelamento || '').trim().toLowerCase();
    return [descricao, valor, tipo, dataCompra, statusParcelamento].join('|');
}

/**
 * Converte um gasto sugerido de fatura para o formato interno do painel.
 * @param {Object} gasto
 * @returns {Object}
 */
function normalizarGastoImportado(gasto) {
    return {
        id: gasto.id || 'gasto_' + Date.now() + '_' + Math.random().toString(16).slice(2, 8),
        descricao: String(gasto.descricao || '').trim(),
        valor: parseFloat(gasto.valor) || 0,
        tipo: gasto.tipo === 'fixo' ? 'fixo' : 'variavel',
        competencia: gasto.competencia || String(gasto.dataCompra || '').slice(0, 7) || obterCompetenciaAtual(),
        competenciaPagamento: gasto.competenciaPagamento || '',
        categoriaSugerida: gasto.categoriaSugerida || '',
        dataCompra: gasto.dataCompra || '',
        vencimentoFatura: gasto.vencimentoFatura || '',
        origemFatura: gasto.origemFatura || '',
        cartao: gasto.cartao || '',
        parcelaAtual: gasto.parcelaAtual || null,
        parcelaTotal: gasto.parcelaTotal || null,
        principalParcela: gasto.principalParcela ?? null,
        jurosParcela: gasto.jurosParcela ?? null,
        statusParcelamento: gasto.statusParcelamento || '',
        apenasVisibilidade: Boolean(gasto.apenasVisibilidade),
        observacaoParcelamento: gasto.observacaoParcelamento || ''
    };
}

/**
 * Mescla resumos de fatura sem duplicar banco e vencimento.
 * @param {Array} resumosImportados
 * @returns {Array}
 */
function importarFaturasResumo(resumosImportados) {
    const atuais = getFaturasResumo();
    const mapa = new Map(atuais.map((item) => [`${item.banco}|${item.vencimento}`, item]));

    (resumosImportados || []).forEach((item) => {
        if (!item || !item.banco || !item.vencimento) return;
        mapa.set(`${item.banco}|${item.vencimento}`, item);
    });

    const mesclados = Array.from(mapa.values()).sort((a, b) => String(a.vencimento).localeCompare(String(b.vencimento)));
    saveFaturasResumo(mesclados);
    return mesclados;
}

/**
 * Mescla gastos importados sem duplicar os que já existem.
 * @param {Array} gastosImportados
 * @returns {{adicionados: number, ignorados: number, totalFinal: number}}
 */
function importarGastosSugeridos(gastosImportados) {
    const atuais = getGastos();
    const existentes = new Set(atuais.map(criarChaveGasto));
    const novos = [];
    let ignorados = 0;

    gastosImportados.forEach((gastoBruto) => {
        const gasto = normalizarGastoImportado(gastoBruto);
        const chave = criarChaveGasto(gasto);
        if (!gasto.descricao || existentes.has(chave)) {
            ignorados += 1;
            return;
        }
        existentes.add(chave);
        novos.push(gasto);
    });

    const mesclados = [...atuais, ...novos];
    saveGastos(mesclados);

    return {
        adicionados: novos.length,
        ignorados,
        totalFinal: mesclados.length
    };
}

/**
 * Importa dados de JSON.
 * Suporta backup completo do painel e arquivos de gastos sugeridos vindos das faturas.
 * @param {string} json
 * @returns {{ok: boolean, modo?: string, adicionados?: number, ignorados?: number, totalFinal?: number}}
 */
function importarDados(json) {
    try {
        const dados = JSON.parse(json);
        if (Array.isArray(dados.gastos) && dados.fonte === 'importador_faturas_pdf') {
            const resultado = importarGastosSugeridos(dados.gastos);
            importarFaturasResumo(dados.faturasResumo || []);
            return {
                ok: true,
                modo: 'gastos_sugeridos',
                ...resultado
            };
        }

        if (dados.gastos) saveGastos(dados.gastos);
        if (dados.cartoes) saveCartoes(dados.cartoes);
        if (dados.faturasResumo) saveFaturasResumo(dados.faturasResumo);
        if (dados.financiamento) saveFinanciamento(dados.financiamento);
        if (dados.investimentos) saveInvestimentos(dados.investimentos);
        if (dados.metas) saveMetas(dados.metas);
        if (dados.gastosMensais) saveGastosMensais(dados.gastosMensais);
        if (dados.aportesMensais) saveAportesMensais(dados.aportesMensais);
        return { ok: true, modo: 'backup_completo' };
    } catch (e) {
        return { ok: false };
    }
}
