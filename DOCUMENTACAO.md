# Documentação das Funções - Painel Finanças 2026

## data.js

### getGastos()
Retorna todos os gastos do localStorage.
- **Retorno:** `Array<{id, descricao, valor, valorMax?, tipo}>`

### obterCompetenciaAtual()
```js
/**
 * Retorna a competência atual no formato AAAA-MM.
 * @returns {string}
 */
```
Centraliza a definição do mês corrente usado no painel. Essa função serve como referência para preencher automaticamente o mês de cadastro dos gastos manuais e para abrir o carrossel mensal já posicionado no mês atual, que no fluxo de uso do painel tende a ser o ponto de partida da análise.

### saveGastos(gastos)
Salva o array de gastos no localStorage.
- **Argumentos:** `gastos` (Array)

### addGasto(gasto)
Adiciona um novo gasto.
- **Argumentos:** `gasto` - `{ descricao, valor, valorMax?, tipo, competencia? }`
- **Retorno:** Objeto do gasto com id

### updateGasto(id, dados)
Atualiza um gasto existente.
- **Argumentos:** `id` (string), `dados` (objeto parcial)

### removeGasto(id)
Remove um gasto pelo id.

### getCartoes() / saveCartoes(cartoes) / saveCartao(cartao) / removeCartao(id)
CRUD de cartões de crédito.

### getFaturasResumo() / saveFaturasResumo(faturasResumo)
Armazena e recupera o resumo das faturas importadas, incluindo total, vencimento, competência de pagamento e mínimo da fatura.

### getFinanciamento() / saveFinanciamento(fin)
Leitura e gravação dos dados do financiamento imobiliário.

### getInvestimentos() / saveInvestimentos(inv) / addInvestimento(inv) / updateInvestimento(id, dados) / removeInvestimento(id)
CRUD de investimentos.
Na leitura e na atualização, os investimentos agora passam por normalização de tipos numéricos. Isso evita que campos como `valorAtual`, `aporteMensal` e `rentabilidadeReal` sejam salvos como texto durante a edição e depois quebrem a renderização da aba `Investimentos`.

#### addInvestimento(inv)
```js
/**
 * Adiciona investimento
 * @param {Object} inv - { nome, tipo, objetivo?, liquidez?, risco?, quantidade, precoMedio, valorAtual, ticker?, aporteMensal, minimo?, taxa?, tributacaoRegime?, comeCotas?, rentabilidadeReal?, vencimento?, marcacaoMercado? }
 * @returns {Object}
 */
```
Registra um investimento com informações mais completas para consultoria: objetivo, liquidez, risco, tributação, come-cotas, rentabilidade real, vencimento e risco de marcação a mercado. Isso permite que o painel explique melhor o produto e compare a decisão com a fase financeira do usuário.

### getMetas() / saveMetas(metas)
Metas de aporte, taxa e alocação.

### getGastosMensais() / saveGastosMensais(dados)
Gastos por mês para gráficos.

### getAportesMensais() / saveAportesMensais(dados)
Aportes por mês para gráficos.

### getApiKey() / saveApiKey(key)
Chave API brapi.dev.

### exportarDados()
Exporta todos os dados como JSON.
- **Retorno:** string JSON

### criarChaveGasto(gasto)
```js
/**
 * Gera uma chave estável para deduplicar gastos importados.
 * @param {Object} gasto
 * @returns {string}
 */
```
Cria uma assinatura textual estável baseada em descrição, valor, tipo e data da compra. Essa chave é usada para evitar duplicidade quando você importa novamente gastos sugeridos a partir das faturas.

### normalizarGastoImportado(gasto)
```js
/**
 * Converte um gasto sugerido de fatura para o formato interno do painel.
 * @param {Object} gasto
 * @returns {Object}
 */
```
Transforma um item vindo do importador de faturas no mesmo formato usado internamente pelo painel. Isso garante que os gastos extraídos dos PDFs possam entrar no sistema sem quebrar a estrutura de dados existente.
Além dos campos originais, a normalização agora preserva a `competencia` mensal do lançamento ou a deriva da `dataCompra`, o que permite consolidar a evolução mês a mês sem perder compatibilidade com os gastos já cadastrados.
Ela também preserva `principalParcela` e `jurosParcela` quando a fatura detalha a composição da parcela, permitindo mostrar no painel quanto da cobrança é principal e quanto é custo financeiro.

### importarGastosSugeridos(gastosImportados)
```js
/**
 * Mescla gastos importados sem duplicar os que já existem.
 * @param {Array} gastosImportados
 * @returns {{adicionados: number, ignorados: number, totalFinal: number}}
 */
```
Faz a mesclagem segura dos gastos extraídos das faturas com os gastos já cadastrados no painel. O objetivo é permitir reimportações sem sobrescrever tudo e sem multiplicar lançamentos idênticos.

### importarFaturasResumo(resumosImportados)
```js
/**
 * Mescla resumos de fatura sem duplicar banco e vencimento.
 * @param {Array} resumosImportados
 * @returns {Array}
 */
```
Guarda no navegador os totais das faturas por banco e vencimento. Essa camada é essencial para a aba `Gastos`, porque permite calcular o que realmente vence no mês sem depender apenas do mês original de cada compra.

### importarDados(json)
```js
/**
 * Importa dados de JSON.
 * Suporta backup completo do painel e arquivos de gastos sugeridos vindos das faturas.
 * @param {string} json
 * @returns {{ok: boolean, modo?: string, adicionados?: number, ignorados?: number, totalFinal?: number}}
 */
```
Agora a importação suporta dois modos. No primeiro, carrega um backup completo do painel. No segundo, reconhece arquivos gerados pelo módulo de faturas e faz um merge dos gastos sugeridos, retornando um resumo com quantos itens foram adicionados ou ignorados.

## api-cotacoes.js

### buscarCotacao(ticker)
Busca cotação de ação/FII na brapi.dev.
- **Argumentos:** `ticker` (string, ex: PETR4)
- **Retorno:** `Promise<number|null>` - valor ou null

### buscarSerieIpca()
```js
/**
 * Busca os 12 ultimos valores mensais do IPCA na API SGS do Banco Central.
 * @returns {Promise<Array<{data: string, valor: number}>>}
 */
```
Consulta a série pública do IPCA no Banco Central e entrega os últimos 12 registros mensais em formato simplificado. Isso permite integrar dados reais de inflação ao painel sem depender de preenchimento manual.

### calcularIpcaAcumulado12(serie)
```js
/**
 * Calcula o IPCA acumulado em 12 meses a partir da serie mensal.
 * @param {Array<{data: string, valor: number}>} serie
 * @returns {number}
 */
```
Transforma os valores mensais do IPCA em um acumulado aproximado de 12 meses. A função ajuda o usuário a enxergar uma referência nominal mais concreta ao analisar títulos indexados à inflação.

### buscarResumoIpca()
```js
/**
 * Retorna um resumo do IPCA atual com ultimo mes e acumulado em 12 meses.
 * @returns {Promise<{ultimoMes: string, ultimaVariacao: number, acumulado12: number} | null>}
 */
```
Entrega um resumo pronto para a interface com o último IPCA mensal disponível e o acumulado de 12 meses. Esse resumo é usado na análise de Tesouro IPCA+ e Tesouro Renda+ para contextualizar a rentabilidade real do título.

## financiamento.js

### simularQuitacao()
Calcula a projeção de quitação com amortização extra e FGTS. Atualiza o resultado e o gráfico.

### atualizarFormFinanciamento()
Preenche o formulário com os dados salvos do financiamento.

### normalizarMesAno(valor)
```js
/**
 * Normaliza um texto de mês/ano para o formato MM/AAAA.
 *
 * Argumentos:
 * - `valor`: texto informado no campo de último uso do FGTS.
 *
 * Retorno:
 * - `string` no formato `MM/AAAA` quando possível; caso contrário retorna o texto original.
 */
```
Padroniza o campo de data do último uso do FGTS para evitar registros inconsistentes como `032023` e transformar esse valor em um formato mais legível, como `03/2023`.

### mostrarStatusFinanciamento(mensagem)
```js
/**
 * Exibe uma mensagem curta de status no módulo de financiamento.
 *
 * Argumentos:
 * - `mensagem`: texto a ser mostrado ao usuário.
 *
 * Retorno:
 * - `void`.
 */
```
Mostra uma confirmação visual após o salvamento do financiamento. A função existe para reduzir a sensação de que os dados não foram persistidos quando, na verdade, já estão armazenados no navegador.

### renderizarResumoFinanciamento()
```js
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
```
Exibe um resumo do financiamento atualmente salvo, incluindo parcela, saldo, prazo, juros, FGTS e último uso do FGTS. O objetivo é dar transparência sobre quais dados estão sendo usados pelo simulador.

### calcularPrazoQuitacao(saldoInicial, parcela, jurosMensal, amortExtra, decimoTerceiro)
```js
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
```
Centraliza o cálculo do prazo estimado de quitação. Essa função permite comparar o cenário normal com o cenário usando FGTS e outros reforços, além de detectar quando a parcela informada não seria suficiente para amortizar o saldo.

## projecoes.js

### projetarRentabilidade()
Calcula a projeção de patrimônio com juros compostos e aportes mensais. Atualiza resultado e gráfico.

## consultoria.js

### initConsultoria()
```js
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
```
Carrega a nova área de consultoria do painel. Essa função liga os campos de aporte mínimo, aporte máximo e meta de meses da reserva à persistência do sistema e também conecta o formulário de análise de investimentos. Na prática, é a porta de entrada da consultoria financeira dentro da aplicação.

### salvarConfiguracaoConsultoria()
```js
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
```
Persiste os parâmetros estratégicos usados pelo painel consultivo. Serve para transformar a realidade do usuário em regras executáveis: quanto consegue investir por mês em um cenário apertado, quanto consegue investir em um cenário melhor e quantos meses de reserva deseja construir antes de subir o risco.

### atualizarPainelConsultoria()
```js
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
```
Função central de atualização da consultoria. Sempre que gastos, cartões, financiamento, investimentos ou metas mudam, ela recompõe a leitura estratégica do painel. Seu objetivo é manter a recomendação coerente com a situação mais recente do usuário.

### calcularPanoramaFinanceiro()
```js
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
```
É o cérebro analítico do módulo. A função lê os dados brutos e transforma tudo em um panorama estratégico: quanto custa manter a estrutura financeira atual, qual o tamanho da reserva líquida, quantos meses de proteção existem hoje, quanto da dívida do cartão está pressionando o orçamento e em qual fase do plano o usuário se encontra.

### ehReservaDeLiquidez(investimento)
```js
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
```
Classifica automaticamente quais ativos contam como caixa de emergência no diagnóstico. Isso evita que o painel trate ativos de longo prazo como se fossem reserva pronta para uso e, ao mesmo tempo, reconhece instrumentos típicos de liquidez diária cadastrados pelo usuário.

### classificarJurosCartao(jurosMensal)
```js
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
```
Transforma uma taxa mensal informada em uma leitura de urgência operacional. Com isso, o painel consegue ordenar as dívidas por criticidade e mostrar com mais clareza o que deve ser atacado primeiro.

### renderizarDiagnosticoCartao(panorama)
```js
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
```
Exibe o mapa da dívida diretamente na interface do cartão. A função traduz os dados do passivo em linguagem acionável: ordem de prioridade, custo mensal aproximado dos juros, saldo por instituição e esforço planejado para amortização.

### renderizarDiagnosticoConsultoria(panorama)
```js
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
```
Mostra, em alto nível, qual é a fase correta do usuário no ciclo patrimonial. Essa leitura evita decisões fora de ordem, como tentar acelerar aposentadoria enquanto a base ainda sofre com dívida cara.

### gerarMensagemFase(panorama)
```js
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
```
Produz a narrativa principal da consultoria. Ela converte o estado atual do usuário em uma orientação curta e direta sobre o que fazer agora e por que isso é mais racional do que partir para investimentos mais sofisticados.

### calcularRegraAportes(panorama)
```js
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
```
Converte estratégia em execução. A função pega a faixa de aporte do usuário e decide, de acordo com a fase financeira, quanto deve ser direcionado para dívida, reserva, renda fixa curta ou aposentadoria.

### renderizarRegraAportes(panorama)
```js
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
```
Apresenta visualmente a regra de execução mensal. Em vez de mostrar apenas porcentagens, a função entrega uma faixa de valores em reais para cada prioridade, o que torna a orientação imediatamente utilizável.

### renderizarTrilhaRendaFixa(panorama)
```js
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
```
Materializa a parte do plano focada em renda fixa. A função deixa claro quando cada produto faz sentido e por que o `Tesouro Renda+` deve entrar só depois que a estrutura defensiva estiver suficientemente forte.

### renderizarChecklistAnalise(panorama)
```js
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
```
Cria o método contínuo de avaliação de oportunidades. Em vez de depender de memória ou intuição, a aplicação passa a ter um padrão repetível de análise baseado em objetivo, risco, liquidez, tributação implícita e adequação à fase atual.

### atualizarFormularioAnalisePorTipo()
```js
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
```
Configura automaticamente o formulário de análise com premissas mais realistas para cada classe de ativo. Isso é importante para evitar que o usuário precise preencher do zero campos como liquidez, risco, janela de negociação e tributação sempre que quiser analisar Tesouro Direto, CDB, fundos ou ativos de risco.

### lerFormularioAnalise()
```js
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
```
Centraliza a leitura dos campos do formulário para que a avaliação use uma estrutura padronizada. O objetivo é permitir análises mais completas, considerando não apenas o tipo do produto, mas também valor do aporte, investimento mínimo, vencimento, risco de marcação a mercado, imposto e regras operacionais.

### calcularAnosAteVencimento(dataIso)
```js
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
```
Transforma a data de vencimento em uma medida concreta de horizonte. Isso é especialmente útil para Tesouro IPCA+ e Tesouro Renda+, em que o prazo muda completamente a interpretação do produto.

### descreverLiquidez(liquidez)
```js
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
```
Converte os códigos internos de liquidez em textos compreensíveis para o usuário. Assim, a análise final fica mais didática e mais próxima da forma como investidores iniciantes pensam sobre resgate e acesso ao dinheiro.

### resumirTributacaoAnalise(analise)
```js
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
```
Traduz imposto em linguagem prática. Em vez de apenas mostrar números isolados, a função resume o que o usuário realmente precisa entender sobre IR e IOF para tomar uma decisão mais consciente.

### gerarParecerInvestimento(analise, panorama)
```js
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
```
É o núcleo da nova análise aprofundada. Essa função compara o investimento com a fase financeira atual do usuário e devolve um parecer estruturado, incluindo justificativas, alertas importantes e trechos educativos sobre o funcionamento do produto.

### analisarInvestimentoConsultivo()
```js
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
```
Executa a análise final e renderiza o resultado na interface. Agora ela não se limita a um filtro simples: a função avalia o encaixe do produto dentro do momento financeiro do usuário, mostra liquidez, tributação, horizonte até vencimento, principais motivos da recomendação e alertas de risco operacional ou de resgate antecipado.

## scripts/importar_faturas.py

### executar_pdftotext(pdf_path, password)
```python
"""
Extrai texto de um PDF protegido usando o utilitário `pdftotext`.

Argumentos:
- `pdf_path`: caminho do arquivo PDF a ser lido.
- `password`: senha de abertura do PDF.

Retorno:
- `str` com o texto integral extraído do PDF.

Exceções:
- Lança `RuntimeError` quando o arquivo não existe, a senha é inválida
  ou o utilitário `pdftotext` não está disponível no sistema.
"""
```
É a porta de entrada da automação das faturas. Essa função usa um utilitário do sistema para abrir PDFs protegidos por senha e transformar o conteúdo em texto bruto, permitindo que o restante do módulo faça o parsing sem depender de bibliotecas externas.

### parse_valor(valor_str)
```python
"""
Converte um valor monetário em formato brasileiro para `float`.

Argumentos:
- `valor_str`: texto no formato `R$ 1.234,56` ou similar.

Retorno:
- `float` com o valor numérico correspondente.
"""
```
Normaliza valores extraídos do PDF para o formato numérico interno do script. Essa função evita erros com separadores brasileiros de milhar e decimal e garante consistência em todo o pipeline de importação.

### normalizar_linhas(texto)
```python
"""
Normaliza as linhas do texto extraído do PDF.

Argumentos:
- `texto`: conteúdo bruto extraído do PDF.

Retorno:
- `list[str]` com linhas limpas, sem espaços laterais e sem linhas vazias.
"""
```
Prepara o texto para análise linha a linha. Ela remove ruídos simples do OCR/texto extraído e deixa a estrutura mais previsível para os parsers de cada banco.

### inferir_banco(nome_arquivo, texto)
```python
"""
Identifica o emissor da fatura com base no nome do arquivo e no conteúdo.

Argumentos:
- `nome_arquivo`: nome do PDF.
- `texto`: texto integral extraído.

Retorno:
- `str` com `inter`, `mercado_pago` ou `desconhecido`.
"""
```
Decide automaticamente qual parser especializado deve ser usado. Como Banco Inter e Mercado Pago possuem layouts diferentes, essa função é essencial para direcionar o arquivo para a lógica correta.

### normalizar_data_inter(data_str)
```python
"""
Converte datas do Inter para o formato ISO.

Argumentos:
- `data_str`: texto como `10 de fev. 2026`.

Retorno:
- `str` no formato `AAAA-MM-DD`.
"""
```
Padroniza as datas do Banco Inter em um formato estável e processável. Isso facilita ordenação, filtragem por mês e futura consolidação dos lançamentos dentro do painel.

### inferir_data_mp(data_str, ano_referencia, mes_referencia)
```python
"""
Converte datas curtas do Mercado Pago para o formato ISO.

Argumentos:
- `data_str`: texto como `14/02`.
- `ano_referencia`: ano da fatura.
- `mes_referencia`: mês da fatura.

Retorno:
- `str` no formato `AAAA-MM-DD`, inferindo ano anterior quando o mês
  do lançamento é maior que o mês de referência da fatura.
"""
```
Resolve uma limitação comum do PDF do Mercado Pago, em que os lançamentos aparecem sem ano. A função usa a data da própria fatura como referência para reconstruir corretamente o ano do lançamento.

### competencia_por_vencimento(vencimento)
```python
"""
Converte uma data de vencimento DD/MM/AAAA em competência AAAA-MM.

Argumentos:
- `vencimento`: data de vencimento da fatura.

Retorno:
- `str` no formato `AAAA-MM`.
"""
```
Traduz a data de vencimento da fatura para a competência mensal usada no painel. Isso permite que a análise mensal do cartão reflita o mês em que a fatura será paga, em vez de usar apenas o mês de cada compra individual.

### extrair_parcela(descricao)
```python
"""
Extrai o número da parcela atual e o total de parcelas.

Argumentos:
- `descricao`: descrição do lançamento.

Retorno:
- `tuple[int | None, int | None]` com `(parcela_atual, parcela_total)`.
"""
```
Identifica compras parceladas dentro da descrição do lançamento. Esse detalhe é importante para análises futuras, porque parcelamento recorrente impacta orçamento de meses seguintes e não deve ser tratado como compra única isolada.

### limpar_descricao(descricao)
```python
"""
Normaliza a descrição do lançamento para uso no JSON final.

Argumentos:
- `descricao`: texto bruto do lançamento.

Retorno:
- `str` com espaços normalizados e sem marcadores supérfluos.
"""
```
Remove ruídos do texto bruto e deixa a descrição mais legível para revisão humana, categorização e importação posterior. Também aplica uma limpeza específica nos casos de `PIX CRED PARCELADO`, preservando o trecho útil do parcelamento e descartando sobras de texto trazidas pela quebra imperfeita do PDF.

### extrair_componentes_parcelamento(descricao)
```python
"""
Extrai principal e juros quando um parcelamento explicita essa composição.

Argumentos:
- `descricao`: descrição normalizada do lançamento.

Retorno:
- `tuple[float | None, float | None]` com `(principal, juros)` quando houver.
"""
```
Lê descrições como `Principal (R$ 95,64) + Juros (R$ 13,47)` e separa esses valores em campos específicos. Isso permite que a visualização dos gastos mostre não apenas a parcela total, mas também o peso real dos juros dentro do parcelamento.

### sugerir_categoria(descricao)
```python
"""
Sugere uma categoria de gasto a partir de palavras-chave simples.

Argumentos:
- `descricao`: descrição normalizada do lançamento.

Retorno:
- `str` com a categoria sugerida para revisão posterior.
"""
```
Aplica uma classificação inicial baseada em palavras-chave. Essa é uma etapa heurística, voltada a reduzir trabalho manual na triagem dos lançamentos, mas ainda pensada para ser revisada pelo usuário antes do uso final.

### sugerir_tipo_gasto(categoria, descricao)
```python
"""
Sugere se o gasto deve ser tratado como fixo ou variável.

Argumentos:
- `categoria`: categoria sugerida do gasto.
- `descricao`: descrição do lançamento.

Retorno:
- `str` com `fixo` ou `variavel`.
"""
```
Traduz a leitura do lançamento para a convenção usada no painel. Isso ajuda a aproximar a automação da estrutura de gastos já existente na aplicação.

### deve_incluir_como_gasto(categoria, descricao)
```python
"""
Define se um lançamento deve entrar na sugestão de gastos do painel.

Argumentos:
- `categoria`: categoria sugerida.
- `descricao`: descrição do lançamento.

Retorno:
- `bool` indicando se o item deve entrar na lista de gastos sugeridos.
"""
```
Filtra itens que não devem entrar como gasto comum, como juros, IOF, crédito parcelado ou pagamentos da fatura. Essa função é importante para evitar poluir a saída com lançamentos que distorceriam a visão real do consumo.

### extrair_resumo_inter(texto)
```python
"""
Extrai informações de resumo da fatura do Banco Inter.

Argumentos:
- `texto`: conteúdo integral extraído da fatura.

Retorno:
- `dict` com `total_fatura`, `vencimento`, `pagamento_minimo`
  e indicadores de juros quando disponíveis.
"""
```
Capta os principais indicadores financeiros da fatura do Inter, como total, vencimento, mínimo e juros do rotativo. Esses dados são úteis tanto para conferência quanto para análises de custo da dívida.

### extrair_resumo_mercado_pago(texto)
```python
"""
Extrai informações de resumo da fatura do Mercado Pago.

Argumentos:
- `texto`: conteúdo integral extraído da fatura.

Retorno:
- `dict` com `total_fatura`, `vencimento`, `pagamento_minimo`
  e indicadores de juros quando disponíveis.
"""
```
Executa a mesma função para o layout do Mercado Pago, preservando os principais números da fatura que ajudam a acompanhar risco, custo do rotativo e evolução do cartão.

### montar_lancamento(data_iso, descricao_bruta, valor, banco, cartao)
```python
"""
Monta um lançamento padronizado a partir dos dados extraídos.

Argumentos:
- `data_iso`: data normalizada no formato ISO.
- `descricao_bruta`: descrição do lançamento antes da categorização.
- `valor`: valor monetário do item.
- `banco`: origem da fatura.
- `cartao`: identificador mascarado do cartão.

Retorno:
- `dict` com os campos principais do lançamento.
"""
```
Consolida num único objeto todas as informações relevantes de um lançamento, incluindo parcela, categoria, tipo sugerido e se ele deve ou não entrar como gasto normal.

### extrair_parcelamentos_futuros_inter(texto, vencimento_fatura)
```python
"""
Extrai a lista de compras parceladas que irão compor a próxima fatura do Inter.

Argumentos:
- `texto`: conteúdo integral da fatura.
- `vencimento_fatura`: vencimento da fatura atual.

Retorno:
- `list[dict]` com os parcelamentos futuros encontrados no bloco de próxima fatura.
"""
```
Reconstrói o bloco mais delicado da fatura do Inter, onde as parcelas futuras aparecem fora da lista principal e podem vir com descrições quebradas em múltiplas linhas. A função separa itens com valor imediato dos itens cujo valor aparece apenas no quadro final, permitindo dar visibilidade ao que já está contratado para a próxima fatura sem confundir isso com gasto já ocorrido no mês atual.

### extrair_resumo_parcelamentos_inter(texto)
```python
"""
Extrai os saldos agregados de parcelamentos futuros do Inter.

Argumentos:
- `texto`: conteúdo integral da fatura.

Retorno:
- `dict` com saldos agregados de parcelamentos futuros.
"""
```
Captura os totais consolidados que o Inter informa para compras parceladas e saldo em aberto. Esses números complementam a lista de itens individuais e ajudam a conferir se a visão do painel está coerente com o valor total parcelado mostrado na própria fatura.

### construir_item_resumo_parcelamentos_mp(texto)
```python
"""
Cria um item sintético com o saldo de compras parceladas futuras do Mercado Pago.

Argumentos:
- `texto`: conteúdo integral da fatura.

Retorno:
- `list[dict]` com zero ou um item de visibilidade de parcelamentos futuros.
"""
```
No Mercado Pago, a fatura consultada informa o total agregado de compras parceladas futuras, mas não detalha cada item individual do mesmo modo que o Inter. Essa função transforma esse saldo em um item sintético apenas para visibilidade, marcado para não ser confundido com gasto corrente, preservando a noção de compromisso futuro do cartão.

### parse_inter(texto, nome_arquivo)
```python
"""
Faz o parse da fatura do Banco Inter.

Argumentos:
- `texto`: conteúdo integral da fatura.
- `nome_arquivo`: nome do arquivo de origem.

Retorno:
- `dict` com resumo e lista de lançamentos extraídos.
"""
```
Implementa a leitura específica do layout do Banco Inter. A função navega pelas seções da fatura, detecta os blocos de cartões, extrai cada lançamento e devolve uma estrutura padronizada para o restante do processo.

### parse_mercado_pago(texto, nome_arquivo)
```python
"""
Faz o parse da fatura do Mercado Pago.

Argumentos:
- `texto`: conteúdo integral da fatura.
- `nome_arquivo`: nome do arquivo de origem.

Retorno:
- `dict` com resumo e lista de lançamentos extraídos.
"""
```
Faz o mesmo trabalho para o PDF do Mercado Pago, respeitando a forma específica como o emissor apresenta as transações, cartões e datas abreviadas.

### parse_fatura(pdf_path, password)
```python
"""
Lê uma fatura, identifica o banco e delega para o parser correto.

Argumentos:
- `pdf_path`: caminho do PDF.
- `password`: senha da fatura.

Retorno:
- `dict` com os dados estruturados da fatura.
"""
```
É o coordenador da leitura individual de cada PDF. Ele faz a extração do texto, identifica a origem e escolhe o parser certo sem exigir que o usuário faça isso manualmente.

### construir_gastos_sugeridos(faturas)
```python
"""
Consolida os lançamentos marcados como gastos em um formato simplificado.

Argumentos:
- `faturas`: lista de faturas já processadas.

Retorno:
- `list[dict]` com itens voltados para revisão e futura importação.
"""
```
Transforma a extração bruta em uma lista mais próxima do modelo de gastos do painel. Essa etapa é a ponte entre o PDF bancário e o uso prático das informações no controle financeiro. Além dos itens em si, ela agora preserva também a `competenciaPagamento` e o `vencimentoFatura`, o que permite ao painel diferenciar o mês da compra do mês em que a fatura realmente vence.

### construir_resumos_fatura(faturas)
```python
"""
Consolida os dados principais de cada fatura para uso no painel mensal.

Argumentos:
- `faturas`: lista de faturas já processadas.

Retorno:
- `list[dict]` com banco, vencimento, competência e totais da fatura.
"""
```
Gera uma visão resumida de cada fatura com banco emissor, vencimento, competência de pagamento, valor total e pagamento mínimo. Esse resumo é usado pela aba `Gastos` para mostrar o total do cartão no mês com base no vencimento das faturas, alinhando a leitura do sistema ao fluxo real de pagamento do usuário.

### salvar_json(caminho, dados)
```python
"""
Salva um objeto Python em arquivo JSON formatado.

Argumentos:
- `caminho`: destino do arquivo.
- `dados`: conteúdo serializável em JSON.

Retorno:
- `None`.
"""
```
Persiste os resultados da importação em arquivos legíveis e reaproveitáveis. Isso permite revisão manual, versionamento local e futura integração com o painel.

### criar_argumentos()
```python
"""
Define e lê os argumentos da linha de comando.

Argumentos:
- Nenhum.

Retorno:
- `argparse.Namespace` com os caminhos dos PDFs, senhas e saídas.
"""
```
Configura a interface de linha de comando do script. Ela torna o módulo reutilizável mês a mês sem precisar editar código a cada nova fatura.

### main()
```python
"""
Orquestra a importação das faturas e a geração dos arquivos de saída.

Argumentos:
- Nenhum. Usa a linha de comando para receber os parâmetros.

Retorno:
- `int` com código de saída do processo.
"""
```
É o fluxo principal da automação. A função lê os parâmetros, processa as faturas, gera os arquivos JSON e entrega um resumo final da execução ao usuário.

## app.js

### initInvestimentos()
```js
/**
 * Inicializa o formulário de investimentos, incluindo cadastro, edição e atualização de cotação.
 * @returns {void}
 */
```
Conecta o formulário principal da aba `Investimentos` ao fluxo de criação e edição. A função lê os campos do formulário, decide se o envio representa um novo ativo ou a atualização de um ativo existente, controla o estado visual do modo de edição e preserva o comportamento de presets e cotação automática por ticker.

### renderizarInvestimentos()
```js
/**
 * Renderiza a lista de investimentos cadastrados com ações de editar, analisar e excluir.
 * @returns {void}
 */
```
Atualiza a listagem visual dos ativos cadastrados e associa os botões de ação a cada item. Além de exibir a composição da carteira, essa função agora oferece um botão `Editar`, permitindo reaproveitar o formulário da própria aba para alterar um investimento já salvo sem precisar excluir e recriar o item.

### preencherFormularioInvestimentoEdicao(investimento)
```js
/**
 * Preenche o formulário da aba de investimentos com os dados de um item existente para edição.
 * @param {Object} investimento
 * @returns {void}
 */
```
Coloca o formulário em modo de edição a partir do investimento selecionado na lista. A função replica os dados atuais do ativo nos campos correspondentes, ajusta a visibilidade dos campos dependentes do tipo, troca o texto do botão principal para `Salvar alterações` e mantém a navegação posicionada na aba `Investimentos`.

### classificarGrupoGasto(gasto)
```js
/**
 * Classifica um gasto para a visualização consolidada da aba de gastos.
 * @param {Object} gasto
 * @returns {string}
 */
```
Organiza cada gasto em grupos visuais como contas da casa, impostos, assinaturas, variáveis e fixos. Essa classificação permite transformar a aba `Gastos` em um painel centralizado de saídas, em vez de apenas uma lista simples de lançamentos.

### construirItensCartaoParaGastos(cartoes)
```js
/**
 * Constrói itens de resumo dos cartões para exibição na aba de gastos.
 * @param {Array} cartoes
 * @returns {Array}
 */
```
Converte os cartões cadastrados em itens visuais de gasto planejado mensal. A função foi criada para concentrar a leitura das faturas dentro da aba `Gastos`, mesmo que o cadastro detalhado continue existindo na aba própria de cartão.

### construirItemFinanciamentoParaGastos(financiamento)
```js
/**
 * Constrói um item de resumo do financiamento para a aba de gastos.
 * @param {Object|null} financiamento
 * @returns {Array}
 */
```
Leva o financiamento imobiliário para a visão consolidada de gastos. Assim, a aba principal de saídas passa a incluir também a parcela do imóvel, saldo devedor, prazo restante e juros, sem obrigar o usuário a trocar de seção apenas para ver o impacto mensal.

### calcularTotalFaturasPorCompetencia(competencia, faturasResumo)
```js
/**
 * Soma o total das faturas que vencem em uma competência mensal.
 * @param {string} competencia
 * @param {Array} faturasResumo
 * @returns {number}
 */
```
Consolida o valor total do cartão de crédito por mês de vencimento. Essa função é fundamental para evitar a leitura distorcida que aconteceria se o painel usasse apenas o mês da compra em vez do mês em que a fatura precisa ser paga.

### renderizarResumoFaturasDoMes(competencia)
```js
/**
 * Exibe no painel de gastos o resumo das faturas que vencem no mês selecionado.
 * @param {string} competencia
 * @returns {void}
 */
```
Renderiza o total do cartão no mês e a quebra por emissor, com vencimento e pagamento mínimo de cada fatura. O objetivo é fazer a aba `Gastos` conversar diretamente com a rotina mensal de pagamento do usuário, mostrando Inter e Mercado Pago no mês certo.

### renderizarResumoSuperiorGastos(competencia)
```js
/**
 * Atualiza o resumo superior da aba de gastos com base no mês selecionado.
 * @param {string} competencia
 * @returns {void}
 */
```
Renderiza no topo da aba `Gastos` o total do cartão no mês, a abertura por banco, o total geral mensal e os principais blocos fora do cartão. A função usa a mesma competência selecionada no carrossel para evitar divergência entre o topo da tela e o restante da análise mensal.

### renderizarGrupoGastos(titulo, gastos)
```js
/**
 * Renderiza um grupo visual de gastos por categoria de exibição.
 * @param {string} titulo
 * @param {Array} gastos
 * @returns {string}
 */
```
Agrupa a listagem da aba de gastos em blocos separados, como parcelamentos, gastos variáveis e gastos fixos. Isso melhora a leitura dos dados importados das faturas e evita que tudo apareça em uma única sequência sem contexto.

### renderizarItemGasto(gasto)
```js
/**
 * Renderiza um item individual de gasto com seus metadados extras.
 * @param {Object} gasto
 * @returns {string}
 */
```
Mostra um gasto individual com mais informações do que antes, incluindo categoria sugerida, data da compra, origem da fatura, cartão e status de parcelamento. A função foi criada para tornar visíveis os detalhes que antes eram importados, mas ficavam escondidos na interface. Agora ela também diferencia visualmente itens `fixos`, `pontuais` e `parcelamentos` e exibe `principal` e `juros` quando a fatura oferece esse detalhamento.

### obterValorConsideradoGasto(gasto)
```js
/**
 * Retorna o valor efetivo que deve entrar nas contas do painel para um gasto.
 * @param {Object} gasto
 * @returns {number}
 */
```
Padroniza a leitura monetária de um gasto para os cálculos do carrossel mensal. Quando existe faixa de valor mínimo e máximo, a função usa a média como aproximação do impacto mensal. Isso evita espalhar a mesma regra em vários pontos da interface e mantém consistência entre resumo, gráfico e comparação mensal.

### obterCompetenciaGasto(gasto)
```js
/**
 * Descobre em qual competência mensal um gasto deve ser consolidado.
 * @param {Object} gasto
 * @returns {string}
 */
```
Define a qual mês cada lançamento pertence. Primeiro usa a competência salva explicitamente, depois tenta derivar o mês da `dataCompra` e, se nada existir, assume o mês atual. Essa regra é essencial para juntar gastos manuais, gastos importados e itens antigos em uma única linha do tempo coerente.

### criarResumoMensalVazio(competencia)
```js
/**
 * Cria a estrutura base usada para consolidar um mês no carrossel de gastos.
 * @param {string} competencia
 * @returns {Object}
 */
```
Inicializa um contêiner mensal com total, fixos, variáveis, cartão, financiamento, parcelamentos e categorias. A ideia é facilitar a agregação progressiva dos lançamentos sem precisar testar várias vezes se um mês já existe.

### adicionarValorCategoriaMensal(resumo, categoria, valor)
```js
/**
 * Soma um valor a uma categoria do resumo mensal e atualiza o total do mês.
 * @param {Object} resumo
 * @param {string} categoria
 * @param {number} valor
 * @returns {void}
 */
```
É a peça de baixo nível que mantém os totais do carrossel sincronizados. Sempre que um gasto é classificado, essa função atualiza ao mesmo tempo o total do mês e a fatia da categoria correspondente, preparando os dados tanto para os KPIs quanto para o gráfico de composição.

### gerarHistoricoMensalGastos(gastos, faturasResumo, financiamentoResumo)
```js
/**
 * Consolida a linha do tempo mensal dos gastos para a visão em carrossel.
 * @param {Array} gastos
 * @param {Array} faturasResumo
 * @param {Array} financiamentoResumo
 * @returns {Array}
 */
```
Monta a base analítica da nova experiência mensal da aba `Gastos`. A função junta gastos fora do cartão, ignora itens de pura visibilidade que ainda não representam gasto realizado, aproveita dados mensais informados manualmente quando não há granularidade e passa a usar o resumo das faturas pelo mês de vencimento para representar o cartão de crédito. O resultado é um histórico ordenado, pronto para comparação mês contra mês sem misturar mês de compra com mês de pagamento.

### formatarMesCompetencia(competencia)
```js
/**
 * Converte uma competência AAAA-MM para um rótulo legível em português.
 * @param {string} competencia
 * @returns {string}
 */
```
Transforma chaves técnicas como `2026-03` em textos amigáveis como `março de 2026`. Isso melhora a leitura do carrossel e evita expor formatos internos diretamente para o usuário.

### resumirVariacaoMensal(atual, anterior)
```js
/**
 * Resume se o mês atual ficou acima, abaixo ou igual ao mês anterior.
 * @param {Object} atual
 * @param {Object|null} anterior
 * @returns {{texto: string, classe: string}}
 */
```
Produz a mensagem que informa se o gasto do mês selecionado ficou superior ou inferior ao mês anterior e em que magnitude. Essa leitura é o centro do pedido de comparação mensal, porque traduz a variação numérica em um diagnóstico direto para o usuário.

### renderizarCarrosselGastosMensais(gastos, faturasResumo, financiamentoResumo)
```js
/**
 * Atualiza a estrutura do carrossel mensal da aba de gastos.
 * @param {Array} gastos
 * @param {Array} faturasResumo
 * @param {Array} financiamentoResumo
 * @returns {void}
 */
```
É a função de orquestração da nova área mensal. Ela recalcula a linha do tempo, decide qual mês deve abrir como foco inicial, preserva o estado de navegação quando possível e repassa os dados para os indicadores, o resumo das faturas do mês e os gráficos.

### navegarCarrosselGastos(direcao)
```js
/**
 * Move a seleção do carrossel para o mês anterior ou seguinte.
 * @param {number} direcao
 * @returns {void}
 */
```
Controla os botões `Anterior` e `Próximo` da visão mensal. Ao alterar o índice do mês selecionado, dispara a atualização dos KPIs e dos gráficos sem precisar recalcular toda a página manualmente.

### atualizarSlideCarrosselGastos()
```js
/**
 * Renderiza o mês atualmente selecionado no carrossel de gastos.
 * @returns {void}
 */
```
Atualiza o título do mês, a mensagem contextual, o estado dos botões de navegação, os cards de resumo e os gráficos ligados à evolução. Na prática, é a função que materializa no DOM a troca de um mês para outro.

### criarCardKpiGasto(label, valor, variacaoTexto, classe)
```js
/**
 * Gera o HTML de um card resumido do carrossel mensal de gastos.
 * @param {string} label
 * @param {string} valor
 * @param {string} variacaoTexto
 * @param {string} classe
 * @returns {string}
 */
```
Padroniza a aparência dos indicadores de total, fixos, variáveis e compromissos do mês. Isso simplifica a renderização e garante consistência visual entre as mensagens de gasto superior, inferior ou estável.

### renderizarStatusImportacao(resultado, origem)
```js
/**
 * Exibe o resultado visual da importação no painel de configurações.
 * @param {Object} resultado
 * @param {string} origem
 * @returns {void}
 */
```
Mostra ao usuário o resultado da importação diretamente na interface de configurações. A função diferencia backup completo de importação de faturas e apresenta quantos gastos foram adicionados, ignorados ou simplesmente carregados do arquivo.

## charts.js

### formatarMoedaCompacta(valor)
```js
/**
 * Formata um valor monetário de forma compacta para os tooltips e eixos dos gráficos.
 * @param {number} valor
 * @returns {string}
 */
```
Cria uma versão mais enxuta da formatação monetária para uso em gráficos, onde o espaço é menor do que nas listas e cards. Ela ajuda a manter legibilidade nos eixos e nas dicas visuais do carrossel mensal.

### atualizarGraficoCarrosselGastos(meses, indiceSelecionado)
```js
/**
 * Atualiza os dois gráficos ligados ao carrossel mensal de gastos.
 * @param {Array} meses
 * @param {number} indiceSelecionado
 * @returns {void}
 */
```
Serve como coordenador visual do carrossel. Recebe a linha do tempo mensal consolidada e repassa os dados para o gráfico de composição do mês e para o gráfico de evolução mês a mês, mantendo os dois sincronizados com a navegação do usuário.

### atualizarGraficoDetalheMesGastos(meses, indiceSelecionado)
```js
/**
 * Renderiza o gráfico de composição do mês atualmente selecionado.
 * @param {Array} meses
 * @param {number} indiceSelecionado
 * @returns {void}
 */
```
Transforma as categorias do mês em um gráfico de rosca. O objetivo é mostrar rapidamente onde o dinheiro daquele mês foi consumido e quais grupos puxaram o total para cima ou para baixo.

### atualizarGraficoLinhaEvolucaoGastos(meses, indiceSelecionado)
```js
/**
 * Renderiza o gráfico de evolução dos gastos na linha do tempo mensal.
 * @param {Array} meses
 * @param {number} indiceSelecionado
 * @returns {void}
 */
```
Desenha a trajetória do gasto total ao longo dos meses e destaca o mês selecionado no carrossel. Isso permite enxergar a tendência geral e, ao mesmo tempo, saber exatamente onde o mês atual se posiciona em relação aos anteriores.
