# Documentação das Funções - Painel Finanças 2026

## data.js

### getGastos()
Retorna todos os gastos do localStorage.
- **Retorno:** `Array<{id, descricao, valor, valorMax?, tipo}>`

### saveGastos(gastos)
Salva o array de gastos no localStorage.
- **Argumentos:** `gastos` (Array)

### addGasto(gasto)
Adiciona um novo gasto.
- **Argumentos:** `gasto` - `{ descricao, valor, valorMax?, tipo }`
- **Retorno:** Objeto do gasto com id

### updateGasto(id, dados)
Atualiza um gasto existente.
- **Argumentos:** `id` (string), `dados` (objeto parcial)

### removeGasto(id)
Remove um gasto pelo id.

### getCartoes() / saveCartoes(cartoes) / saveCartao(cartao) / removeCartao(id)
CRUD de cartões de crédito.

### getFinanciamento() / saveFinanciamento(fin)
Leitura e gravação dos dados do financiamento imobiliário.

### getInvestimentos() / saveInvestimentos(inv) / addInvestimento(inv) / updateInvestimento(id, dados) / removeInvestimento(id)
CRUD de investimentos.

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

### importarDados(json)
Importa dados de uma string JSON.
- **Argumentos:** `json` (string)
- **Retorno:** boolean (sucesso)

## api-cotacoes.js

### buscarCotacao(ticker)
Busca cotação de ação/FII na brapi.dev.
- **Argumentos:** `ticker` (string, ex: PETR4)
- **Retorno:** `Promise<number|null>` - valor ou null

## financiamento.js

### simularQuitacao()
Calcula a projeção de quitação com amortização extra e FGTS. Atualiza o resultado e o gráfico.

### atualizarFormFinanciamento()
Preenche o formulário com os dados salvos do financiamento.

## projecoes.js

### projetarRentabilidade()
Calcula a projeção de patrimônio com juros compostos e aportes mensais. Atualiza resultado e gráfico.
