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
