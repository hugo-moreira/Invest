# Painel Finanças 2026

Painel web para controle de gastos e investimentos em 2026. Hospedado no GitHub Pages.

## Funcionalidades

- **Gastos**: Fixos e variáveis (Academia, Spotify, Luz/Água, etc.)
- **Cartão de crédito**: Limite, saldo devedor, parcelamento
- **Financiamento imobiliário**: Dados do contrato, simulador de quitação com FGTS e amortização extra
- **Investimentos**: Ações, FIIs, ETFs, renda fixa, previdência, cofrinhos (cotações via brapi.dev)
- **Gráficos**: Pizza e barras para gastos e investimentos
- **Metas e projeções**: Simulador de rentabilidade, alocação sugerida
- **Exportar/Importar**: Backup em JSON

## Configuração

1. Clone ou faça fork do repositório
2. Em **Configurações** no painel, insira sua chave API da [brapi.dev](https://brapi.dev) (gratuita) para cotações de ações e FIIs
3. Para carregar dados iniciais: use **Importar JSON** e selecione o arquivo `data/dados-inicial.json`

## Deploy no GitHub Pages

O `index.html` deve estar na **raiz** do repositório para evitar 404.

1. No terminal, dentro da pasta do projeto:
   ```bash
   cd "/home/hugo_moreira/Documentos/Planejamento 2026/Investimentos"
   git init
   git add .
   git commit -m "Painel Finanças 2026"
   git branch -M main
   git remote add origin git@github.com:hugo-moreira/Invest.git
   git push -u origin main
   ```

2. Em **Settings > Pages** do repositório:
   - Source: **Deploy from a branch**
   - Branch: **main** (ou master)
   - Folder: **/ (root)**
   - Save

3. Aguarde 1-2 minutos. URL: `https://hugo-moreira.github.io/Invest/`

Se o repositório já existir com conteúdo, faça pull primeiro ou force push:
```bash
git pull origin main --allow-unrelated-histories
# ou, se o repo estiver vazio/errado:
git push -u origin main --force
```

## Dados

Os dados ficam no `localStorage` do navegador. Use **Exportar JSON** para backup. Não commite arquivos com dados reais.

## Privacidade

- Chave API e dados financeiros ficam apenas no seu navegador
- Nenhum dado é enviado a servidores externos, exceto a API de cotações (brapi.dev) quando você usa "Atualizar cotação"
