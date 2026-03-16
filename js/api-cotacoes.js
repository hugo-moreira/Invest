/**
 * Integração com API brapi.dev para cotações de ações e FIIs
 * Painel Finanças 2026
 *
 * Requer chave API gratuita em https://brapi.dev
 */

/**
 * Busca cotação de um ticker na B3
 * @param {string} ticker - Ticker do ativo (ex: PETR4, HGLG11, BOVA11)
 * @returns {Promise<number|null>} - Valor atual ou null em caso de erro
 */
async function buscarCotacao(ticker) {
    const key = getApiKey();
    if (!key) {
        console.warn('Chave API brapi.dev não configurada. Configure em Configurações.');
        return null;
    }

    const url = `https://brapi.dev/api/quote/${encodeURIComponent(ticker)}?token=${key}`;

    try {
        const res = await fetch(url);
        const data = await res.json();

        if (data.results && data.results[0]) {
            const result = data.results[0];
            return result.regularMarketPrice || result.price || null;
        }
        return null;
    } catch (e) {
        console.error('Erro ao buscar cotação:', e);
        return null;
    }
}

/**
 * Busca os 12 ultimos valores mensais do IPCA na API SGS do Banco Central.
 * @returns {Promise<Array<{data: string, valor: number}>>}
 */
async function buscarSerieIpca() {
    const url = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados/ultimos/12?formato=json';

    try {
        const res = await fetch(url);
        const data = await res.json();
        if (!Array.isArray(data)) return [];

        return data.map((item) => ({
            data: item.data,
            valor: parseFloat(item.valor) || 0
        }));
    } catch (e) {
        console.error('Erro ao buscar IPCA:', e);
        return [];
    }
}

/**
 * Calcula o IPCA acumulado em 12 meses a partir da serie mensal.
 * @param {Array<{data: string, valor: number}>} serie
 * @returns {number}
 */
function calcularIpcaAcumulado12(serie) {
    if (!serie.length) return 0;
    return serie.reduce((acumulado, item) => acumulado * (1 + item.valor / 100), 1) - 1;
}

/**
 * Retorna um resumo do IPCA atual com ultimo mes e acumulado em 12 meses.
 * @returns {Promise<{ultimoMes: string, ultimaVariacao: number, acumulado12: number} | null>}
 */
async function buscarResumoIpca() {
    const serie = await buscarSerieIpca();
    if (!serie.length) return null;

    const ultimo = serie[serie.length - 1];
    return {
        ultimoMes: ultimo.data,
        ultimaVariacao: ultimo.valor,
        acumulado12: calcularIpcaAcumulado12(serie) * 100
    };
}
