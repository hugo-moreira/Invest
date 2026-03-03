/**
 * Módulo Metas e Projeções - Simulador de rentabilidade
 * Painel Finanças 2026
 */

const CLASSES_ALOCACAO = [
    'reserva_emergencia', 'renda_fixa', 'previdencia', 'fiis', 'acoes_etfs', 'cofrinhos'
];

let chartProjecao = null;

function initProjecoes() {
    const btnProjetar = document.getElementById('btn-projetar');
    const metaAporte = document.getElementById('meta-aporte');
    const metaTaxa = document.getElementById('meta-taxa');

    if (metaAporte) metaAporte.value = getMetas().aporte || '';
    if (metaTaxa) metaTaxa.value = getMetas().taxa || 10;

    criarInputsAlocacao();

    if (btnProjetar) {
        btnProjetar.addEventListener('click', () => {
            const aporte = parseFloat(metaAporte?.value) || 0;
            const taxa = parseFloat(metaTaxa?.value) || 10;
            saveMetas({ ...getMetas(), aporte, taxa });
            projetarRentabilidade();
            if (typeof atualizarResumo === 'function') atualizarResumo();
        });
    }

    [metaAporte, metaTaxa].forEach(el => {
        if (el) el.addEventListener('change', () => {
            const aporte = parseFloat(metaAporte?.value) || 0;
            const taxa = parseFloat(metaTaxa?.value) || 10;
            saveMetas({ ...getMetas(), aporte, taxa });
            if (typeof atualizarResumo === 'function') atualizarResumo();
        });
    });
}

function criarInputsAlocacao() {
    const container = document.getElementById('alocacao-inputs');
    if (!container) return;

    const metas = getMetas();
    const alocacao = metas.alocacao || {};

    const labels = {
        reserva_emergencia: 'Reserva emergência',
        renda_fixa: 'Renda fixa',
        previdencia: 'Previdência',
        fiis: 'FIIs',
        acoes_etfs: 'Ações/ETFs',
        cofrinhos: 'Cofrinhos'
    };

    container.innerHTML = CLASSES_ALOCACAO.map(classe => `
        <div class="form-group">
            <label>${labels[classe]} (%)</label>
            <input type="number" id="aloc-${classe}" min="0" max="100" step="1" value="${alocacao[classe] || 0}">
        </div>
    `).join('');

    container.querySelectorAll('input').forEach(input => {
        input.addEventListener('change', () => {
            const aloc = {};
            CLASSES_ALOCACAO.forEach(c => {
                const el = document.getElementById(`aloc-${c}`);
                if (el) aloc[c] = parseFloat(el.value) || 0;
            });
            saveMetas({ ...getMetas(), alocacao: aloc });
        });
    });
}

/**
 * Projeta o patrimônio futuro com juros compostos
 * VF = VP * (1+i)^n + PMT * [((1+i)^n - 1) / i]
 */
function projetarRentabilidade() {
    const metas = getMetas();
    const aporte = metas.aporte || 0;
    const taxaAnual = metas.taxa || 10;
    const taxaMensal = Math.pow(1 + taxaAnual / 100, 1/12) - 1;

    const investimentos = getInvestimentos();
    const patrimonioInicial = investimentos.reduce((s, i) => s + i.valorAtual, 0);

    const anos = [1, 3, 5, 10];
    const resultados = [];
    const historico = [{ ano: 0, valor: patrimonioInicial }];

    let vp = patrimonioInicial;
    for (let ano = 1; ano <= 10; ano++) {
        const meses = 12;
        const fvPrincipal = vp * Math.pow(1 + taxaMensal, meses);
        const fvAportes = aporte > 0 && taxaMensal > 0
            ? aporte * (Math.pow(1 + taxaMensal, meses) - 1) / taxaMensal
            : aporte * meses;
        vp = fvPrincipal + fvAportes;
        historico.push({ ano, valor: vp });
    }

    anos.forEach(a => {
        const idx = historico.findIndex(h => h.ano === a);
        if (idx >= 0) {
            resultados.push({ anos: a, valor: historico[idx].valor });
        }
    });

    let html = '<h4>Projeção de Patrimônio</h4>';
    html += `<p>Patrimônio inicial: R$ ${patrimonioInicial.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>`;
    html += `<p>Aporte mensal: R$ ${aporte.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} | Taxa: ${taxaAnual}% a.a.</p>`;
    html += '<ul>';
    resultados.forEach(r => {
        html += `<li>Em ${r.anos} ano(s): R$ ${r.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</li>`;
    });
    html += '</ul>';

    const div = document.getElementById('resultado-projecao');
    if (div) div.innerHTML = html;

    renderizarGraficoProjecao(historico);
}

function renderizarGraficoProjecao(historico) {
    const ctx = document.getElementById('chart-projecao');
    if (!ctx) return;

    if (chartProjecao) chartProjecao.destroy();

    chartProjecao = new Chart(ctx, {
        type: 'line',
        data: {
            labels: historico.map(h => h.ano + ' ano(s)'),
            datasets: [{
                label: 'Patrimônio projetado (R$)',
                data: historico.map(h => h.valor),
                borderColor: '#3fb950',
                backgroundColor: 'rgba(63, 185, 80, 0.1)',
                fill: true,
                tension: 0.3
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
