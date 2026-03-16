/**
 * Lógica principal do Painel Finanças 2026
 */

const estadoCarrosselGastos = {
    meses: [],
    indiceAtual: 0,
    contextoResumo: null
};
const estadoEdicaoInvestimento = {
    id: null
};

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initGastos();
    initCartao();
    initInvestimentos();
    initConfig();
    initFinanciamento();
    initProjecoes();
    initConsultoria();
    atualizarResumo();
    renderizarGastos();
    renderizarCartoes();
    renderizarInvestimentos();
});

function initNavigation() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const section = btn.dataset.section;
            document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            document.getElementById(section).classList.add('active');
            btn.classList.add('active');
            if (section === 'graficos') atualizarGraficos();
        });
    });
}

function initGastos() {
    const form = document.getElementById('form-gasto');
    const tipoSelect = document.getElementById('gasto-tipo');
    const valorMaxInput = document.getElementById('gasto-valor-max');
    const competenciaInput = document.getElementById('gasto-competencia');

    if (competenciaInput && typeof obterCompetenciaAtual === 'function') {
        competenciaInput.value = obterCompetenciaAtual();
    }

    tipoSelect.addEventListener('change', () => {
        valorMaxInput.style.display = tipoSelect.value === 'variavel' ? 'block' : 'none';
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const descricao = document.getElementById('gasto-descricao').value.trim();
        const valor = parseFloat(document.getElementById('gasto-valor').value) || 0;
        const tipo = document.getElementById('gasto-tipo').value;
        const competencia = competenciaInput?.value || (typeof obterCompetenciaAtual === 'function' ? obterCompetenciaAtual() : '');
        const valorMax = valorMaxInput.value ? parseFloat(valorMaxInput.value) : null;

        addGasto({ descricao, valor, valorMax, tipo, competencia });
        form.reset();
        valorMaxInput.style.display = 'none';
        if (competenciaInput && typeof obterCompetenciaAtual === 'function') {
            competenciaInput.value = obterCompetenciaAtual();
        }
        renderizarGastos();
        atualizarResumo();
        if (typeof atualizarPainelConsultoria === 'function') atualizarPainelConsultoria();
    });

    const btnAnterior = document.getElementById('gastos-prev-mes');
    const btnProximo = document.getElementById('gastos-prox-mes');

    if (btnAnterior) {
        btnAnterior.addEventListener('click', () => navegarCarrosselGastos(-1));
    }
    if (btnProximo) {
        btnProximo.addEventListener('click', () => navegarCarrosselGastos(1));
    }
}

function renderizarGastos() {
    const lista = document.getElementById('lista-gastos');
    const gastos = getGastos();
    const gastosOrdenados = [...gastos].sort((a, b) => {
        const dataA = a.dataCompra || '';
        const dataB = b.dataCompra || '';
        return dataB.localeCompare(dataA) || a.descricao.localeCompare(b.descricao);
    });
    const faturasResumo = getFaturasResumo();
    const financiamento = getFinanciamento();
    const parcelamentosFuturos = gastosOrdenados.filter(g => g.statusParcelamento === 'proxima_fatura' || g.statusParcelamento === 'saldo_futuro');
    const contasCasa = gastosOrdenados.filter(g => classificarGrupoGasto(g) === 'contas_casa');
    const impostos = gastosOrdenados.filter(g => classificarGrupoGasto(g) === 'impostos');
    const assinaturas = gastosOrdenados.filter(g => classificarGrupoGasto(g) === 'assinaturas');
    const parcelados = gastosOrdenados.filter(g => classificarGrupoGasto(g) === 'parcelamentos' && !g.apenasVisibilidade);
    const variaveis = gastosOrdenados.filter(g => classificarGrupoGasto(g) === 'variaveis');
    const fixos = gastosOrdenados.filter(g => classificarGrupoGasto(g) === 'fixos');
    const financiamentoResumo = construirItemFinanciamentoParaGastos(financiamento);

    lista.innerHTML = [
        renderizarGrupoGastos('Financiamento', financiamentoResumo),
        renderizarGrupoGastos('Contas da casa', contasCasa),
        renderizarGrupoGastos('Impostos e taxas', impostos),
        renderizarGrupoGastos('Assinaturas', assinaturas),
        renderizarGrupoGastos('Parcelamentos', parcelados),
        renderizarGrupoGastos('Parcelamentos futuros', parcelamentosFuturos),
        renderizarGrupoGastos('Pontuais e variáveis', variaveis),
        renderizarGrupoGastos('Fixos recorrentes', fixos),
    ].join('');

    estadoCarrosselGastos.contextoResumo = {
        faturasResumo,
        financiamentoResumo,
        contasCasa,
        impostos,
        assinaturas,
        parcelados,
        parcelamentosFuturos,
        variaveis,
        fixos
    };

    renderizarCarrosselGastosMensais(gastosOrdenados, faturasResumo, financiamentoResumo);

    lista.querySelectorAll('.excluir').forEach(btn => {
        btn.addEventListener('click', () => {
            removeGasto(btn.dataset.id);
            renderizarGastos();
            atualizarResumo();
            if (typeof atualizarPainelConsultoria === 'function') atualizarPainelConsultoria();
        });
    });
}

function classificarGrupoGasto(gasto) {
    const descricao = String(gasto.descricao || '').toLowerCase();
    const categoria = String(gasto.categoriaSugerida || '').toLowerCase();

    if (gasto.statusParcelamento === 'proxima_fatura' || gasto.statusParcelamento === 'saldo_futuro') {
        return 'parcelamentos_futuros';
    }
    if ((gasto.parcelaAtual && gasto.parcelaTotal) || categoria === 'parcelamento_credito') {
        return 'parcelamentos';
    }
    if (descricao.includes('luz') || descricao.includes('água') || descricao.includes('agua') || descricao.includes('internet') || descricao.includes('telefone')) {
        return 'contas_casa';
    }
    if (categoria === 'recarga_celular' || descricao.includes('intercel')) {
        return 'fixos';
    }
    if (descricao.includes('ipva') || descricao.includes('iptu') || descricao.includes('taxa') || categoria === 'impostos') {
        return 'impostos';
    }
    if (categoria === 'assinaturas' || descricao.includes('spotify') || descricao.includes('google') || descricao.includes('cursor') || descricao.includes('academia')) {
        return 'assinaturas';
    }
    if (gasto.tipo === 'variavel') {
        return 'variaveis';
    }
    return 'fixos';
}

function construirItensCartaoParaGastos(cartoes) {
    return cartoes
        .filter((cartao) => (cartao.saldo || 0) > 0)
        .map((cartao) => ({
            id: `resumo_cartao_${cartao.id}`,
            descricao: cartao.nome,
            valor: parseFloat(cartao.parcelaPlanejada) || ((parseFloat(cartao.saldo) || 0) / (parseInt(cartao.parcelas, 10) || 12)),
            tipo: 'fixo',
            origemResumo: true,
            detalhesResumo: [
                `Saldo devedor: ${formatarMoeda(cartao.saldo || 0)}`,
                `Parcelas planejadas: ${cartao.parcelas || 12}`,
                cartao.jurosMensal ? `Juros: ${parseFloat(cartao.jurosMensal).toFixed(2)}% a.m.` : 'Juros: não informado'
            ]
        }));
}

function construirItemFinanciamentoParaGastos(financiamento) {
    if (!financiamento || !financiamento.parcela) return [];
    return [{
        id: 'resumo_financiamento',
        descricao: 'Financiamento imobiliário',
        valor: parseFloat(financiamento.parcela) || 0,
        tipo: 'fixo',
        origemResumo: true,
        detalhesResumo: [
            `Saldo devedor: ${formatarMoeda(financiamento.saldo || 0)}`,
            `Prazo restante: ${financiamento.prazo || 0} meses`,
            `Juros: ${(parseFloat(financiamento.juros) || 0).toFixed(2)}% a.a.`
        ]
    }];
}

function calcularTotalFaturasPorCompetencia(competencia, faturasResumo = getFaturasResumo()) {
    return (faturasResumo || [])
        .filter((item) => item.competenciaPagamento === competencia)
        .reduce((soma, item) => soma + (parseFloat(item.totalFatura) || 0), 0);
}

function obterFaturasPorCompetencia(competencia, faturasResumo = getFaturasResumo()) {
    return (faturasResumo || []).filter((item) => item.competenciaPagamento === competencia);
}

function renderizarResumoFaturasDoMes(competencia) {
    const lista = document.getElementById('lista-cartoes');
    if (!lista) return;

    const faturasResumo = obterFaturasPorCompetencia(competencia);
    if (!faturasResumo.length) {
        lista.innerHTML = '<div class="grupo-gastos-vazio">Nenhuma fatura importada para este mês. Reimporte o JSON das faturas para ver o total do cartão por vencimento.</div>';
        return;
    }

    const totalMes = faturasResumo.reduce((soma, item) => soma + (parseFloat(item.totalFatura) || 0), 0);
    lista.innerHTML = `
        <div class="lista-item">
            <span><strong>Total do cartão no mês</strong> - ${formatarMoeda(totalMes)}</span>
        </div>
        ${faturasResumo.map((item) => `
            <div class="lista-item">
                <span>
                    <strong>${item.banco === 'mercado_pago' ? 'Mercado Pago' : 'Inter'}</strong>
                    - Total: ${formatarMoeda(item.totalFatura)}
                    | Vencimento: ${item.vencimento}
                    | Mínimo: ${formatarMoeda(item.pagamentoMinimo)}
                </span>
            </div>
        `).join('')}
    `;
}

function renderizarResumoSuperiorGastos(competencia) {
    const resumo = document.getElementById('gastos-resumo');
    if (!resumo || !estadoCarrosselGastos.contextoResumo) return;

    const {
        faturasResumo,
        parcelamentosFuturos,
    } = estadoCarrosselGastos.contextoResumo;
    const resumoMensal = estadoCarrosselGastos.meses.find((item) => item.competencia === competencia);
    if (!resumoMensal) return;

    const faturasMes = obterFaturasPorCompetencia(competencia, faturasResumo);
    const totalCartao = faturasMes.reduce((soma, item) => soma + (parseFloat(item.totalFatura) || 0), 0);
    const totalParcelamentosFuturos = parcelamentosFuturos.reduce((s, g) => s + (g.valor || 0), 0);

    resumo.innerHTML = `
        <h3>Painel consolidado de gastos</h3>
        <p><strong>Total do cartão no mês:</strong> ${formatarMoeda(totalCartao)}</p>
        ${faturasMes.map((item) => `<p><strong>${item.banco === 'mercado_pago' ? 'Mercado Pago' : 'Inter'}:</strong> ${formatarMoeda(item.totalFatura)} | vence em ${item.vencimento}</p>`).join('')}
        <p><strong>Total geral mensal:</strong> ${formatarMoeda(resumoMensal.total)}</p>
        <p><strong>Financiamento:</strong> ${formatarMoeda(resumoMensal.financiamento)}</p>
        <p><strong>Parcelamentos:</strong> ${formatarMoeda(resumoMensal.parcelamentos)}</p>
        <p><strong>Fixos recorrentes fora do cartão:</strong> ${formatarMoeda(resumoMensal.recorrentes)}</p>
        <p><strong>Parcelamentos futuros:</strong> ${parcelamentosFuturos.length} item(ns) | ${formatarMoeda(totalParcelamentosFuturos)}</p>
        <p><strong>Pontuais e variáveis fora do cartão:</strong> ${formatarMoeda(resumoMensal.variaveis)}</p>
    `;
}

function renderizarGrupoGastos(titulo, gastos) {
    if (!gastos.length) {
        return `
            <div class="grupo-gastos">
                <h3>${titulo}</h3>
                <p class="grupo-gastos-vazio">Nenhum item nesta seção.</p>
            </div>
        `;
    }

    return `
        <div class="grupo-gastos">
            <h3>${titulo}</h3>
            ${gastos.map(renderizarItemGasto).join('')}
        </div>
    `;
}

function renderizarItemGasto(gasto) {
    const valor = gasto.valorMax ? `${gasto.valor.toFixed(2)} - ${gasto.valorMax.toFixed(2)}` : gasto.valor.toFixed(2);
    const detalhes = [];

    if ((gasto.parcelaAtual && gasto.parcelaTotal) || gasto.categoriaSugerida === 'parcelamento_credito') detalhes.push('Parcelamento');
    else detalhes.push(gasto.tipo === 'variavel' ? 'Pontual' : 'Fixo');
    if (gasto.origemResumo && Array.isArray(gasto.detalhesResumo)) {
        detalhes.push(...gasto.detalhesResumo);
    }
    if (gasto.statusParcelamento === 'proxima_fatura') detalhes.push('Projetado para próxima fatura');
    if (gasto.statusParcelamento === 'saldo_futuro') detalhes.push('Saldo agregado de parcelamentos futuros');
    if (gasto.categoriaSugerida) detalhes.push(`Categoria: ${gasto.categoriaSugerida}`);
    if (gasto.dataCompra) detalhes.push(`Data: ${gasto.dataCompra}`);
    if (gasto.origemFatura) detalhes.push(`Origem: ${gasto.origemFatura}`);
    if (gasto.cartao) detalhes.push(`Cartão: ${gasto.cartao}`);
    if (gasto.parcelaAtual && gasto.parcelaTotal) detalhes.push(`Parcela ${gasto.parcelaAtual}/${gasto.parcelaTotal}`);
    if (gasto.principalParcela != null) detalhes.push(`Principal: ${formatarMoeda(gasto.principalParcela)}`);
    if (gasto.jurosParcela != null) detalhes.push(`Juros: ${formatarMoeda(gasto.jurosParcela)}`);
    if (gasto.observacaoParcelamento) detalhes.push(gasto.observacaoParcelamento);

    return `
        <div class="lista-item gasto-item" data-id="${gasto.id}">
            <div class="gasto-conteudo">
                <span><strong>${gasto.descricao}</strong> - R$ ${valor}</span>
                <div class="gasto-detalhes">
                    ${detalhes.map((detalhe) => `<span class="gasto-tag">${detalhe}</span>`).join('')}
                </div>
            </div>
            <div class="acoes">
                ${gasto.origemResumo ? '' : `<button type="button" class="excluir" data-id="${gasto.id}">Excluir</button>`}
            </div>
        </div>
    `;
}

function obterValorConsideradoGasto(gasto) {
    if (!gasto) return 0;
    if (gasto.valorMax) {
        return ((parseFloat(gasto.valor) || 0) + (parseFloat(gasto.valorMax) || 0)) / 2;
    }
    return parseFloat(gasto.valor) || 0;
}

function obterCompetenciaGasto(gasto) {
    if (!gasto) return typeof obterCompetenciaAtual === 'function' ? obterCompetenciaAtual() : '';
    if (gasto.competenciaPagamento) return gasto.competenciaPagamento;
    if (gasto.competencia) return gasto.competencia;
    if (gasto.dataCompra) return String(gasto.dataCompra).slice(0, 7);
    return typeof obterCompetenciaAtual === 'function' ? obterCompetenciaAtual() : '';
}

function criarResumoMensalVazio(competencia) {
    return {
        competencia,
        total: 0,
        fixos: 0,
        recorrentes: 0,
        variaveis: 0,
        cartao: 0,
        financiamento: 0,
        parcelamentos: 0,
        dividas: 0,
        categorias: {}
    };
}

function adicionarValorCategoriaMensal(resumo, categoria, valor) {
    resumo.categorias[categoria] = (resumo.categorias[categoria] || 0) + valor;
    resumo.total += valor;
}

function gerarHistoricoMensalGastos(gastos, faturasResumo, financiamentoResumo) {
    const mapa = {};
    const competenciaAtual = typeof obterCompetenciaAtual === 'function' ? obterCompetenciaAtual() : '';
    const mesesManuais = getGastosMensais();

    const garantirMes = (competencia) => {
        if (!competencia) return null;
        if (!mapa[competencia]) {
            mapa[competencia] = criarResumoMensalVazio(competencia);
        }
        return mapa[competencia];
    };

    garantirMes(competenciaAtual);

    gastos
        .filter((gasto) => !gasto.apenasVisibilidade && !gasto.origemFatura && gasto.statusParcelamento !== 'proxima_fatura' && gasto.statusParcelamento !== 'saldo_futuro')
        .forEach((gasto) => {
            const competencia = obterCompetenciaGasto(gasto);
            const resumo = garantirMes(competencia);
            if (!resumo) return;

            const valor = obterValorConsideradoGasto(gasto);
            const grupo = (gasto.parcelaAtual && gasto.parcelaTotal) ? 'parcelamentos' : classificarGrupoGasto(gasto);

            if (grupo === 'variaveis' || (grupo === 'contas_casa' && gasto.tipo === 'variavel')) resumo.variaveis += valor;
            else resumo.fixos += valor;
            if (grupo === 'parcelamentos') {
                resumo.parcelamentos += valor;
                resumo.dividas += valor;
            }
            if (grupo === 'fixos' || grupo === 'assinaturas' || (grupo === 'contas_casa' && gasto.tipo !== 'variavel')) {
                resumo.recorrentes += valor;
            }

            const rotuloCategoria = {
                contas_casa: 'Contas da casa',
                impostos: 'Impostos e taxas',
                assinaturas: 'Assinaturas',
                variaveis: 'Variáveis',
                fixos: 'Fixos',
                parcelamentos: 'Parcelamentos'
            }[grupo] || 'Outros';

            adicionarValorCategoriaMensal(resumo, rotuloCategoria, valor);
        });

    (faturasResumo || []).forEach((fatura) => {
        const competencia = fatura.competenciaPagamento;
        const resumo = garantirMes(competencia);
        if (!resumo) return;
        const valor = parseFloat(fatura.totalFatura) || 0;
        resumo.cartao += valor;
        resumo.dividas += valor;
        resumo.fixos += valor;
        adicionarValorCategoriaMensal(resumo, 'Cartão de crédito', valor);
    });

    Object.entries(mesesManuais).forEach(([competencia, valor]) => {
        const resumo = garantirMes(competencia);
        if (!resumo || resumo.total > 0) return;
        adicionarValorCategoriaMensal(resumo, 'Total informado manualmente', parseFloat(valor) || 0);
    });

    const resumoAtual = garantirMes(competenciaAtual);
    financiamentoResumo.forEach((item) => {
        const valor = obterValorConsideradoGasto(item);
        resumoAtual.financiamento += valor;
        resumoAtual.fixos += valor;
        resumoAtual.dividas += valor;
        adicionarValorCategoriaMensal(resumoAtual, 'Financiamento', valor);
    });

    return Object.values(mapa)
        .sort((a, b) => a.competencia.localeCompare(b.competencia))
        .map((item) => ({
            ...item,
            label: formatarMesCompetencia(item.competencia)
        }));
}

function formatarMesCompetencia(competencia) {
    const [ano, mes] = String(competencia || '').split('-');
    if (!ano || !mes) return competencia || '-';
    const data = new Date(Number(ano), Number(mes) - 1, 1);
    return data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

function resumirVariacaoMensal(atual, anterior) {
    if (!anterior || !(anterior.total > 0)) {
        return {
            texto: 'Primeiro mês com base suficiente para comparação',
            classe: ''
        };
    }

    const delta = atual.total - anterior.total;
    const percentual = anterior.total > 0 ? (Math.abs(delta) / anterior.total) * 100 : 0;

    if (Math.abs(delta) < 0.01) {
        return {
            texto: 'Mesmo nível do mês anterior',
            classe: ''
        };
    }

    if (delta > 0) {
        return {
            texto: `${formatarMoeda(delta)} acima do mês anterior (${percentual.toFixed(1)}%)`,
            classe: 'alerta'
        };
    }

    return {
        texto: `${formatarMoeda(Math.abs(delta))} abaixo do mês anterior (${percentual.toFixed(1)}%)`,
        classe: 'sucesso'
    };
}

function renderizarCarrosselGastosMensais(gastos, faturasResumo, financiamentoResumo) {
    const meses = gerarHistoricoMensalGastos(gastos, faturasResumo, financiamentoResumo);
    estadoCarrosselGastos.meses = meses;

    if (!meses.length) return;

    const competenciaAtual = typeof obterCompetenciaAtual === 'function' ? obterCompetenciaAtual() : '';
    const indiceAtual = meses.findIndex((mes) => mes.competencia === competenciaAtual);
    if (indiceAtual >= 0 && estadoCarrosselGastos.indiceAtual >= meses.length) {
        estadoCarrosselGastos.indiceAtual = indiceAtual;
    } else if (estadoCarrosselGastos.indiceAtual >= meses.length || estadoCarrosselGastos.indiceAtual === 0) {
        estadoCarrosselGastos.indiceAtual = indiceAtual >= 0 ? indiceAtual : meses.length - 1;
    }

    atualizarSlideCarrosselGastos();
}

function navegarCarrosselGastos(direcao) {
    const maxIndice = estadoCarrosselGastos.meses.length - 1;
    if (maxIndice < 0) return;
    estadoCarrosselGastos.indiceAtual = Math.min(maxIndice, Math.max(0, estadoCarrosselGastos.indiceAtual + direcao));
    atualizarSlideCarrosselGastos();
}

function atualizarSlideCarrosselGastos() {
    const meses = estadoCarrosselGastos.meses;
    const indice = estadoCarrosselGastos.indiceAtual;
    const atual = meses[indice];
    const anterior = indice > 0 ? meses[indice - 1] : null;

    if (!atual) return;

    const tituloMes = document.getElementById('gastos-mes-atual');
    const subtitulo = document.getElementById('gastos-carousel-subtitulo');
    const kpis = document.getElementById('gastos-mensais-kpis');
    const btnAnterior = document.getElementById('gastos-prev-mes');
    const btnProximo = document.getElementById('gastos-prox-mes');

    if (tituloMes) tituloMes.textContent = atual.label;
    if (subtitulo) subtitulo.textContent = `Mês ${indice + 1} de ${meses.length} na linha do tempo cadastrada`;
    if (btnAnterior) btnAnterior.disabled = indice === 0;
    if (btnProximo) btnProximo.disabled = indice === meses.length - 1;

    const variacao = resumirVariacaoMensal(atual, anterior);
    renderizarResumoFaturasDoMes(atual.competencia);
    renderizarResumoSuperiorGastos(atual.competencia);

    if (kpis) {
        kpis.innerHTML = [
            criarCardKpiGasto('Total do mês', formatarMoeda(atual.total), variacao.texto, variacao.classe),
            criarCardKpiGasto('Dívidas e parcelas', formatarMoeda(atual.dividas), 'Cartão + financiamento + parcelamentos'),
            criarCardKpiGasto('Fixos recorrentes', formatarMoeda(atual.recorrentes), atual.recorrentes >= atual.variaveis ? 'Base recorrente fora do cartão' : 'Abaixo dos pontuais'),
            criarCardKpiGasto('Pontuais', formatarMoeda(atual.variaveis), atual.variaveis > atual.recorrentes ? 'Acima dos recorrentes' : 'Abaixo dos recorrentes')
        ].join('');
    }

    if (typeof atualizarGraficoCarrosselGastos === 'function') {
        atualizarGraficoCarrosselGastos(meses, indice);
    }
}

function criarCardKpiGasto(label, valor, variacaoTexto, classe = '') {
    return `
        <div class="gastos-kpi">
            <span class="gastos-kpi-label">${label}</span>
            <span class="gastos-kpi-valor">${valor}</span>
            <span class="gastos-kpi-variacao ${classe}">${variacaoTexto}</span>
        </div>
    `;
}

function initCartao() {
    const form = document.getElementById('form-cartao');
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const nome = document.getElementById('cartao-nome').value.trim();
        const limite = document.getElementById('cartao-limite').value;
        const saldo = document.getElementById('cartao-saldo').value;
        const parcelas = document.getElementById('cartao-parcelas').value;
        const jurosMensal = document.getElementById('cartao-juros').value;
        const parcelaPlanejada = document.getElementById('cartao-parcela-planejada').value;

        saveCartao({ nome, limite, saldo, parcelas, jurosMensal, parcelaPlanejada });
        form.reset();
        renderizarCartoes();
        atualizarResumo();
        if (typeof atualizarPainelConsultoria === 'function') atualizarPainelConsultoria();
    });
}

function renderizarCartoes() {
    renderizarResumoFaturasDoMes(obterCompetenciaAtual());
}

function initInvestimentos() {
    const form = document.getElementById('form-investimento');
    const tipoSelect = document.getElementById('inv-tipo');
    const tickerInput = document.getElementById('inv-ticker');
    const btnCotacao = document.getElementById('btn-cotacao');
    const btnSalvar = document.getElementById('btn-salvar-investimento');
    const btnCancelarEdicao = document.getElementById('btn-cancelar-edicao-investimento');

    const tiposComTicker = ['acoes', 'acoes_internacionais', 'fiis', 'etfs'];
    const atualizarVisibilidadeTicker = () => {
        const show = tiposComTicker.includes(tipoSelect.value);
        tickerInput.style.display = show ? 'block' : 'none';
        btnCotacao.style.display = show ? 'inline-block' : 'none';
    };

    tipoSelect.addEventListener('change', () => {
        atualizarVisibilidadeTicker();
        aplicarPresetInvestimento(tipoSelect.value);
    });
    atualizarVisibilidadeTicker();
    aplicarPresetInvestimento(tipoSelect.value);

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const dados = lerFormularioInvestimento();

        if (estadoEdicaoInvestimento.id) {
            updateInvestimento(estadoEdicaoInvestimento.id, dados);
        } else {
            addInvestimento(dados);
        }

        resetarFormularioInvestimento();
        renderizarInvestimentos();
        atualizarResumo();
        if (typeof atualizarPainelConsultoria === 'function') atualizarPainelConsultoria();
    });

    if (btnCancelarEdicao) {
        btnCancelarEdicao.addEventListener('click', () => {
            resetarFormularioInvestimento();
        });
    }

    btnCotacao.addEventListener('click', () => {
        const ticker = tickerInput.value.trim();
        if (!ticker) return;
        if (typeof buscarCotacao === 'function') {
            buscarCotacao(ticker).then(valor => {
                if (valor) document.getElementById('inv-valor-atual').value = valor;
            });
        }
    });

    function lerFormularioInvestimento() {
        return {
            nome: document.getElementById('inv-nome').value.trim(),
            tipo: document.getElementById('inv-tipo').value,
            objetivo: document.getElementById('inv-objetivo').value,
            liquidez: document.getElementById('inv-liquidez').value,
            risco: document.getElementById('inv-risco').value,
            quantidade: document.getElementById('inv-quantidade').value,
            precoMedio: document.getElementById('inv-preco-medio').value,
            valorAtual: document.getElementById('inv-valor-atual').value,
            ticker: document.getElementById('inv-ticker').value.trim(),
            aporteMensal: document.getElementById('inv-aporte-mensal').value,
            minimo: document.getElementById('inv-minimo').value,
            taxa: document.getElementById('inv-taxa').value,
            tributacaoRegime: document.getElementById('inv-tributacao').value,
            comeCotas: document.getElementById('inv-come-cotas').checked,
            rentabilidadeReal: document.getElementById('inv-rentabilidade-real').value,
            vencimento: document.getElementById('inv-vencimento').value,
            marcacaoMercado: document.getElementById('inv-marcacao').checked
        };
    }

    function resetarFormularioInvestimento() {
        form.reset();
        estadoEdicaoInvestimento.id = null;
        if (btnSalvar) btnSalvar.textContent = 'Adicionar';
        if (btnCancelarEdicao) btnCancelarEdicao.style.display = 'none';
        atualizarVisibilidadeTicker();
        aplicarPresetInvestimento(document.getElementById('inv-tipo').value);
    }
}

function aplicarPresetInvestimento(tipo) {
    const objetivo = document.getElementById('inv-objetivo');
    const liquidez = document.getElementById('inv-liquidez');
    const risco = document.getElementById('inv-risco');
    const taxa = document.getElementById('inv-taxa');
    const tributacao = document.getElementById('inv-tributacao');
    const rentabilidadeReal = document.getElementById('inv-rentabilidade-real');
    const comeCotas = document.getElementById('inv-come-cotas');
    const marcacao = document.getElementById('inv-marcacao');

    if (!tipo) return;

    if (tipo === 'reserva_emergencia' || tipo === 'cofrinhos') {
        if (objetivo) objetivo.value = 'reserva';
        if (liquidez) liquidez.value = 'diaria';
        if (risco) risco.value = 'baixo';
        if (taxa) taxa.value = 0;
        if (tributacao) tributacao.value = 'isento';
        if (comeCotas) comeCotas.checked = false;
        if (marcacao) marcacao.checked = false;
        return;
    }

    if (tipo === 'tesouro_selic') {
        if (objetivo) objetivo.value = 'reserva';
        if (liquidez) liquidez.value = 'd1';
        if (risco) risco.value = 'baixo';
        if (taxa) taxa.value = 0.2;
        if (tributacao) tributacao.value = 'tesouro_direto';
        if (rentabilidadeReal) rentabilidadeReal.value = 0;
        if (comeCotas) comeCotas.checked = false;
        if (marcacao) marcacao.checked = false;
        return;
    }

    if (tipo === 'tesouro_ipca') {
        if (objetivo) objetivo.value = 'medio_prazo';
        if (liquidez) liquidez.value = 'd1';
        if (risco) risco.value = 'medio';
        if (taxa) taxa.value = 0.2;
        if (tributacao) tributacao.value = 'tesouro_direto';
        if (comeCotas) comeCotas.checked = false;
        if (marcacao) marcacao.checked = true;
        return;
    }

    if (tipo === 'tesouro_renda_mais') {
        if (objetivo) objetivo.value = 'aposentadoria';
        if (liquidez) liquidez.value = 'd1';
        if (risco) risco.value = 'alto';
        if (taxa) taxa.value = 0.2;
        if (tributacao) tributacao.value = 'tesouro_direto';
        if (rentabilidadeReal) rentabilidadeReal.value = 7.44;
        if (comeCotas) comeCotas.checked = false;
        if (marcacao) marcacao.checked = true;
        return;
    }

    if (tipo === 'renda_fixa' || tipo === 'previdencia') {
        if (objetivo) objetivo.value = 'aposentadoria';
        if (liquidez) liquidez.value = 'd1';
        if (risco) risco.value = 'medio';
        if (tributacao) tributacao.value = tipo === 'previdencia' ? 'fundo_sem_come_cotas' : 'cdb_ir';
        if (comeCotas) comeCotas.checked = false;
        if (marcacao) marcacao.checked = true;
        return;
    }

    if (tipo === 'fundos') {
        if (objetivo) objetivo.value = 'medio_prazo';
        if (liquidez) liquidez.value = 'media';
        if (risco) risco.value = 'medio';
        if (taxa && !taxa.value) taxa.value = 1;
        if (tributacao) tributacao.value = 'fundo_come_cotas';
        if (comeCotas) comeCotas.checked = true;
        if (marcacao) marcacao.checked = false;
        return;
    }

    if (['acoes', 'acoes_internacionais', 'fiis', 'etfs', 'cripto', 'commodities'].includes(tipo)) {
        if (objetivo) objetivo.value = 'renda';
        if (liquidez) liquidez.value = 'd0';
        if (risco) risco.value = 'alto';
        if (tributacao) {
            tributacao.value = tipo === 'fiis' ? 'fii' : 'acoes_etfs';
        }
        if (comeCotas) comeCotas.checked = false;
        if (marcacao) marcacao.checked = true;
    }
}

function calcularResumoInvestimentos(investimentos) {
    return investimentos.reduce((acc, investimento) => {
        const valor = investimento.valorAtual || 0;
        acc.total += valor;

        if (['reserva_emergencia', 'cofrinhos', 'tesouro_selic'].includes(investimento.tipo) || investimento.objetivo === 'reserva') {
            acc.reserva += valor;
        } else if (['renda_fixa', 'previdencia', 'fundos', 'tesouro_ipca', 'tesouro_renda_mais'].includes(investimento.tipo)) {
            acc.base += valor;
        } else {
            acc.risco += valor;
        }

        acc.aporteMensal += investimento.aporteMensal || 0;
        return acc;
    }, { total: 0, reserva: 0, base: 0, risco: 0, aporteMensal: 0 });
}

function renderizarResumoInvestimentos(investimentos) {
    const el = document.getElementById('investimentos-resumo');
    if (!el) return;

    const resumo = calcularResumoInvestimentos(investimentos);
    const pct = (valor) => resumo.total > 0 ? ((valor / resumo.total) * 100).toFixed(1) : '0.0';

    el.innerHTML = `
        <h3>Leitura da carteira cadastrada</h3>
        <p><strong>Total:</strong> ${formatarMoeda(resumo.total)} | <strong>Aporte mensal cadastrado:</strong> ${formatarMoeda(resumo.aporteMensal)}</p>
        <p><strong>Reserva/caixa:</strong> ${formatarMoeda(resumo.reserva)} (${pct(resumo.reserva)}%)</p>
        <p><strong>Base de longo prazo:</strong> ${formatarMoeda(resumo.base)} (${pct(resumo.base)}%)</p>
        <p><strong>Ativos de maior risco:</strong> ${formatarMoeda(resumo.risco)} (${pct(resumo.risco)}%)</p>
    `;
}

function preencherAnaliseComInvestimento(investimento) {
    const mapaTipo = {
        reserva_emergencia: 'tesouro_selic',
        tesouro_selic: 'tesouro_selic',
        tesouro_ipca: 'ipca',
        tesouro_renda_mais: 'tesouro_renda_mais',
        renda_fixa: 'cdb',
        previdencia: 'fundo',
        fundos: 'fundo',
        fiis: 'fii',
        etfs: 'etf',
        acoes: 'acao'
    };

    const tipoAnalise = document.getElementById('analise-tipo');
    if (tipoAnalise) tipoAnalise.value = mapaTipo[investimento.tipo] || 'cdb';
    if (typeof atualizarFormularioAnalisePorTipo === 'function') atualizarFormularioAnalisePorTipo();

    const objetivo = document.getElementById('analise-objetivo');
    const liquidez = document.getElementById('analise-liquidez');
    const risco = document.getElementById('analise-risco');
    const taxa = document.getElementById('analise-taxa');
    const tributacaoRegime = document.getElementById('analise-tributacao-regime');
    const comeCotas = document.getElementById('analise-come-cotas');
    const aporte = document.getElementById('analise-aporte');
    const minimo = document.getElementById('analise-minimo');
    const precoUnitario = document.getElementById('analise-preco-unitario');
    const vencimento = document.getElementById('analise-vencimento');
    const rentabilidadeReal = document.getElementById('analise-rentabilidade-real');
    const marcacao = document.getElementById('analise-marcacao');

    if (objetivo && investimento.objetivo) objetivo.value = investimento.objetivo;
    if (liquidez && investimento.liquidez) liquidez.value = investimento.liquidez;
    if (risco && investimento.risco) risco.value = investimento.risco;
    if (taxa) taxa.value = investimento.taxa || 0;
    if (tributacaoRegime) tributacaoRegime.value = investimento.tributacaoRegime || tributacaoRegime.value;
    if (comeCotas) comeCotas.checked = Boolean(investimento.comeCotas);
    if (aporte) aporte.value = investimento.aporteMensal || investimento.valorAtual || 0;
    if (minimo) minimo.value = investimento.minimo || 0;
    if (precoUnitario) precoUnitario.value = investimento.precoMedio || 0;
    if (vencimento) vencimento.value = investimento.vencimento || '';
    if (rentabilidadeReal) rentabilidadeReal.value = investimento.rentabilidadeReal || 0;
    if (marcacao) marcacao.checked = Boolean(investimento.marcacaoMercado);

    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('consultoria').classList.add('active');
    document.querySelector('.nav-btn[data-section="consultoria"]').classList.add('active');
}

function renderizarInvestimentos() {
    const lista = document.getElementById('lista-investimentos');
    const investimentos = getInvestimentos();
    const total = investimentos.reduce((s, i) => s + i.valorAtual, 0);
    renderizarResumoInvestimentos(investimentos);

    lista.innerHTML = investimentos.map(i => {
        const pct = total > 0 ? ((i.valorAtual / total) * 100).toFixed(1) : 0;
        return `
            <div class="lista-item" data-id="${i.id}">
                <span class="investimento-conteudo">
                    <strong>${i.nome}</strong> - R$ ${i.valorAtual.toFixed(2)} (${pct}%) - ${i.tipo.replace('_', ' ')}
                    ${i.aporteMensal ? ` | Aporte: R$ ${i.aporteMensal.toFixed(2)}/mês` : ''}
                    ${i.objetivo ? ` | Objetivo: ${i.objetivo.replace('_', ' ')}` : ''}
                    ${i.liquidez ? ` | Liquidez: ${i.liquidez.toUpperCase()}` : ''}
                    ${i.risco ? ` | Risco: ${i.risco}` : ''}
                    ${i.tributacaoRegime ? ` | Tributação: ${i.tributacaoRegime.replace('_', ' ')}` : ''}
                    ${i.comeCotas ? ' | Come-cotas' : ''}
                    ${i.vencimento ? ` | Vencimento: ${i.vencimento}` : ''}
                    ${i.rentabilidadeReal ? ` | Rent. real: ${i.rentabilidadeReal.toFixed(2)}%` : ''}
                </span>
                <div class="acoes">
                    <button type="button" class="editar" data-id="${i.id}">Editar</button>
                    <button type="button" class="analisar" data-id="${i.id}">Analisar</button>
                    <button type="button" class="excluir" data-id="${i.id}">Excluir</button>
                </div>
            </div>
        `;
    }).join('');

    lista.querySelectorAll('.editar').forEach(btn => {
        btn.addEventListener('click', () => {
            const investimento = investimentos.find(item => item.id === btn.dataset.id);
            if (!investimento) return;
            preencherFormularioInvestimentoEdicao(investimento);
        });
    });

    lista.querySelectorAll('.analisar').forEach(btn => {
        btn.addEventListener('click', () => {
            const investimento = investimentos.find(item => item.id === btn.dataset.id);
            if (!investimento) return;
            preencherAnaliseComInvestimento(investimento);
        });
    });

    lista.querySelectorAll('.excluir').forEach(btn => {
        btn.addEventListener('click', () => {
            if (estadoEdicaoInvestimento.id === btn.dataset.id) {
                estadoEdicaoInvestimento.id = null;
                const form = document.getElementById('form-investimento');
                if (form) form.reset();
                const btnSalvar = document.getElementById('btn-salvar-investimento');
                const btnCancelarEdicao = document.getElementById('btn-cancelar-edicao-investimento');
                if (btnSalvar) btnSalvar.textContent = 'Adicionar';
                if (btnCancelarEdicao) btnCancelarEdicao.style.display = 'none';
                aplicarPresetInvestimento(document.getElementById('inv-tipo').value);
            }
            removeInvestimento(btn.dataset.id);
            renderizarInvestimentos();
            atualizarResumo();
            if (typeof atualizarPainelConsultoria === 'function') atualizarPainelConsultoria();
        });
    });
}

function preencherFormularioInvestimentoEdicao(investimento) {
    const tipoSelect = document.getElementById('inv-tipo');
    const btnCotacao = document.getElementById('btn-cotacao');
    const btnSalvar = document.getElementById('btn-salvar-investimento');
    const btnCancelarEdicao = document.getElementById('btn-cancelar-edicao-investimento');
    const tickerInput = document.getElementById('inv-ticker');
    const tiposComTicker = ['acoes', 'acoes_internacionais', 'fiis', 'etfs'];

    estadoEdicaoInvestimento.id = investimento.id;

    document.getElementById('inv-nome').value = investimento.nome || '';
    document.getElementById('inv-tipo').value = investimento.tipo || 'renda_fixa';
    document.getElementById('inv-objetivo').value = investimento.objetivo || 'reserva';
    document.getElementById('inv-liquidez').value = investimento.liquidez || 'diaria';
    document.getElementById('inv-risco').value = investimento.risco || 'baixo';
    document.getElementById('inv-quantidade').value = investimento.quantidade || '';
    document.getElementById('inv-preco-medio').value = investimento.precoMedio || '';
    document.getElementById('inv-valor-atual').value = investimento.valorAtual || '';
    document.getElementById('inv-ticker').value = investimento.ticker || '';
    document.getElementById('inv-aporte-mensal').value = investimento.aporteMensal || '';
    document.getElementById('inv-minimo').value = investimento.minimo || '';
    document.getElementById('inv-taxa').value = investimento.taxa || '';
    document.getElementById('inv-tributacao').value = investimento.tributacaoRegime || 'isento';
    document.getElementById('inv-come-cotas').checked = Boolean(investimento.comeCotas);
    document.getElementById('inv-rentabilidade-real').value = investimento.rentabilidadeReal || '';
    document.getElementById('inv-vencimento').value = investimento.vencimento || '';
    document.getElementById('inv-marcacao').checked = Boolean(investimento.marcacaoMercado);

    const showTicker = tiposComTicker.includes(tipoSelect.value);
    tickerInput.style.display = showTicker ? 'block' : 'none';
    btnCotacao.style.display = showTicker ? 'inline-block' : 'none';
    if (btnSalvar) btnSalvar.textContent = 'Salvar alterações';
    if (btnCancelarEdicao) btnCancelarEdicao.style.display = 'inline-block';

    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('investimentos').classList.add('active');
    document.querySelector('.nav-btn[data-section="investimentos"]').classList.add('active');
}

function initConfig() {
    document.getElementById('config-api-key').value = getApiKey();

    document.getElementById('btn-salvar-config').addEventListener('click', () => {
        const key = document.getElementById('config-api-key').value.trim();
        saveApiKey(key);
    });

    document.getElementById('btn-exportar').addEventListener('click', () => {
        const blob = new Blob([exportarDados()], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'painel-financas-2026.json';
        a.click();
        URL.revokeObjectURL(a.href);
    });

    document.getElementById('btn-importar').addEventListener('click', () => {
        document.getElementById('input-importar').click();
    });

    const tratarArquivoImportacao = (file, origem) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const resultado = importarDados(ev.target.result);
            if (resultado.ok) {
                recarregarAposImportacao();
                renderizarStatusImportacao(resultado, origem);
            } else {
                renderizarStatusImportacao({ ok: false }, origem);
                alert('Erro ao importar. Verifique o arquivo JSON.');
            }
        };
        reader.readAsText(file);
    };

    document.getElementById('input-importar').addEventListener('change', (e) => {
        const file = e.target.files[0];
        tratarArquivoImportacao(file, 'backup');
        e.target.value = '';
    });

    const btnImportarFaturas = document.getElementById('btn-importar-faturas');
    if (btnImportarFaturas) {
        btnImportarFaturas.addEventListener('click', () => {
            document.getElementById('input-importar-faturas').click();
        });
    }

    const inputImportarFaturas = document.getElementById('input-importar-faturas');
    if (inputImportarFaturas) {
        inputImportarFaturas.addEventListener('change', (e) => {
            const file = e.target.files[0];
            tratarArquivoImportacao(file, 'faturas');
            e.target.value = '';
        });
    }

    const btnCarregar = document.getElementById('btn-carregar-inicial');
    if (btnCarregar) {
        btnCarregar.addEventListener('click', () => {
            fetch('data/dados-inicial.json')
                .then(r => r.json())
                .then(dados => {
                    const json = JSON.stringify(dados);
                    const resultado = importarDados(json);
                    if (resultado.ok) {
                        recarregarAposImportacao();
                        renderizarStatusImportacao(resultado, 'backup');
                        alert('Dados iniciais carregados.');
                    }
                })
                .catch(() => alert('Erro ao carregar dados iniciais.'));
        });
    }
}

/**
 * Exibe o resultado visual da importação no painel de configurações.
 * @param {Object} resultado
 * @param {string} origem
 * @returns {void}
 */
function renderizarStatusImportacao(resultado, origem) {
    const el = document.getElementById('config-import-status');
    if (!el) return;

    if (!resultado.ok) {
        el.innerHTML = `<p>Falha ao importar o arquivo de ${origem === 'faturas' ? 'faturas/gastos' : 'backup'}.</p>`;
        return;
    }

    if (resultado.modo === 'gastos_sugeridos') {
        el.innerHTML = `
            <h3>Importação de faturas concluída</h3>
            <p><strong>Gastos adicionados:</strong> ${resultado.adicionados}</p>
            <p><strong>Itens ignorados por duplicidade ou dados incompletos:</strong> ${resultado.ignorados}</p>
            <p><strong>Total de gastos no sistema:</strong> ${resultado.totalFinal}</p>
        `;
        return;
    }

    el.innerHTML = `
        <h3>Importação de backup concluída</h3>
        <p>Os dados do painel foram carregados a partir do arquivo selecionado.</p>
    `;
}

function recarregarAposImportacao() {
    renderizarGastos();
    renderizarCartoes();
    renderizarInvestimentos();
    atualizarResumo();
    if (typeof atualizarFormFinanciamento === 'function') atualizarFormFinanciamento();
    if (typeof criarInputsAlocacao === 'function') criarInputsAlocacao();
    if (typeof initConsultoria === 'function') initConsultoria();
}

function atualizarResumo() {
    const gastos = getGastos();
    let totalGastos = gastos.reduce((s, g) => {
        if (g.apenasVisibilidade) return s;
        const v = g.valorMax ? (g.valor + g.valorMax) / 2 : g.valor;
        return s + v;
    }, 0);

    const fin = getFinanciamento();
    if (fin && fin.parcela) totalGastos += fin.parcela;

    const cartoes = getCartoes();
    const parcelaCartao = cartoes.reduce((s, c) => s + (c.saldo / (c.parcelas || 12)), 0);
    totalGastos += parcelaCartao;
    const totalCartao = cartoes.reduce((s, c) => s + (c.saldo || 0), 0);

    const investimentos = getInvestimentos();
    const patrimonio = investimentos.reduce((s, i) => s + i.valorAtual, 0);

    const metas = getMetas();
    const metaAporte = metas.aporte || 0;

    document.getElementById('resumo-gastos').textContent = formatarMoeda(totalGastos);
    document.getElementById('resumo-patrimonio').textContent = formatarMoeda(patrimonio);
    document.getElementById('resumo-meta').textContent = formatarMoeda(metaAporte);
    document.getElementById('resumo-cartao').textContent = formatarMoeda(totalCartao);
}

function formatarMoeda(valor) {
    return 'R$ ' + (parseFloat(valor) || 0).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}
