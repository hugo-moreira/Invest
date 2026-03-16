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
        const fgtsUltimo = normalizarMesAno(document.getElementById('fin-fgts-ultimo').value.trim());

        saveFinanciamento({
            parcela, saldo, prazo, juros, fgts, fgtsUltimo
        });
        atualizarFormFinanciamento();
        renderizarResumoFinanciamento();
        mostrarStatusFinanciamento('Dados do financiamento salvos com sucesso.');
        if (typeof atualizarPainelConsultoria === 'function') atualizarPainelConsultoria();
    });

    document.getElementById('btn-simular').addEventListener('click', simularQuitacao);

    atualizarFormFinanciamento();
    renderizarResumoFinanciamento();
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
 * Normaliza um texto de mês/ano para o formato MM/AAAA.
 *
 * Argumentos:
 * - `valor`: texto informado no campo de último uso do FGTS.
 *
 * Retorno:
 * - `string` no formato `MM/AAAA` quando possível; caso contrário retorna o texto original.
 */
function normalizarMesAno(valor) {
    const somenteDigitos = String(valor || '').replace(/\D/g, '');
    if (somenteDigitos.length === 6) {
        return `${somenteDigitos.slice(0, 2)}/${somenteDigitos.slice(2)}`;
    }
    return valor;
}

/**
 * Exibe uma mensagem curta de status no módulo de financiamento.
 *
 * Argumentos:
 * - `mensagem`: texto a ser mostrado ao usuário.
 *
 * Retorno:
 * - `void`.
 */
function mostrarStatusFinanciamento(mensagem) {
    const el = document.getElementById('fin-status');
    if (!el) return;
    el.textContent = mensagem;
}

/**
 * Renderiza um resumo persistido do financiamento salvo.
 * Isso serve como confirmação visual de que os dados atuais
 * foram mantidos no navegador e serão usados nas simulações.
 *
 * Argumentos:
 * - Nenhum.
 *
 * Retorno:
 * - `void`.
 */
function renderizarResumoFinanciamento() {
    const fin = getFinanciamento();
    const el = document.getElementById('fin-resumo');
    if (!el) return;

    if (!fin) {
        el.innerHTML = '<p>Nenhum financiamento salvo ainda.</p>';
        return;
    }

    el.innerHTML = `
        <h3>Resumo salvo</h3>
        <p><strong>Parcela:</strong> R$ ${fin.parcela.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        <p><strong>Saldo devedor:</strong> R$ ${fin.saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        <p><strong>Prazo restante informado:</strong> ${fin.prazo} meses</p>
        <p><strong>Juros efetivos:</strong> ${fin.juros.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}% a.a.</p>
        <p><strong>FGTS disponível:</strong> R$ ${(fin.fgts || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        <p><strong>Último uso do FGTS:</strong> ${fin.fgtsUltimo || 'não informado'}</p>
    `;
}

/**
 * Calcula o prazo estimado para quitar um saldo com parcela fixa.
 * A função é usada tanto para o cenário base quanto para os cenários
 * com FGTS, amortização extra e reforço anual.
 *
 * Argumentos:
 * - `saldoInicial`: saldo devedor de partida.
 * - `parcela`: pagamento mensal base.
 * - `jurosMensal`: taxa efetiva mensal em decimal.
 * - `amortExtra`: amortização extra mensal.
 * - `decimoTerceiro`: reforço anual aplicado no 12º mês.
 *
 * Retorno:
 * - `Object` com `meses`, `historico` e `quitavel`.
 */
function calcularPrazoQuitacao(saldoInicial, parcela, jurosMensal, amortExtra, decimoTerceiro) {
    let saldo = saldoInicial;
    let meses = 0;
    let mesAtual = 0;
    const historico = [{ mes: 0, saldo }];

    while (saldo > 0.01 && meses < 600) {
        const jurosDoMes = saldo * jurosMensal;
        let pagamento = parcela + amortExtra;
        if (mesAtual === 11 && decimoTerceiro > 0) pagamento += decimoTerceiro;

        if (pagamento <= jurosDoMes) {
            return { meses, historico, quitavel: false };
        }

        saldo = saldo + jurosDoMes - pagamento;
        if (saldo < 0) saldo = 0;

        meses++;
        mesAtual = (mesAtual + 1) % 12;
        historico.push({ mes: meses, saldo });
    }

    return { meses, historico, quitavel: saldo <= 0.01 };
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
    const saldoOriginal = saldo;
    const simulacaoBase = calcularPrazoQuitacao(saldoOriginal, parcela, jurosMensal, 0, 0);
    const fgtsAplicado = usarFgts ? Math.min(fin.fgts || 0, saldo) : 0;

    saldo = Math.max(0, saldo - fgtsAplicado);

    const simulacao = calcularPrazoQuitacao(saldo, parcela, jurosMensal, amortExtra, decimoTerceiro);
    if (!simulacao.quitavel) {
        document.getElementById('resultado-simulador').innerHTML = `
            <h4>Resultado da Simulação</h4>
            <p>A parcela informada não é suficiente para reduzir o saldo nesse cenário.</p>
            <p>Revise os dados do financiamento ou aumente a amortização extra.</p>
        `;
        return;
    }

    const meses = simulacao.meses;
    const historico = simulacao.historico;
    const anos = Math.floor(meses / 12);
    const mesesRestantes = meses % 12;
    const prazoOriginal = simulacaoBase.quitavel ? simulacaoBase.meses : fin.prazo;
    const economiaMeses = prazoOriginal - meses;
    const anosBase = Math.floor(prazoOriginal / 12);
    const mesesBaseRestantes = prazoOriginal % 12;

    let html = `
        <h4>Resultado da Simulação</h4>
        <p><strong>Saldo original:</strong> R$ ${saldoOriginal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        <p><strong>FGTS usado agora:</strong> R$ ${fgtsAplicado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        <p><strong>Saldo após FGTS:</strong> R$ ${saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        <p><strong>Prazo estimado sem extras:</strong> ${anosBase} anos e ${mesesBaseRestantes} meses (${prazoOriginal} parcelas)</p>
        <p><strong>Prazo neste cenário:</strong> ${anos} anos e ${mesesRestantes} meses (${meses} parcelas)</p>
        <p><strong>Economia estimada:</strong> ${economiaMeses} meses a menos que o cenário base</p>
    `;

    if (usarFgts && fgtsAplicado > 0 && amortExtra === 0 && decimoTerceiro === 0) {
        html += `<p>Somente usar o FGTS não quita o financiamento inteiro. O simulador mostra o novo prazo total depois de abater o saldo e continuar pagando a parcela normal.</p>`;
    }

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
