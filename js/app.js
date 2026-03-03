/**
 * Lógica principal do Painel Finanças 2026
 */

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initGastos();
    initCartao();
    initInvestimentos();
    initConfig();
    initFinanciamento();
    initProjecoes();
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

    tipoSelect.addEventListener('change', () => {
        valorMaxInput.style.display = tipoSelect.value === 'variavel' ? 'block' : 'none';
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const descricao = document.getElementById('gasto-descricao').value.trim();
        const valor = parseFloat(document.getElementById('gasto-valor').value) || 0;
        const tipo = document.getElementById('gasto-tipo').value;
        const valorMax = valorMaxInput.value ? parseFloat(valorMaxInput.value) : null;

        addGasto({ descricao, valor, valorMax, tipo });
        form.reset();
        valorMaxInput.style.display = 'none';
        renderizarGastos();
        atualizarResumo();
    });
}

function renderizarGastos() {
    const lista = document.getElementById('lista-gastos');
    const gastos = getGastos();
    lista.innerHTML = gastos.map(g => {
        const valor = g.valorMax ? `${g.valor.toFixed(2)} - ${g.valorMax.toFixed(2)}` : g.valor.toFixed(2);
        return `
            <div class="lista-item" data-id="${g.id}">
                <span><strong>${g.descricao}</strong> - R$ ${valor} (${g.tipo})</span>
                <div class="acoes">
                    <button type="button" class="excluir" data-id="${g.id}">Excluir</button>
                </div>
            </div>
        `;
    }).join('');

    lista.querySelectorAll('.excluir').forEach(btn => {
        btn.addEventListener('click', () => {
            removeGasto(btn.dataset.id);
            renderizarGastos();
            atualizarResumo();
        });
    });
}

function initCartao() {
    const form = document.getElementById('form-cartao');
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const nome = document.getElementById('cartao-nome').value.trim();
        const limite = document.getElementById('cartao-limite').value;
        const saldo = document.getElementById('cartao-saldo').value;
        const parcelas = document.getElementById('cartao-parcelas').value;

        saveCartao({ nome, limite, saldo, parcelas });
        form.reset();
        renderizarCartoes();
        atualizarResumo();
    });
}

function renderizarCartoes() {
    const lista = document.getElementById('lista-cartoes');
    const cartoes = getCartoes();
    lista.innerHTML = cartoes.map(c => `
        <div class="lista-item" data-id="${c.id}">
            <span><strong>${c.nome}</strong> - Saldo: R$ ${c.saldo.toFixed(2)} | Limite: R$ ${c.limite.toFixed(2)}</span>
            <div class="acoes">
                <button type="button" class="excluir" data-id="${c.id}">Excluir</button>
            </div>
        </div>
    `).join('');

    lista.querySelectorAll('.excluir').forEach(btn => {
        btn.addEventListener('click', () => {
            removeCartao(btn.dataset.id);
            renderizarCartoes();
            atualizarResumo();
        });
    });
}

function initInvestimentos() {
    const form = document.getElementById('form-investimento');
    const tipoSelect = document.getElementById('inv-tipo');
    const tickerInput = document.getElementById('inv-ticker');
    const btnCotacao = document.getElementById('btn-cotacao');

    const tiposComTicker = ['acoes', 'acoes_internacionais', 'fiis', 'etfs'];
    tipoSelect.addEventListener('change', () => {
        const show = tiposComTicker.includes(tipoSelect.value);
        tickerInput.style.display = show ? 'block' : 'none';
        btnCotacao.style.display = show ? 'inline-block' : 'none';
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const nome = document.getElementById('inv-nome').value.trim();
        const tipo = document.getElementById('inv-tipo').value;
        const quantidade = document.getElementById('inv-quantidade').value;
        const precoMedio = document.getElementById('inv-preco-medio').value;
        const valorAtual = document.getElementById('inv-valor-atual').value;
        const ticker = document.getElementById('inv-ticker').value.trim();
        const aporteMensal = document.getElementById('inv-aporte-mensal').value;

        addInvestimento({
            nome, tipo, quantidade, precoMedio, valorAtual, ticker, aporteMensal
        });
        form.reset();
        tickerInput.style.display = 'none';
        btnCotacao.style.display = 'none';
        renderizarInvestimentos();
        atualizarResumo();
    });

    btnCotacao.addEventListener('click', () => {
        const ticker = tickerInput.value.trim();
        if (!ticker) return;
        if (typeof buscarCotacao === 'function') {
            buscarCotacao(ticker).then(valor => {
                if (valor) document.getElementById('inv-valor-atual').value = valor;
            });
        }
    });
}

function renderizarInvestimentos() {
    const lista = document.getElementById('lista-investimentos');
    const investimentos = getInvestimentos();
    const total = investimentos.reduce((s, i) => s + i.valorAtual, 0);

    lista.innerHTML = investimentos.map(i => {
        const pct = total > 0 ? ((i.valorAtual / total) * 100).toFixed(1) : 0;
        return `
            <div class="lista-item" data-id="${i.id}">
                <span>
                    <strong>${i.nome}</strong> - R$ ${i.valorAtual.toFixed(2)} (${pct}%) - ${i.tipo.replace('_', ' ')}
                    ${i.aporteMensal ? ` | Aporte: R$ ${i.aporteMensal.toFixed(2)}/mês` : ''}
                </span>
                <div class="acoes">
                    <button type="button" class="excluir" data-id="${i.id}">Excluir</button>
                </div>
            </div>
        `;
    }).join('');

    lista.querySelectorAll('.excluir').forEach(btn => {
        btn.addEventListener('click', () => {
            removeInvestimento(btn.dataset.id);
            renderizarInvestimentos();
            atualizarResumo();
        });
    });
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

    document.getElementById('input-importar').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            if (importarDados(ev.target.result)) {
                recarregarAposImportacao();
            } else {
                alert('Erro ao importar. Verifique o arquivo JSON.');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    });

    const btnCarregar = document.getElementById('btn-carregar-inicial');
    if (btnCarregar) {
        btnCarregar.addEventListener('click', () => {
            fetch('data/dados-inicial.json')
                .then(r => r.json())
                .then(dados => {
                    const json = JSON.stringify(dados);
                    if (importarDados(json)) {
                        recarregarAposImportacao();
                        alert('Dados iniciais carregados.');
                    }
                })
                .catch(() => alert('Erro ao carregar dados iniciais.'));
        });
    }
}

function recarregarAposImportacao() {
    renderizarGastos();
    renderizarCartoes();
    renderizarInvestimentos();
    atualizarResumo();
    if (typeof atualizarFormFinanciamento === 'function') atualizarFormFinanciamento();
    if (typeof criarInputsAlocacao === 'function') criarInputsAlocacao();
}

function atualizarResumo() {
    const gastos = getGastos();
    let totalGastos = gastos.reduce((s, g) => {
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
