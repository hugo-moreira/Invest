/**
 * Módulo Financiamento Imobiliário - Simulador de quitação
 * Painel Finanças 2026
 */

let chartFinanciamento = null;

function initFinanciamento() {
    const form = document.getElementById('form-financiamento');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const parcela = parseFloat(document.getElementById('fin-parcela').value) || 0;
        const saldo = parseFloat(document.getElementById('fin-saldo').value) || 0;
        const prazo = parseInt(document.getElementById('fin-prazo').value) || 150;
        const juros = parseFloat(document.getElementById('fin-juros').value) || 5.64;
        const fgts = parseFloat(document.getElementById('fin-fgts').value) || 0;
        const fgtsUltimo = document.getElementById('fin-fgts-ultimo').value.trim();

        saveFinanciamento({
            parcela, saldo, prazo, juros, fgts, fgtsUltimo
        });
        atualizarFormFinanciamento();
    });

    document.getElementById('btn-simular').addEventListener('click', simularQuitacao);

    atualizarFormFinanciamento();
}

function atualizarFormFinanciamento() {
    const fin = getFinanciamento();
    if (!fin) return;

    document.getElementById('fin-parcela').value = fin.parcela || '';
    document.getElementById('fin-saldo').value = fin.saldo || '';
    document.getElementById('fin-prazo').value = fin.prazo || '';
    document.getElementById('fin-juros').value = fin.juros || '';
    document.getElementById('fin-fgts').value = fin.fgts || '';
    document.getElementById('fin-fgts-ultimo').value = fin.fgtsUltimo || '';
}

/**
 * Simula a quitação do financiamento com amortização extra e FGTS
 * Fórmula: saldo mensal = saldo_anterior * (1 + juros_mensal) - parcela - amortizacao_extra
 */
function simularQuitacao() {
    const fin = getFinanciamento();
    if (!fin) {
        document.getElementById('resultado-simulador').innerHTML = '<p>Preencha os dados do financiamento primeiro.</p>';
        return;
    }

    const amortExtra = parseFloat(document.getElementById('sim-amortizacao').value) || 0;
    const decimoTerceiro = parseFloat(document.getElementById('sim-decimo-terceiro').value) || 0;
    const usarFgts = document.getElementById('sim-usar-fgts').checked;

    let saldo = fin.saldo;
    const parcela = fin.parcela;
    const jurosMensal = Math.pow(1 + (fin.juros / 100), 1/12) - 1;

    if (usarFgts && fin.fgts > 0) {
        saldo = Math.max(0, saldo - fin.fgts);
    }

    const saldoInicial = saldo;
    let meses = 0;
    const historico = [{ mes: 0, saldo: saldo }];
    let mesAtual = 0;

    while (saldo > 0.01 && meses < 600) {
        const jurosDoMes = saldo * jurosMensal;
        let pagamento = parcela + amortExtra;
        if (mesAtual === 11 && decimoTerceiro > 0) pagamento += decimoTerceiro;

        saldo = saldo + jurosDoMes - pagamento;
        if (saldo < 0) saldo = 0;

        meses++;
        mesAtual = (mesAtual + 1) % 12;
        historico.push({ mes: meses, saldo: saldo });
    }

    const anos = Math.floor(meses / 12);
    const mesesRestantes = meses % 12;
    const prazoOriginal = fin.prazo;
    const economiaMeses = prazoOriginal - meses;

    let html = `
        <h4>Resultado da Simulação</h4>
        <p><strong>Saldo inicial:</strong> R$ ${saldoInicial.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        <p><strong>Prazo para quitação:</strong> ${anos} anos e ${mesesRestantes} meses (${meses} parcelas)</p>
        <p><strong>Economia:</strong> ${economiaMeses} meses a menos que o cenário atual</p>
    `;

    document.getElementById('resultado-simulador').innerHTML = html;

    renderizarGraficoFinanciamento(historico);
}

function renderizarGraficoFinanciamento(historico) {
    const ctx = document.getElementById('chart-financiamento');
    if (!ctx) return;

    if (chartFinanciamento) chartFinanciamento.destroy();

    chartFinanciamento = new Chart(ctx, {
        type: 'line',
        data: {
            labels: historico.map(h => h.mes),
            datasets: [{
                label: 'Saldo devedor (R$)',
                data: historico.map(h => h.saldo),
                borderColor: '#58a6ff',
                backgroundColor: 'rgba(88, 166, 255, 0.1)',
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
                x: {
                    title: { display: true, text: 'Meses' }
                },
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
