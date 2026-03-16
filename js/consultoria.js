/**
 * Módulo de consultoria financeira.
 * Centraliza o diagnóstico da dívida, a regra de aportes,
 * a trilha de renda fixa e o checklist de análise de investimentos.
 */

const TIPOS_RESERVA_IMEDIATA = ['reserva_emergencia', 'tesouro_selic'];
const TIPOS_RESERVA_APOIO = ['cofrinhos'];
const TIPOS_ALTO_RISCO = ['fii', 'fiis', 'etf', 'etfs', 'acao', 'acoes', 'fundo_acoes'];
let consultoriaInicializada = false;

/**
 * Inicializa a área de consultoria financeira.
 * Lê as metas salvas, sincroniza os campos de configuração,
 * registra eventos da calculadora consultiva e renderiza o painel.
 *
 * Argumentos:
 * - Nenhum.
 *
 * Retorno:
 * - `void`.
 */
function initConsultoria() {
    const aporteMinInput = document.getElementById('meta-aporte-min');
    const aporteMaxInput = document.getElementById('meta-aporte-max');
    const reservaMetaInput = document.getElementById('meta-reserva-meses-meta');
    const btnAtualizarPlano = document.getElementById('btn-atualizar-plano');
    const formAnalise = document.getElementById('form-analise-investimento');
    const tipoAnalise = document.getElementById('analise-tipo');
    const metas = getMetas();

    if (aporteMinInput) aporteMinInput.value = metas.aporteMin || metas.aporte || '';
    if (aporteMaxInput) aporteMaxInput.value = metas.aporteMax || metas.aporte || '';
    if (reservaMetaInput) reservaMetaInput.value = metas.reservaMesesMeta || 6;

    if (consultoriaInicializada) {
        atualizarPainelConsultoria();
        return;
    }

    [aporteMinInput, aporteMaxInput, reservaMetaInput].forEach((el) => {
        if (!el) return;
        el.addEventListener('change', salvarConfiguracaoConsultoria);
    });

    if (btnAtualizarPlano) {
        btnAtualizarPlano.addEventListener('click', () => {
            salvarConfiguracaoConsultoria();
            atualizarPainelConsultoria();
        });
    }

    if (formAnalise) {
        formAnalise.addEventListener('submit', (event) => {
            event.preventDefault();
            analisarInvestimentoConsultivo();
        });
    }

    if (tipoAnalise) {
        tipoAnalise.addEventListener('change', atualizarFormularioAnalisePorTipo);
        atualizarFormularioAnalisePorTipo();
    }

    consultoriaInicializada = true;
    atualizarPainelConsultoria();
}

/**
 * Salva os parâmetros da consultoria dentro das metas.
 * Mantém uma faixa de aporte mínimo e máximo e a meta de meses
 * de reserva para orientar as recomendações automáticas.
 *
 * Argumentos:
 * - Nenhum. Os valores são lidos do DOM.
 *
 * Retorno:
 * - `void`.
 */
function salvarConfiguracaoConsultoria() {
    const metas = getMetas();
    const aporteMin = parseFloat(document.getElementById('meta-aporte-min')?.value) || 0;
    const aporteMax = parseFloat(document.getElementById('meta-aporte-max')?.value) || aporteMin;
    const reservaMesesMeta = parseFloat(document.getElementById('meta-reserva-meses-meta')?.value) || 6;
    const aporte = metas.aporte || aporteMin || aporteMax || 0;

    saveMetas({
        ...metas,
        aporte,
        aporteMin: Math.min(aporteMin || aporteMax, aporteMax || aporteMin),
        aporteMax: Math.max(aporteMax, aporteMin || aporteMax),
        reservaMesesMeta
    });
}

/**
 * Recalcula todo o painel consultivo.
 * Atualiza o diagnóstico da dívida, a regra de aporte,
 * a trilha de renda fixa e o resumo geral da fase financeira.
 *
 * Argumentos:
 * - Nenhum.
 *
 * Retorno:
 * - `void`.
 */
function atualizarPainelConsultoria() {
    const panorama = calcularPanoramaFinanceiro();
    renderizarDiagnosticoCartao(panorama);
    renderizarDiagnosticoConsultoria(panorama);
    renderizarRegraAportes(panorama);
    renderizarTrilhaRendaFixa(panorama);
    renderizarChecklistAnalise(panorama);
}

/**
 * Consolida os dados financeiros relevantes do usuário.
 * O cálculo usa gastos, cartões, financiamento, investimentos e metas
 * para definir a fase atual e orientar recomendações automáticas.
 *
 * Argumentos:
 * - Nenhum.
 *
 * Retorno:
 * - `Object` com:
 *   - `gastosBase`: custo mensal estimado sem amortização extraordinária.
 *   - `reservaAtual`: valor de liquidez imediata estimado.
 *   - `mesesReserva`: cobertura estimada da reserva.
 *   - `reservaMesesMeta`: meta de meses de reserva.
 *   - `saldoCartaoTotal`: saldo total de dívida de cartão.
 *   - `parcelaCartaoPlanejada`: esforço mensal estimado para o cartão.
 *   - `cartoesOrdenados`: cartões ordenados por urgência.
 *   - `aporteMin` e `aporteMax`: faixa de aporte mensal disponível.
 *   - `fase`: fase financeira predominante.
 */
function calcularPanoramaFinanceiro() {
    const gastos = getGastos();
    const cartoes = getCartoes();
    const fin = getFinanciamento();
    const investimentos = getInvestimentos();
    const metas = getMetas();

    const gastosBase = gastos.reduce((soma, gasto) => {
        const valor = gasto.valorMax ? (gasto.valor + gasto.valorMax) / 2 : gasto.valor;
        return soma + valor;
    }, 0) + (fin?.parcela || 0);

    const cartoesOrdenados = cartoes
        .filter((cartao) => (cartao.saldo || 0) > 0)
        .map((cartao) => {
            const jurosMensal = parseFloat(cartao.jurosMensal) || 0;
            const parcelas = parseInt(cartao.parcelas, 10) || 12;
            const parcelaPlanejada = parseFloat(cartao.parcelaPlanejada) || (cartao.saldo / parcelas);
            const jurosEfetivosAno = jurosMensal > 0 ? (Math.pow(1 + jurosMensal / 100, 12) - 1) * 100 : 0;
            const custoJurosMes = jurosMensal > 0 ? cartao.saldo * (jurosMensal / 100) : 0;

            return {
                ...cartao,
                parcelas,
                parcelaPlanejada,
                jurosMensal,
                jurosEfetivosAno,
                custoJurosMes,
                criticidade: classificarJurosCartao(jurosMensal)
            };
        })
        .sort((a, b) => b.jurosMensal - a.jurosMensal || b.saldo - a.saldo);

    const saldoCartaoTotal = cartoesOrdenados.reduce((soma, cartao) => soma + cartao.saldo, 0);
    const parcelaCartaoPlanejada = cartoesOrdenados.reduce((soma, cartao) => soma + cartao.parcelaPlanejada, 0);
    const reservaAtual = investimentos.reduce((soma, investimento) => {
        if (ehReservaDeLiquidez(investimento)) return soma + (investimento.valorAtual || 0);
        return soma;
    }, 0);
    const baseReserva = Math.max(gastosBase, 1);
    const mesesReserva = reservaAtual / baseReserva;
    const reservaMesesMeta = metas.reservaMesesMeta || 6;
    const aporteMin = metas.aporteMin || metas.aporte || 0;
    const aporteMax = metas.aporteMax || metas.aporte || aporteMin;
    const maiorCriticidade = cartoesOrdenados[0]?.criticidade?.nivel || 'sem-dados';

    let fase = 'acelerar-renda-fixa';
    if (saldoCartaoTotal > 0 && maiorCriticidade !== 'sem-dados') {
        fase = 'defesa-divida';
    } else if (saldoCartaoTotal > 0) {
        fase = 'mapear-divida';
    } else if (mesesReserva < reservaMesesMeta) {
        fase = 'reforcar-reserva';
    }

    return {
        gastosBase,
        reservaAtual,
        mesesReserva,
        reservaMesesMeta,
        saldoCartaoTotal,
        parcelaCartaoPlanejada,
        cartoesOrdenados,
        financiamento: fin,
        aporteMin,
        aporteMax,
        fase
    };
}

/**
 * Determina se um investimento deve ser tratado como reserva líquida.
 * Considera tipos de liquidez imediata e alguns nomes usuais usados
 * pelo próprio painel para caixa, cofrinhos e CDB de liquidez.
 *
 * Argumentos:
 * - `investimento`: objeto do investimento salvo.
 *
 * Retorno:
 * - `boolean`.
 */
function ehReservaDeLiquidez(investimento) {
    const nome = (investimento.nome || '').toLowerCase();
    if (TIPOS_RESERVA_IMEDIATA.includes(investimento.tipo)) return true;
    if (TIPOS_RESERVA_APOIO.includes(investimento.tipo) && nome.includes('mercado pago')) return true;
    if (investimento.tipo === 'renda_fixa' && nome.includes('liquidez')) return true;
    return nome.includes('reserva');
}

/**
 * Classifica a gravidade da dívida do cartão pela taxa mensal.
 * Os limites são intencionalmente conservadores porque dívidas de cartão
 * tendem a ter custo muito superior a produtos de renda fixa.
 *
 * Argumentos:
 * - `jurosMensal`: taxa mensal informada em percentual.
 *
 * Retorno:
 * - `Object` com `nivel`, `label` e `classeCss`.
 */
function classificarJurosCartao(jurosMensal) {
    if (!jurosMensal) {
        return { nivel: 'sem-dados', label: 'Taxa não informada', classeCss: 'badge-muted' };
    }
    if (jurosMensal >= 10) {
        return { nivel: 'critico', label: 'Crítico', classeCss: 'badge-danger' };
    }
    if (jurosMensal >= 4) {
        return { nivel: 'alto', label: 'Alto', classeCss: 'badge-warning' };
    }
    return { nivel: 'moderado', label: 'Moderado', classeCss: 'badge-success' };
}

/**
 * Renderiza o diagnóstico detalhado das dívidas de cartão.
 * Mostra banco, saldo, juros, custo mensal aproximado e prioridade
 * para facilitar a estratégia de ataque da dívida.
 *
 * Argumentos:
 * - `panorama`: objeto retornado por `calcularPanoramaFinanceiro`.
 *
 * Retorno:
 * - `void`.
 */
function renderizarDiagnosticoCartao(panorama = calcularPanoramaFinanceiro()) {
    const container = document.getElementById('cartao-diagnostico');
    if (!container) return;

    if (!panorama.cartoesOrdenados.length) {
        container.innerHTML = '<p>Nenhuma dívida de cartão cadastrada. Se houver parcelamento ou acordo, cadastre a taxa para o painel te orientar melhor.</p>';
        return;
    }

    const itens = panorama.cartoesOrdenados.map((cartao, indice) => `
        <div class="diagnostico-item">
            <div>
                <strong>${indice + 1}. ${cartao.nome}</strong>
                <span class="badge ${cartao.criticidade.classeCss}">${cartao.criticidade.label}</span>
                <p>Saldo: ${formatarMoeda(cartao.saldo)} | Parcelas planejadas: ${cartao.parcelas}</p>
                <p>Parcela estimada: ${formatarMoeda(cartao.parcelaPlanejada)} | Juros/CET aproximado: ${cartao.jurosMensal ? `${cartao.jurosMensal.toFixed(2)}% a.m.` : 'informar taxa'}</p>
                <p>Custo de juros por mês: ${formatarMoeda(cartao.custoJurosMes)} | Custo anual efetivo: ${cartao.jurosEfetivosAno ? `${cartao.jurosEfetivosAno.toFixed(2)}% a.a.` : 'informar taxa'}</p>
            </div>
            <div class="diagnostico-acao">
                ${indice === 0 ? 'Prioridade 1' : `Prioridade ${indice + 1}`}
            </div>
        </div>
    `).join('');

    container.innerHTML = `
        <h3>Mapa da dívida do cartão</h3>
        <p>Saldo total: <strong>${formatarMoeda(panorama.saldoCartaoTotal)}</strong> | Esforço mensal planejado: <strong>${formatarMoeda(panorama.parcelaCartaoPlanejada)}</strong></p>
        ${itens}
    `;
}

/**
 * Renderiza o diagnóstico macro da fase financeira.
 * Resume se o momento é de defesa, reforço de reserva
 * ou aceleração de acumulação em renda fixa.
 *
 * Argumentos:
 * - `panorama`: objeto retornado por `calcularPanoramaFinanceiro`.
 *
 * Retorno:
 * - `void`.
 */
function renderizarDiagnosticoConsultoria(panorama) {
    const container = document.getElementById('consultoria-diagnostico');
    if (!container) return;

    const faseAtual = {
        'mapear-divida': 'Mapear dívida e parar o vazamento',
        'defesa-divida': 'Ataque à dívida cara',
        'reforcar-reserva': 'Construção de reserva',
        'acelerar-renda-fixa': 'Acumulação em renda fixa'
    }[panorama.fase];

    const mensagem = gerarMensagemFase(panorama);

    container.innerHTML = `
        <div class="consultoria-card destaque">
            <h3>Fase atual</h3>
            <p class="consultoria-valor">${faseAtual}</p>
            <p>${mensagem}</p>
            <p>Reserva estimada: <strong>${formatarMoeda(panorama.reservaAtual)}</strong> (${panorama.mesesReserva.toFixed(1)} mês(es) de cobertura)</p>
            <p>Custo base mensal estimado: <strong>${formatarMoeda(panorama.gastosBase)}</strong></p>
        </div>
    `;
}

/**
 * Gera o texto principal da fase financeira atual.
 * O objetivo é orientar o próximo movimento com linguagem prática,
 * priorizando segurança e custo de oportunidade real.
 *
 * Argumentos:
 * - `panorama`: objeto retornado por `calcularPanoramaFinanceiro`.
 *
 * Retorno:
 * - `string`.
 */
function gerarMensagemFase(panorama) {
    if (panorama.fase === 'mapear-divida') {
        return 'Antes de acelerar investimentos, informe a taxa mensal do cartão e trate a dívida como prioridade tática. Sem conhecer o custo do cartão, qualquer comparação com Tesouro ou fundos fica incompleta.';
    }
    if (panorama.fase === 'defesa-divida') {
        return 'Sua prioridade é reduzir o cartão porque o juro mensal tende a destruir mais patrimônio do que a renda fixa consegue construir. Tesouro Renda+ fica em espera até essa pressão cair.';
    }
    if (panorama.fase === 'reforcar-reserva') {
        return 'Com a dívida cara sob controle, o foco vira completar a reserva para ganhar estabilidade. Liquidez diária e simplicidade vencem busca de retorno agressivo nesta fase.';
    }
    return 'A base defensiva está mais sólida. Agora faz sentido estruturar aposentadoria e prazo longo com renda fixa bem escolhida, sempre antes de avançar para classes mais voláteis.';
}

/**
 * Calcula a regra de alocação dos aportes mensais.
 * A regra respeita a fase atual e transforma a faixa de aporte
 * em valores concretos por prioridade.
 *
 * Argumentos:
 * - `panorama`: objeto retornado por `calcularPanoramaFinanceiro`.
 *
 * Retorno:
 * - `Object` com percentuais, justificativa e rótulos das categorias.
 */
function calcularRegraAportes(panorama) {
    if (panorama.fase === 'mapear-divida' || panorama.fase === 'defesa-divida') {
        const percDivida = panorama.mesesReserva < 4 ? 70 : 85;
        const percReserva = 100 - percDivida;
        return {
            categorias: [
                { label: 'Quitar/negociar cartão', percentual: percDivida },
                { label: 'Manter ou reforçar reserva', percentual: percReserva }
            ],
            justificativa: 'Enquanto houver dívida cara no cartão, o aporte deve atacar juros ruins antes de mirar títulos de aposentadoria.'
        };
    }

    if (panorama.fase === 'reforcar-reserva') {
        return {
            categorias: [
                { label: 'Reserva de emergência', percentual: 70 },
                { label: 'Renda fixa curta e simples', percentual: 30 }
            ],
            justificativa: 'Sem dívida cara dominante, a prioridade é sair do risco de imprevisto e consolidar caixa.'
        };
    }

    return {
        categorias: [
            { label: 'Tesouro Selic/CDB liquidez', percentual: 20 },
            { label: 'IPCA+ ou Tesouro Renda+', percentual: 50 },
            { label: 'Previdência/Fase seguinte', percentual: 30 }
        ],
        justificativa: 'Com base defensiva pronta, a renda fixa passa a ser dividida entre liquidez, proteção real e aposentadoria.'
    };
}

/**
 * Renderiza a regra de aportes em valores mínimo e máximo.
 * Converte percentuais em faixas concretas para facilitar a execução
 * mensal sem depender de cálculo manual.
 *
 * Argumentos:
 * - `panorama`: objeto retornado por `calcularPanoramaFinanceiro`.
 *
 * Retorno:
 * - `void`.
 */
function renderizarRegraAportes(panorama) {
    const container = document.getElementById('consultoria-aportes');
    if (!container) return;

    const regra = calcularRegraAportes(panorama);
    const linhas = regra.categorias.map((categoria) => {
        const valorMin = panorama.aporteMin * (categoria.percentual / 100);
        const valorMax = panorama.aporteMax * (categoria.percentual / 100);
        return `
            <div class="diagnostico-item">
                <div>
                    <strong>${categoria.label}</strong>
                    <p>${categoria.percentual}% do aporte mensal</p>
                </div>
                <div class="diagnostico-acao">
                    ${formatarMoeda(valorMin)} a ${formatarMoeda(valorMax)}
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = `
        <div class="consultoria-card">
            <h3>Regra prática de aportes</h3>
            <p>Faixa configurada: <strong>${formatarMoeda(panorama.aporteMin)}</strong> a <strong>${formatarMoeda(panorama.aporteMax)}</strong> por mês.</p>
            <p>${regra.justificativa}</p>
            ${linhas}
        </div>
    `;
}

/**
 * Renderiza a trilha recomendada de renda fixa.
 * Explica quando faz sentido usar liquidez diária, pós-fixados,
 * IPCA+ e Tesouro Renda+ conforme a maturidade da base financeira.
 *
 * Argumentos:
 * - `panorama`: objeto retornado por `calcularPanoramaFinanceiro`.
 *
 * Retorno:
 * - `void`.
 */
function renderizarTrilhaRendaFixa(panorama) {
    const container = document.getElementById('consultoria-renda-fixa');
    if (!container) return;

    const liberadoRendaMais = panorama.fase === 'acelerar-renda-fixa';
    const textoRendaMais = liberadoRendaMais
        ? 'Já pode entrar aos poucos como peça de aposentadoria, desde que o dinheiro seja realmente de longo prazo.'
        : 'Ainda não é prioridade. Primeiro reduza cartão caro e fortaleça a reserva antes de travar capital de aposentadoria.';

    container.innerHTML = `
        <div class="consultoria-card">
            <h3>Trilha da renda fixa</h3>
            <div class="trilha-grid">
                <div class="etapa-trilha">
                    <strong>1. Caixa e emergência</strong>
                    <p>Use liquidez diária para imprevistos e curto prazo. Exemplo: CDB de liquidez diária ou Tesouro Selic.</p>
                </div>
                <div class="etapa-trilha">
                    <strong>2. Objetivos intermediários</strong>
                    <p>Depois da reserva, priorize pós-fixados e IPCA+ conforme prazo e necessidade de proteção contra inflação.</p>
                </div>
                <div class="etapa-trilha">
                    <strong>3. Aposentadoria</strong>
                    <p><strong>Tesouro Renda+ 2040:</strong> ${textoRendaMais}</p>
                </div>
            </div>
            <p>Financiamento imobiliário com juros moderados normalmente não vence o cartão na prioridade. Ele entra na estratégia depois que a dívida cara estiver sob controle.</p>
        </div>
    `;
}

/**
 * Renderiza o checklist permanente de análise.
 * Esse checklist é o padrão de decisão que deve ser usado
 * toda vez que um novo investimento entrar em avaliação.
 *
 * Argumentos:
 * - `panorama`: objeto retornado por `calcularPanoramaFinanceiro`.
 *
 * Retorno:
 * - `void`.
 */
function renderizarChecklistAnalise(panorama) {
    const container = document.getElementById('consultoria-checklist');
    if (!container) return;

    const bloqueioRisco = panorama.fase === 'mapear-divida' || panorama.fase === 'defesa-divida'
        ? 'Nesta fase, ativos de risco e fundos caros tendem a ser distração em vez de solução.'
        : 'Com a base mais forte, risco pode entrar depois, mas só em etapa posterior ao plano atual.';

    container.innerHTML = `
        <div class="consultoria-card">
            <h3>Método contínuo de análise</h3>
            <div class="checklist-grid">
                <div class="check-item">1. O produto serve para reserva, prazo médio ou aposentadoria?</div>
                <div class="check-item">2. Qual é o risco real de perda ou oscilação?</div>
                <div class="check-item">3. A liquidez combina com o momento em que o dinheiro pode ser usado?</div>
                <div class="check-item">4. Qual é a tributação e o custo total do produto?</div>
                <div class="check-item">5. Ele é melhor do que quitar dívida ou reforçar reserva agora?</div>
                <div class="check-item">6. Existe alternativa mais simples entregando função parecida?</div>
            </div>
            <p>${bloqueioRisco}</p>
        </div>
    `;
}

/**
 * Ajusta valores-padrão do formulário conforme o tipo de produto.
 * A ideia é poupar trabalho manual e carregar premissas coerentes
 * para Tesouro, CDB, fundos e classes de maior risco.
 *
 * Argumentos:
 * - Nenhum. Os campos são lidos e alterados diretamente no DOM.
 *
 * Retorno:
 * - `void`.
 */
function atualizarFormularioAnalisePorTipo() {
    const tipo = document.getElementById('analise-tipo')?.value || '';
    const objetivo = document.getElementById('analise-objetivo');
    const liquidez = document.getElementById('analise-liquidez');
    const risco = document.getElementById('analise-risco');
    const taxa = document.getElementById('analise-taxa');
    const tributacao = document.getElementById('analise-tributacao-regime');
    const comeCotas = document.getElementById('analise-come-cotas');
    const ir = document.getElementById('analise-ir');
    const iof = document.getElementById('analise-iof');
    const janela = document.getElementById('analise-janela');
    const marcacao = document.getElementById('analise-marcacao');

    if (!tipo) return;

    if (tipo === 'tesouro_renda_mais') {
        if (objetivo) objetivo.value = 'aposentadoria';
        if (liquidez) liquidez.value = 'd1';
        if (risco) risco.value = 'alto';
        if (taxa) taxa.value = 0.2;
        if (tributacao) tributacao.value = 'tesouro_direto';
        if (comeCotas) comeCotas.checked = false;
        if (ir) ir.value = 15;
        if (iof) iof.value = 'isento';
        if (janela) janela.value = 'horario_comercial';
        if (marcacao) marcacao.checked = true;
        const rentabilidade = document.getElementById('analise-rentabilidade-real');
        if (rentabilidade && !rentabilidade.value) rentabilidade.value = 7.44;
        return;
    }

    if (tipo === 'ipca') {
        if (objetivo) objetivo.value = 'medio_prazo';
        if (liquidez) liquidez.value = 'd1';
        if (risco) risco.value = 'medio';
        if (taxa) taxa.value = 0.2;
        if (tributacao) tributacao.value = 'tesouro_direto';
        if (comeCotas) comeCotas.checked = false;
        if (ir) ir.value = 15;
        if (iof) iof.value = 'isento';
        if (janela) janela.value = 'horario_comercial';
        if (marcacao) marcacao.checked = true;
        return;
    }

    if (tipo === 'tesouro_selic' || tipo === 'cdb') {
        if (objetivo) objetivo.value = 'reserva';
        if (liquidez) liquidez.value = tipo === 'tesouro_selic' ? 'd1' : 'diaria';
        if (risco) risco.value = 'baixo';
        if (taxa) taxa.value = tipo === 'tesouro_selic' ? 0.2 : 0;
        if (tributacao) tributacao.value = tipo === 'tesouro_selic' ? 'tesouro_direto' : 'cdb_ir';
        if (comeCotas) comeCotas.checked = false;
        if (ir) ir.value = 17.5;
        if (iof) iof.value = 'isento';
        if (janela) janela.value = 'horario_comercial';
        if (marcacao) marcacao.checked = false;
        return;
    }

    if (tipo === 'fundo') {
        if (objetivo) objetivo.value = 'medio_prazo';
        if (liquidez) liquidez.value = 'media';
        if (risco) risco.value = 'medio';
        if (taxa) taxa.value = 1;
        if (tributacao) tributacao.value = 'fundo_come_cotas';
        if (comeCotas) comeCotas.checked = true;
        if (ir) ir.value = 15;
        if (iof) iof.value = 'isento';
        if (janela) janela.value = 'livre';
        if (marcacao) marcacao.checked = false;
        return;
    }

    if (tipo === 'fii' || tipo === 'etf' || tipo === 'acao') {
        if (objetivo) objetivo.value = 'renda';
        if (liquidez) liquidez.value = 'd0';
        if (risco) risco.value = 'alto';
        if (taxa) taxa.value = 0;
        if (tributacao) tributacao.value = tipo === 'fii' ? 'fii' : 'acoes_etfs';
        if (comeCotas) comeCotas.checked = false;
        if (ir) ir.value = 15;
        if (iof) iof.value = 'isento';
        if (janela) janela.value = 'horario_comercial';
        if (marcacao) marcacao.checked = true;
    }
}

/**
 * Lê o formulário avançado de análise e converte os campos
 * para um objeto normalizado, mais fácil de avaliar.
 *
 * Argumentos:
 * - Nenhum. Os dados são lidos do DOM.
 *
 * Retorno:
 * - `Object` com tipo, objetivo, liquidez, risco, custos, vencimento,
 *   aporte pretendido e alertas operacionais.
 */
function lerFormularioAnalise() {
    return {
        tipo: document.getElementById('analise-tipo')?.value || '',
        objetivo: document.getElementById('analise-objetivo')?.value || '',
        liquidez: document.getElementById('analise-liquidez')?.value || '',
        risco: document.getElementById('analise-risco')?.value || '',
        taxa: parseFloat(document.getElementById('analise-taxa')?.value) || 0,
        tributacaoRegime: document.getElementById('analise-tributacao-regime')?.value || '',
        comeCotas: document.getElementById('analise-come-cotas')?.checked || false,
        aporte: parseFloat(document.getElementById('analise-aporte')?.value) || 0,
        minimo: parseFloat(document.getElementById('analise-minimo')?.value) || 0,
        precoUnitario: parseFloat(document.getElementById('analise-preco-unitario')?.value) || 0,
        vencimento: document.getElementById('analise-vencimento')?.value || '',
        rentabilidadeReal: parseFloat(document.getElementById('analise-rentabilidade-real')?.value) || 0,
        ir: parseFloat(document.getElementById('analise-ir')?.value) || 0,
        iof: document.getElementById('analise-iof')?.value || 'isento',
        janela: document.getElementById('analise-janela')?.value || 'livre',
        precisaAntes: document.getElementById('analise-antes-prazo')?.checked || false,
        marcacaoMercado: document.getElementById('analise-marcacao')?.checked || false
    };
}

/**
 * Calcula quantos anos faltam até uma data de vencimento.
 * Isso ajuda a separar produtos de caixa, médio prazo
 * e aposentadoria com base em um critério objetivo.
 *
 * Argumentos:
 * - `dataIso`: data no formato ISO (`AAAA-MM-DD`).
 *
 * Retorno:
 * - `number` com anos restantes, ou `0` quando não houver data válida.
 */
function calcularAnosAteVencimento(dataIso) {
    if (!dataIso) return 0;
    const hoje = new Date();
    const vencimento = new Date(`${dataIso}T00:00:00`);
    if (Number.isNaN(vencimento.getTime())) return 0;
    const diferencaMs = vencimento - hoje;
    return diferencaMs > 0 ? diferencaMs / (1000 * 60 * 60 * 24 * 365.25) : 0;
}

/**
 * Traduz os dados de liquidez para uma descrição amigável.
 * O objetivo é deixar a resposta mais educativa, sem depender
 * apenas dos códigos do formulário.
 *
 * Argumentos:
 * - `liquidez`: código escolhido no formulário.
 *
 * Retorno:
 * - `string` com a leitura da liquidez.
 */
function descreverLiquidez(liquidez) {
    const mapa = {
        diaria: 'liquidez diária',
        d0: 'resgate no mesmo dia (D+0)',
        d1: 'liquidação em D+1',
        media: 'liquidez intermediária',
        baixa: 'baixa liquidez'
    };
    return mapa[liquidez] || 'liquidez não informada';
}

/**
 * Resume a leitura tributária do produto.
 * Usa IR e IOF para explicar o peso fiscal da operação,
 * com foco em linguagem simples para o usuário.
 *
 * Argumentos:
 * - `analise`: objeto retornado por `lerFormularioAnalise`.
 *
 * Retorno:
 * - `string`.
 */
function resumirTributacaoAnalise(analise) {
    const partes = [];
    const mapaRegime = {
        tesouro_direto: 'Tesouro Direto sem come-cotas',
        cdb_ir: 'renda fixa com IR regressivo',
        fundo_come_cotas: 'fundo com come-cotas',
        fundo_sem_come_cotas: 'fundo sem come-cotas',
        fii: 'tributação típica de FII',
        acoes_etfs: 'tributação típica de ações e ETFs',
        isento: 'produto isento ou com regime especial'
    };

    if (analise.tributacaoRegime) partes.push(mapaRegime[analise.tributacaoRegime] || analise.tributacaoRegime);
    if (analise.ir > 0) partes.push(`IR estimado de ${analise.ir.toFixed(2)}%`);
    else partes.push('sem IR informado');

    if (analise.iof === 'ate_30') partes.push('com possibilidade de IOF se sair cedo');
    else partes.push('sem IOF relevante acima de 30 dias');

    if (analise.comeCotas) partes.push('com antecipação de IR via come-cotas');
    else if (analise.tributacaoRegime === 'tesouro_direto') partes.push('sem come-cotas');

    return partes.join(' | ');
}

/**
 * Avalia o investimento e devolve um parecer estruturado.
 * O cálculo considera fase atual, adequação ao objetivo, prazo,
 * liquidez, custo fiscal, mínimo de entrada e risco de venda antecipada.
 *
 * Argumentos:
 * - `analise`: objeto retornado por `lerFormularioAnalise`.
 * - `panorama`: objeto retornado por `calcularPanoramaFinanceiro`.
 *
 * Retorno:
 * - `Object` com nota, veredito, razões, alertas e resumo operacional.
 */
function gerarParecerInvestimento(analise, panorama) {
    const razoes = [];
    const alertas = [];
    const ensino = [];
    let nota = 0;

    const anosAteVencimento = calcularAnosAteVencimento(analise.vencimento);
    const faseDefensiva = panorama.fase === 'mapear-divida' || panorama.fase === 'defesa-divida';
    const faseReserva = panorama.fase === 'reforcar-reserva';

    if (analise.aporte > 0 && analise.minimo > 0 && analise.aporte < analise.minimo) {
        nota -= 4;
        razoes.push('O aporte informado é menor do que o investimento mínimo permitido.');
    } else if (analise.aporte > 0 && analise.minimo > 0) {
        nota += 1;
        razoes.push('Seu aporte atual atende ao investimento mínimo do produto.');
    }

    if (analise.precoUnitario > 0 && analise.aporte > 0 && analise.aporte < analise.precoUnitario) {
        ensino.push('Você está comprando apenas uma fração do título, não uma unidade inteira. Isso é normal no Tesouro Direto.');
    }

    if (analise.objetivo === 'reserva' && (analise.liquidez === 'diaria' || analise.liquidez === 'd0') && analise.risco === 'baixo') {
        nota += 3;
        razoes.push('Combina com a função de caixa e emergência.');
    }

    if (analise.precisaAntes && !['diaria', 'd0'].includes(analise.liquidez)) {
        nota -= 3;
        razoes.push('Você pode precisar do dinheiro antes, então essa liquidez é pior do que parece.');
    }

    if (analise.marcacaoMercado && analise.precisaAntes) {
        nota -= 3;
        alertas.push('Existe risco de vender antes do vencimento com preço pior do que o esperado.');
    }

    if (analise.comeCotas && analise.tributacaoRegime === 'tesouro_direto') {
        nota -= 3;
        alertas.push('Tesouro Direto não tem come-cotas. O correto é IR regressivo no resgate e IOF apenas em saídas muito curtas.');
    }

    if (faseDefensiva && TIPOS_ALTO_RISCO.includes(analise.tipo)) {
        nota -= 4;
        razoes.push('Sua fase atual pede foco em dívida e segurança, não em ativos voláteis.');
    }

    if (faseDefensiva && (analise.tipo === 'ipca' || analise.tipo === 'tesouro_renda_mais')) {
        nota -= 3;
        razoes.push('No seu momento atual, dívida cara e reserva ainda competem e costumam ter prioridade maior.');
    }

    if (faseReserva && analise.objetivo === 'aposentadoria' && analise.tipo === 'tesouro_renda_mais') {
        nota -= 1;
        razoes.push('O produto é bom para aposentadoria, mas ainda perde prioridade para completar a reserva.');
    }

    if (analise.tipo === 'tesouro_renda_mais') {
        if (analise.objetivo === 'aposentadoria') {
            nota += 2;
            razoes.push('Serve para aposentadoria e formação de renda futura corrigida pela inflação.');
        }
        if (anosAteVencimento >= 10) {
            nota += 1;
            ensino.push(`O vencimento está a aproximadamente ${anosAteVencimento.toFixed(1)} anos, então esse é um produto de horizonte muito longo.`);
        }
        if (analise.rentabilidadeReal > 0) {
            nota += 1;
            razoes.push(`A rentabilidade real informada de IPCA + ${analise.rentabilidadeReal.toFixed(2)}% a.a. é forte para longo prazo.`);
        }
        if (analise.janela === 'horario_comercial') {
            ensino.push('Esse produto só opera em janela de mercado, então não funciona como caixa imediato.');
        }
    }

    if (analise.tipo === 'fundo' && analise.taxa > 1) {
        nota -= 2;
        razoes.push('Taxa acima de 1% ao ano exige comparação rigorosa com alternativas simples.');
    }

    if (analise.comeCotas && analise.tipo === 'fundo') {
        ensino.push('Come-cotas é uma antecipação semestral de IR típica de muitos fundos. Isso reduz a quantidade de cotas ao longo do tempo.');
    }

    if (analise.tributacaoRegime === 'tesouro_direto') {
        ensino.push('No Tesouro Direto não existe come-cotas. O custo tributário principal é o IR regressivo e, em alguns casos, a taxa anual da B3 ou do produto.');
    }

    if ((analise.tipo === 'cdb' || analise.tipo === 'tesouro_selic') && analise.risco === 'baixo') {
        nota += 2;
        razoes.push('É um tipo de produto compatível com construção de reserva e caixa disciplinado.');
    }

    if (analise.ir >= 20 && anosAteVencimento > 0 && anosAteVencimento >= 5) {
        ensino.push('Para prazo longo, vale lembrar que a alíquota efetiva de IR tende a cair com o tempo na maioria dos títulos tributados.');
    }

    if (!razoes.length) {
        razoes.push('Faltam sinais suficientes para aprovar agora. Compare com quitar dívida, reforçar reserva e alternativas mais simples.');
    }

    let veredito = 'Pode esperar';
    let classe = 'badge-warning';
    if (nota >= 4) {
        veredito = 'Faz sentido agora';
        classe = 'badge-success';
    } else if (nota <= -2) {
        veredito = 'Nao indicado agora';
        classe = 'badge-danger';
    }

    return {
        nota,
        veredito,
        classe,
        razoes,
        alertas,
        ensino,
        anosAteVencimento,
        liquidezTexto: descreverLiquidez(analise.liquidez),
        tributacaoTexto: resumirTributacaoAnalise(analise)
    };
}

/**
 * Avalia um investimento usando o método consultivo do painel.
 * A resposta considera fase atual, objetivo, liquidez, risco,
 * vencimento, tributação, valor mínimo e risco de venda antecipada
 * para devolver uma orientação mais próxima de uma análise real.
 *
 * Argumentos:
 * - Nenhum. Os dados são lidos do formulário `form-analise-investimento`.
 *
 * Retorno:
 * - `void`.
 */
async function analisarInvestimentoConsultivo() {
    const panorama = calcularPanoramaFinanceiro();
    const analise = lerFormularioAnalise();
    const parecer = gerarParecerInvestimento(analise, panorama);
    const container = document.getElementById('resultado-analise-investimento');
    if (!container) return;
    const resumoIpca = (analise.tipo === 'ipca' || analise.tipo === 'tesouro_renda_mais') && typeof buscarResumoIpca === 'function'
        ? await buscarResumoIpca()
        : null;

    container.innerHTML = `
        <h3>Resultado da análise</h3>
        <p><span class="badge ${parecer.classe}">${parecer.veredito}</span></p>
        <div class="analise-resumo-grid">
            <div class="check-item"><strong>Liquidez:</strong><br>${parecer.liquidezTexto}</div>
            <div class="check-item"><strong>Tributação:</strong><br>${parecer.tributacaoTexto}</div>
            <div class="check-item"><strong>Horizonte:</strong><br>${parecer.anosAteVencimento > 0 ? `${parecer.anosAteVencimento.toFixed(1)} anos até o vencimento` : 'sem vencimento informado'}</div>
            <div class="check-item"><strong>Fase atual:</strong><br>${gerarMensagemFase(panorama)}</div>
        </div>
        <h4>Por que</h4>
        <ul class="analise-lista">
            ${parecer.razoes.map((razao) => `<li>${razao}</li>`).join('')}
        </ul>
        ${parecer.alertas.length ? `
            <h4>Alertas</h4>
            <ul class="analise-lista">
                ${parecer.alertas.map((alerta) => `<li>${alerta}</li>`).join('')}
            </ul>
        ` : ''}
        ${parecer.ensino.length ? `
            <h4>Como ler esse produto</h4>
            <ul class="analise-lista">
                ${parecer.ensino.map((item) => `<li>${item}</li>`).join('')}
            </ul>
        ` : ''}
        ${resumoIpca ? `
            <h4>IPCA de referência</h4>
            <ul class="analise-lista">
                <li>Último IPCA mensal disponível: ${resumoIpca.ultimaVariacao.toFixed(2)}% em ${resumoIpca.ultimoMes}</li>
                <li>IPCA acumulado em 12 meses: ${resumoIpca.acumulado12.toFixed(2)}%</li>
                ${analise.rentabilidadeReal > 0 ? `<li>Rentabilidade nominal aproximada hoje: ${(resumoIpca.acumulado12 + analise.rentabilidadeReal).toFixed(2)}% a.a. usando IPCA de 12 meses como referência.</li>` : ''}
            </ul>
        ` : ''}
        <p>Regra de ouro: se o investimento não superar com clareza a utilidade de quitar dívida cara ou manter sua reserva adequada, ele ainda não é prioridade.</p>
    `;
}
