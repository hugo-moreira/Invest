/**
 * Configuração dos gráficos Chart.js
 * Painel Finanças 2026
 */

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const CORES = ['#58a6ff', '#3fb950', '#d29922', '#f85149', '#a371f7', '#79c0ff', '#7ee787', '#ffa657'];

let chartGastosPizza = null;
let chartGastosBarras = null;
let chartInvestimentosPizza = null;
let chartInvestimentosBarras = null;
let chartGastosMensalDetalhe = null;
let chartGastosMensalEvolucao = null;

function atualizarGraficos() {
    atualizarGraficoGastosPizza();
    atualizarGraficoGastosBarras();
    atualizarGraficoInvestimentosPizza();
    atualizarGraficoInvestimentosBarras();
}

function atualizarGraficoGastosPizza() {
    const ctx = document.getElementById('chart-gastos-pizza');
    if (!ctx) return;

    const gastos = getGastos().filter((g) => !g.apenasVisibilidade);
    const fin = getFinanciamento();
    const cartoes = getCartoes();

    const dados = [];
    gastos.forEach(g => {
        const v = g.valorMax ? (g.valor + g.valorMax) / 2 : g.valor;
        dados.push({ label: g.descricao, value: v });
    });

    if (fin && fin.parcela) {
        dados.push({ label: 'Financiamento', value: fin.parcela });
    }

    const totalCartao = cartoes.reduce((s, c) => s + (c.saldo / (c.parcelas || 12)), 0);
    if (totalCartao > 0) {
        dados.push({ label: 'Cartão (mensal)', value: totalCartao });
    }

    if (dados.length === 0) {
        dados.push({ label: 'Sem dados', value: 1 });
    }

    if (chartGastosPizza) chartGastosPizza.destroy();

    chartGastosPizza = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: dados.map(d => d.label),
            datasets: [{
                data: dados.map(d => d.value),
                backgroundColor: CORES.slice(0, dados.length),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'right' }
            }
        }
    });
}

function atualizarGraficoGastosBarras() {
    const ctx = document.getElementById('chart-gastos-barras');
    if (!ctx) return;

    const gastosMensais = getGastosMensais();
    const gastos = getGastos().filter((g) => !g.apenasVisibilidade);
    const fin = getFinanciamento();
    const cartoes = getCartoes();

    const baseMensal = gastos.reduce((s, g) => {
        const v = g.valorMax ? (g.valor + g.valorMax) / 2 : g.valor;
        return s + v;
    }, 0) + (fin ? fin.parcela : 0) + cartoes.reduce((s, c) => s + (c.saldo / (c.parcelas || 12)), 0);

    const labels = MESES;
    const valores = labels.map((_, i) => {
        const key = `2026-${String(i + 1).padStart(2, '0')}`;
        return gastosMensais[key] !== undefined ? gastosMensais[key] : baseMensal;
    });

    if (chartGastosBarras) chartGastosBarras.destroy();

    chartGastosBarras = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Gastos (R$)',
                data: valores,
                backgroundColor: 'rgba(88, 166, 255, 0.6)',
                borderColor: '#58a6ff',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: v => 'R$ ' + (v/1000).toFixed(0) + 'k'
                    }
                }
            }
        }
    });
}

function atualizarGraficoInvestimentosPizza() {
    const ctx = document.getElementById('chart-investimentos-pizza');
    if (!ctx) return;

    const investimentos = getInvestimentos();
    const porTipo = {};

    investimentos.forEach(i => {
        const tipo = i.tipo.replace('_', ' ');
        porTipo[tipo] = (porTipo[tipo] || 0) + i.valorAtual;
    });

    const labels = Object.keys(porTipo);
    const valores = Object.values(porTipo);

    if (labels.length === 0) {
        labels.push('Sem dados');
        valores.push(1);
    }

    if (chartInvestimentosPizza) chartInvestimentosPizza.destroy();

    chartInvestimentosPizza = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: valores,
                backgroundColor: CORES,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'right' }
            }
        }
    });
}

function atualizarGraficoInvestimentosBarras() {
    const ctx = document.getElementById('chart-investimentos-barras');
    if (!ctx) return;

    const aportesMensais = getAportesMensais();
    const investimentos = getInvestimentos();
    const baseAporte = investimentos.reduce((s, i) => s + (i.aporteMensal || 0), 0);

    const labels = MESES;
    const valores = labels.map((_, i) => {
        const key = `2026-${String(i + 1).padStart(2, '0')}`;
        return aportesMensais[key] !== undefined ? aportesMensais[key] : baseAporte;
    });

    if (chartInvestimentosBarras) chartInvestimentosBarras.destroy();

    chartInvestimentosBarras = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Aportes (R$)',
                data: valores,
                backgroundColor: 'rgba(63, 185, 80, 0.6)',
                borderColor: '#3fb950',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: v => 'R$ ' + (v/1000).toFixed(0) + 'k'
                    }
                }
            }
        }
    });
}

function formatarMoedaCompacta(valor) {
    return 'R$ ' + (parseFloat(valor) || 0).toLocaleString('pt-BR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
}

function atualizarGraficoCarrosselGastos(meses, indiceSelecionado) {
    atualizarGraficoDetalheMesGastos(meses, indiceSelecionado);
    atualizarGraficoLinhaEvolucaoGastos(meses, indiceSelecionado);
}

function atualizarGraficoDetalheMesGastos(meses, indiceSelecionado) {
    const ctx = document.getElementById('chart-gastos-mensal-detalhe');
    if (!ctx || !meses || !meses.length) return;

    const mes = meses[indiceSelecionado];
    const categorias = Object.entries(mes.categorias || {}).filter(([, valor]) => valor > 0);
    const labels = categorias.length ? categorias.map(([label]) => label) : ['Sem dados'];
    const valores = categorias.length ? categorias.map(([, valor]) => valor) : [1];

    if (chartGastosMensalDetalhe) chartGastosMensalDetalhe.destroy();

    chartGastosMensalDetalhe = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data: valores,
                backgroundColor: CORES.concat(CORES).slice(0, labels.length),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom' },
                tooltip: {
                    callbacks: {
                        label: (context) => `${context.label}: ${formatarMoedaCompacta(context.raw)}`
                    }
                }
            }
        }
    });
}

function atualizarGraficoLinhaEvolucaoGastos(meses, indiceSelecionado) {
    const ctx = document.getElementById('chart-gastos-mensal-evolucao');
    if (!ctx || !meses || !meses.length) return;

    const labels = meses.map((mes) => mes.label);
    const valores = meses.map((mes) => mes.total);
    const coresPontos = meses.map((_, indice) => indice === indiceSelecionado ? '#f85149' : '#58a6ff');
    const tamanhosPontos = meses.map((_, indice) => indice === indiceSelecionado ? 6 : 4);

    if (chartGastosMensalEvolucao) chartGastosMensalEvolucao.destroy();

    chartGastosMensalEvolucao = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Total por mês',
                data: valores,
                borderColor: '#58a6ff',
                backgroundColor: 'rgba(88, 166, 255, 0.18)',
                tension: 0.25,
                fill: true,
                pointBackgroundColor: coresPontos,
                pointBorderColor: coresPontos,
                pointRadius: tamanhosPontos,
                pointHoverRadius: 7
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context) => formatarMoedaCompacta(context.raw)
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: (valor) => formatarMoedaCompacta(valor)
                    }
                }
            }
        }
    });
}
