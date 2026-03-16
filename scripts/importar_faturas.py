#!/usr/bin/env python3
"""
Importador de faturas PDF para o Painel Finanças 2026.

Lê faturas protegidas por senha do Banco Inter e do Mercado Pago,
extrai os lançamentos principais e gera arquivos JSON para revisão
e eventual importação no painel.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
from datetime import datetime
from pathlib import Path


MESES_PT = {
    "jan": 1,
    "fev": 2,
    "mar": 3,
    "abr": 4,
    "mai": 5,
    "jun": 6,
    "jul": 7,
    "ago": 8,
    "set": 9,
    "out": 10,
    "nov": 11,
    "dez": 12,
}

RE_DATA_INTER = re.compile(r"^\d{2} de [a-z]{3}\. \d{4}$", re.IGNORECASE)
RE_DATA_MP = re.compile(r"^\d{2}/\d{2}$")
RE_VALOR = re.compile(r"^[+-]?\s*R\$\s*([\d\.\,]+)$")
RE_PARCELA = re.compile(r"Parcela\s+(\d+)\s+de\s+(\d+)", re.IGNORECASE)
RE_COMPONENTES_PARCELA = re.compile(
    r"Principal\s*\(R\$\s*([\d\.\,]+)\)\s*\+\s*Juros\s*\(R\$\s*([\d\.\,]+)\)",
    re.IGNORECASE,
)


def executar_pdftotext(pdf_path: Path, password: str) -> str:
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
    if not pdf_path.exists():
        raise RuntimeError(f"Arquivo não encontrado: {pdf_path}")

    comando = ["pdftotext", "-upw", password, str(pdf_path), "-"]
    try:
        resultado = subprocess.run(
            comando,
            check=True,
            capture_output=True,
            text=True,
        )
    except FileNotFoundError as exc:
        raise RuntimeError("O utilitário `pdftotext` não está instalado no sistema.") from exc
    except subprocess.CalledProcessError as exc:
        stderr = (exc.stderr or "").strip() or "erro desconhecido"
        raise RuntimeError(f"Falha ao ler PDF {pdf_path.name}: {stderr}") from exc

    return resultado.stdout.replace("\f", "\n")


def parse_valor(valor_str: str) -> float:
    """
    Converte um valor monetário em formato brasileiro para `float`.

    Argumentos:
    - `valor_str`: texto no formato `R$ 1.234,56` ou similar.

    Retorno:
    - `float` com o valor numérico correspondente.
    """
    apenas_numero = valor_str.replace("R$", "").replace(".", "").replace(",", ".").strip()
    apenas_numero = apenas_numero.replace("+", "").strip()
    return float(apenas_numero or 0)


def normalizar_linhas(texto: str) -> list[str]:
    """
    Normaliza as linhas do texto extraído do PDF.

    Argumentos:
    - `texto`: conteúdo bruto extraído do PDF.

    Retorno:
    - `list[str]` com linhas limpas, sem espaços laterais e sem linhas vazias.
    """
    return [linha.strip() for linha in texto.splitlines() if linha.strip()]


def inferir_banco(nome_arquivo: str, texto: str) -> str:
    """
    Identifica o emissor da fatura com base no nome do arquivo e no conteúdo.

    Argumentos:
    - `nome_arquivo`: nome do PDF.
    - `texto`: texto integral extraído.

    Retorno:
    - `str` com `inter`, `mercado_pago` ou `desconhecido`.
    """
    nome = nome_arquivo.lower()
    texto_lower = texto.lower()
    if "mercado pago" in texto_lower or "_mp_" in nome or "fatura_mp" in nome:
        return "mercado_pago"
    if "banco inter" in texto_lower or "inter" in texto_lower:
        return "inter"
    return "desconhecido"


def normalizar_data_inter(data_str: str) -> str:
    """
    Converte datas do Inter para o formato ISO.

    Argumentos:
    - `data_str`: texto como `10 de fev. 2026`.

    Retorno:
    - `str` no formato `AAAA-MM-DD`.
    """
    partes = data_str.lower().replace(".", "").split()
    dia = int(partes[0])
    mes = MESES_PT[partes[2]]
    ano = int(partes[3])
    return f"{ano:04d}-{mes:02d}-{dia:02d}"


def inferir_data_mp(data_str: str, ano_referencia: int, mes_referencia: int) -> str:
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
    dia, mes = [int(parte) for parte in data_str.split("/")]
    ano = ano_referencia - 1 if mes > mes_referencia else ano_referencia
    return f"{ano:04d}-{mes:02d}-{dia:02d}"


def competencia_por_vencimento(vencimento: str) -> str:
    """
    Converte uma data de vencimento DD/MM/AAAA em competência AAAA-MM.

    Argumentos:
    - `vencimento`: data de vencimento da fatura.

    Retorno:
    - `str` no formato `AAAA-MM`.
    """
    if not vencimento:
        return ""
    dia, mes, ano = vencimento.split("/")
    _ = dia
    return f"{ano}-{mes}"


def extrair_parcela(descricao: str) -> tuple[int | None, int | None]:
    """
    Extrai o número da parcela atual e o total de parcelas.

    Argumentos:
    - `descricao`: descrição do lançamento.

    Retorno:
    - `tuple[int | None, int | None]` com `(parcela_atual, parcela_total)`.
    """
    match = RE_PARCELA.search(descricao)
    if not match:
        return None, None
    return int(match.group(1)), int(match.group(2))


def limpar_descricao(descricao: str) -> str:
    """
    Normaliza a descrição do lançamento para uso no JSON final.

    Argumentos:
    - `descricao`: texto bruto do lançamento.

    Retorno:
    - `str` com espaços normalizados e sem marcadores supérfluos.
    """
    descricao = re.sub(r"\s+", " ", descricao).strip(" -")
    componentes = RE_COMPONENTES_PARCELA.search(descricao)
    if componentes:
        descricao = descricao[:componentes.end()].strip(" -")
    elif descricao.lower().startswith("pix cred parcelado"):
        descricao = re.sub(r"^(PIX CRED PARCELADO\s*\(Parcela\s+\d+\s+de\s+\d+\)).*$", r"\1", descricao, flags=re.IGNORECASE)
    return descricao


def extrair_componentes_parcelamento(descricao: str) -> tuple[float | None, float | None]:
    """
    Extrai principal e juros quando um parcelamento explicita essa composição.

    Argumentos:
    - `descricao`: descrição normalizada do lançamento.

    Retorno:
    - `tuple[float | None, float | None]` com `(principal, juros)` quando houver.
    """
    match = RE_COMPONENTES_PARCELA.search(descricao)
    if not match:
        return None, None
    return parse_valor(match.group(1)), parse_valor(match.group(2))


def sugerir_categoria(descricao: str) -> str:
    """
    Sugere uma categoria de gasto a partir de palavras-chave simples.

    Argumentos:
    - `descricao`: descrição normalizada do lançamento.

    Retorno:
    - `str` com a categoria sugerida para revisão posterior.
    """
    desc = descricao.lower()
    regras = [
        ("spotify", "assinaturas"),
        ("google one", "assinaturas"),
        ("cursor", "assinaturas"),
        ("agilecode", "assinaturas"),
        ("mercado livre", "compras online"),
        ("mercadolivre", "compras online"),
        ("amazon", "compras online"),
        ("restaurante", "alimentacao"),
        ("hamburg", "alimentacao"),
        ("super nosso", "mercado"),
        ("mercearia", "mercado"),
        ("frutos de goias", "alimentacao"),
        ("posto", "transporte"),
        ("drogaria", "saude"),
        ("unic intercel", "recarga_celular"),
        ("recarga", "recarga_celular"),
        ("pix cred parcelado", "parcelamento_credito"),
        ("pix cred", "credito"),
        ("iof", "impostos"),
        ("juros", "juros"),
        ("pousada", "viagem"),
        ("bagaggio", "compras pessoais"),
    ]
    for termo, categoria in regras:
        if termo in desc:
            return categoria
    return "outros"


def sugerir_tipo_gasto(categoria: str, descricao: str) -> str:
    """
    Sugere se o gasto deve ser tratado como fixo ou variável.

    Argumentos:
    - `categoria`: categoria sugerida do gasto.
    - `descricao`: descrição do lançamento.

    Retorno:
    - `str` com `fixo` ou `variavel`.
    """
    desc = descricao.lower()
    if categoria in {"assinaturas", "recarga_celular", "parcelamento_credito"} or "parcela" in desc:
        return "fixo"
    return "variavel"


def deve_incluir_como_gasto(categoria: str, descricao: str) -> bool:
    """
    Define se um lançamento deve entrar na sugestão de gastos do painel.

    Argumentos:
    - `categoria`: categoria sugerida.
    - `descricao`: descrição do lançamento.

    Retorno:
    - `bool` indicando se o item deve entrar na lista de gastos sugeridos.
    """
    desc = descricao.lower()
    termos_excluir = ["pagamento da fatura", "pagamento on line"]
    if categoria in {"juros", "impostos"}:
        return False
    if categoria == "credito" and "parcela" not in desc:
        return False
    return not any(termo in desc for termo in termos_excluir)


def extrair_resumo_inter(texto: str) -> dict:
    """
    Extrai informações de resumo da fatura do Banco Inter.

    Argumentos:
    - `texto`: conteúdo integral extraído da fatura.

    Retorno:
    - `dict` com `total_fatura`, `vencimento`, `pagamento_minimo`
      e indicadores de juros quando disponíveis.
    """
    total_fatura = re.search(r"Descritivo detalhado.*?Fatura atual\s+R\$ ([\d\.\,]+)", texto, re.S)
    if not total_fatura:
        total_fatura = re.search(r"FATURA ATUAL\s+R\$ [\d\.\,]+\s+R\$ [\d\.\,]+\s+R\$ ([\d\.\,]+)", texto, re.S)
    total_fatura_valor = parse_valor(total_fatura.group(1)) if total_fatura else 0
    vencimento = re.search(r"Data de Vencimento\s+(\d{2}/\d{2}/\d{4})", texto)
    pagamento_minimo = re.search(r"Pagamento mínimo:\s*R\$ ([\d\.\,]+)", texto)
    rotativo = re.search(r"Encargos rotativos\s+([\d\.\,]+)% am", texto)
    return {
        "total_fatura": total_fatura_valor,
        "vencimento": vencimento.group(1) if vencimento else "",
        "pagamento_minimo": parse_valor(pagamento_minimo.group(1)) if pagamento_minimo else 0,
        "juros_rotativo_am": float(rotativo.group(1).replace(",", ".")) if rotativo else 0,
    }


def extrair_resumo_mercado_pago(texto: str) -> dict:
    """
    Extrai informações de resumo da fatura do Mercado Pago.

    Argumentos:
    - `texto`: conteúdo integral extraído da fatura.

    Retorno:
    - `dict` com `total_fatura`, `vencimento`, `pagamento_minimo`
      e indicadores de juros quando disponíveis.
    """
    linhas = normalizar_linhas(texto)
    total_fatura = re.search(r"Total a pagar\s+Vence em.*?R\$ ([\d\.\,]+)\s+(\d{2}/\d{2}/\d{4})", texto, re.S)
    pagamento_minimo_valor = 0
    for indice, linha in enumerate(linhas):
        if linha != "Pagamento mínimo":
            continue
        janela = linhas[indice + 1:indice + 5]
        candidatos = [linha_janela for linha_janela in janela if RE_VALOR.match(linha_janela)]
        if candidatos:
            pagamento_minimo_valor = parse_valor(RE_VALOR.match(candidatos[-1]).group(1))
            break
    rotativo = re.search(r"Juros do rotativo\s+([\d\.\,]+)% a\.m\.", texto)
    return {
        "total_fatura": parse_valor(total_fatura.group(1)) if total_fatura else 0,
        "vencimento": total_fatura.group(2) if total_fatura else "",
        "pagamento_minimo": pagamento_minimo_valor,
        "juros_rotativo_am": float(rotativo.group(1).replace(",", ".")) if rotativo else 0,
    }


def montar_lancamento(data_iso: str, descricao_bruta: str, valor: float, banco: str, cartao: str) -> dict:
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
    descricao = limpar_descricao(descricao_bruta)
    parcela_atual, parcela_total = extrair_parcela(descricao)
    principal_parcela, juros_parcela = extrair_componentes_parcelamento(descricao)
    categoria = sugerir_categoria(descricao)
    return {
        "data": data_iso,
        "descricao": descricao,
        "valor": round(valor, 2),
        "cartao": cartao,
        "origem": banco,
        "categoria_sugerida": categoria,
        "tipo_sugerido": sugerir_tipo_gasto(categoria, descricao),
        "parcela_atual": parcela_atual,
        "parcela_total": parcela_total,
        "principal_parcela": principal_parcela,
        "juros_parcela": juros_parcela,
        "incluir_como_gasto": deve_incluir_como_gasto(categoria, descricao),
    }


def extrair_parcelamentos_futuros_inter(texto: str, vencimento_fatura: str) -> list[dict]:
    """
    Extrai a lista de compras parceladas que irão compor a próxima fatura do Inter.

    Argumentos:
    - `texto`: conteúdo integral da fatura.
    - `vencimento_fatura`: vencimento da fatura atual.

    Retorno:
    - `list[dict]` com os parcelamentos futuros encontrados no bloco de próxima fatura.
    """
    linhas = normalizar_linhas(texto)
    if "Próxima fatura" not in linhas:
        return []

    inicio = linhas.index("Próxima fatura")
    descricoes = []
    valores = []
    parcelamentos = []
    lendo_descricoes = False
    lendo_valores = False
    descricao_atual = ""
    pares_diretos = []

    for linha in linhas[inicio:]:
        if linha.startswith("Saldo total de compras parceladas"):
            break

        if linha == "Valor":
            if descricao_atual:
                descricoes.append(limpar_descricao(descricao_atual))
                descricao_atual = ""
            lendo_valores = True
            continue

        if "(Parcela" in linha and not lendo_valores:
            lendo_descricoes = True
            if descricao_atual:
                descricoes.append(limpar_descricao(descricao_atual))
            descricao_atual = linha
            continue

        if lendo_descricoes and descricao_atual and ")" not in descricao_atual:
            descricao_atual = f"{descricao_atual} {linha}"
            continue

        if lendo_descricoes and not lendo_valores:
            valor_match = RE_VALOR.match(linha)
            if valor_match and descricao_atual and not descricoes:
                pares_diretos.append((limpar_descricao(descricao_atual), round(parse_valor(valor_match.group(1)), 2)))
                descricao_atual = ""
                continue

        if lendo_valores:
            valor_match = RE_VALOR.match(linha)
            if valor_match:
                valores.append(round(parse_valor(valor_match.group(1)), 2))

    for descricao, valor in [*pares_diretos, *zip(descricoes, valores)]:
        parcela_atual, parcela_total = extrair_parcela(descricao)
        categoria = sugerir_categoria(descricao)
        parcelamentos.append({
            "data": "",
            "descricao": descricao,
            "valor": valor,
            "cartao": "proxima_fatura_inter",
            "origem": "inter",
            "categoria_sugerida": categoria,
            "tipo_sugerido": "fixo",
            "parcela_atual": parcela_atual,
            "parcela_total": parcela_total,
            "incluir_como_gasto": True,
            "status_parcelamento": "proxima_fatura",
            "apenas_visibilidade": True,
            "observacao_parcelamento": f"Projetado para a próxima fatura após {vencimento_fatura}",
        })

    return parcelamentos


def extrair_resumo_parcelamentos_inter(texto: str) -> dict:
    """
    Extrai os saldos agregados de parcelamentos futuros do Inter.

    Argumentos:
    - `texto`: conteúdo integral da fatura.

    Retorno:
    - `dict` com saldos agregados de parcelamentos futuros.
    """
    saldo_total = re.search(r"Saldo total de compras parceladas\s+R\$ ([\d\.\,]+)", texto)
    saldo_demais = re.search(r"Saldo demais compras parceladas\s+R\$ ([\d\.\,]+)", texto)
    saldo_aberto = re.search(r"Saldo em aberto total\s+R\$ ([\d\.\,]+)", texto)
    return {
        "saldo_total_compras_parceladas": parse_valor(saldo_total.group(1)) if saldo_total else 0,
        "saldo_demais_compras_parceladas": parse_valor(saldo_demais.group(1)) if saldo_demais else 0,
        "saldo_em_aberto_total": parse_valor(saldo_aberto.group(1)) if saldo_aberto else 0,
    }


def construir_item_resumo_parcelamentos_mp(texto: str) -> list[dict]:
    """
    Cria um item sintético com o saldo de compras parceladas futuras do Mercado Pago.

    Argumentos:
    - `texto`: conteúdo integral da fatura.

    Retorno:
    - `list[dict]` com zero ou um item de visibilidade de parcelamentos futuros.
    """
    compras_parceladas = re.search(r"Compras parceladas\s+R\$ ([\d\.\,]+)", texto)
    if not compras_parceladas:
        return []

    valor = parse_valor(compras_parceladas.group(1))
    if valor <= 0:
        return []

    return [{
        "data": "",
        "descricao": "Saldo de compras parceladas futuras",
        "valor": round(valor, 2),
        "cartao": "mercado_pago",
        "origem": "mercado_pago",
        "categoria_sugerida": "parcelamentos_futuros",
        "tipo_sugerido": "fixo",
        "parcela_atual": None,
        "parcela_total": None,
        "incluir_como_gasto": True,
        "status_parcelamento": "saldo_futuro",
        "apenas_visibilidade": True,
        "observacao_parcelamento": "Saldo agregado de compras parceladas informado pelo Mercado Pago",
    }]


def parse_inter(texto: str, nome_arquivo: str) -> dict:
    """
    Faz o parse da fatura do Banco Inter.

    Argumentos:
    - `texto`: conteúdo integral da fatura.
    - `nome_arquivo`: nome do arquivo de origem.

    Retorno:
    - `dict` com resumo e lista de lançamentos extraídos.
    """
    linhas = normalizar_linhas(texto)
    resumo = extrair_resumo_inter(texto)
    lancamentos = []
    cartao_atual = ""
    data_atual = ""
    buffer_descricao = []

    for linha in linhas:
        if linha.startswith("Próxima fatura"):
            break

        if linha.startswith("CARTÃO "):
            cartao_atual = linha.replace("CARTÃO ", "").strip()
            data_atual = ""
            buffer_descricao = []
            continue

        if linha.startswith("Total CARTÃO"):
            data_atual = ""
            buffer_descricao = []
            continue

        if RE_DATA_INTER.match(linha):
            data_atual = normalizar_data_inter(linha)
            buffer_descricao = []
            continue

        valor_match = RE_VALOR.match(linha)
        if data_atual and valor_match:
            valor = parse_valor(valor_match.group(1))
            lancamentos.append(
                montar_lancamento(
                    data_iso=data_atual,
                    descricao_bruta=" ".join(buffer_descricao),
                    valor=valor,
                    banco="inter",
                    cartao=cartao_atual,
                )
            )
            data_atual = ""
            buffer_descricao = []
            continue

        if data_atual and linha not in {"Data", "Movimentação", "Beneficiário", "Valor", "-"}:
            buffer_descricao.append(linha)

    parcelamentos_futuros = extrair_parcelamentos_futuros_inter(texto, resumo.get("vencimento", ""))
    resumo_parcelamentos = extrair_resumo_parcelamentos_inter(texto)

    return {
        "arquivo": nome_arquivo,
        "banco": "inter",
        "resumo": {**resumo, **resumo_parcelamentos},
        "lancamentos": lancamentos,
        "parcelamentosFuturos": parcelamentos_futuros,
    }


def parse_mercado_pago(texto: str, nome_arquivo: str) -> dict:
    """
    Faz o parse da fatura do Mercado Pago.

    Argumentos:
    - `texto`: conteúdo integral da fatura.
    - `nome_arquivo`: nome do arquivo de origem.

    Retorno:
    - `dict` com resumo e lista de lançamentos extraídos.
    """
    linhas = normalizar_linhas(texto)
    resumo = extrair_resumo_mercado_pago(texto)
    emitido_em = re.search(r"Emitido em:\s*(\d{2}/\d{2}/\d{4})", texto)
    if emitido_em:
        dia, mes, ano = [int(parte) for parte in emitido_em.group(1).split("/")]
    else:
        hoje = datetime.today()
        dia, mes, ano = hoje.day, hoje.month, hoje.year

    _ = dia
    lancamentos = []
    cartao_atual = ""
    data_atual = ""
    buffer_descricao = []
    dentro_cartao = False

    for linha in linhas:
        if linha.startswith("Parcele a fatura do seu Cartão de Crédito Mercado Pago"):
            break

        if linha.startswith("Cartão Visa ["):
            cartao_atual = linha.replace("Cartão Visa", "").strip()
            dentro_cartao = True
            data_atual = ""
            buffer_descricao = []
            continue

        if not dentro_cartao:
            continue

        if linha == "Total":
            data_atual = ""
            buffer_descricao = []
            continue

        if RE_DATA_MP.match(linha):
            data_atual = inferir_data_mp(linha, ano_referencia=ano, mes_referencia=mes)
            buffer_descricao = []
            continue

        valor_match = RE_VALOR.match(linha)
        if data_atual and valor_match:
            valor = parse_valor(valor_match.group(1))
            lancamentos.append(
                montar_lancamento(
                    data_iso=data_atual,
                    descricao_bruta=" ".join(buffer_descricao),
                    valor=valor,
                    banco="mercado_pago",
                    cartao=cartao_atual,
                )
            )
            data_atual = ""
            buffer_descricao = []
            continue

        if data_atual and linha not in {"Data", "Movimentações", "Valor em R$"}:
            buffer_descricao.append(linha)

    parcelamentos_futuros = construir_item_resumo_parcelamentos_mp(texto)

    return {
        "arquivo": nome_arquivo,
        "banco": "mercado_pago",
        "resumo": resumo,
        "lancamentos": lancamentos,
        "parcelamentosFuturos": parcelamentos_futuros,
    }


def parse_fatura(pdf_path: Path, password: str) -> dict:
    """
    Lê uma fatura, identifica o banco e delega para o parser correto.

    Argumentos:
    - `pdf_path`: caminho do PDF.
    - `password`: senha da fatura.

    Retorno:
    - `dict` com os dados estruturados da fatura.
    """
    texto = executar_pdftotext(pdf_path, password)
    banco = inferir_banco(pdf_path.name, texto)

    if banco == "inter":
        return parse_inter(texto, pdf_path.name)
    if banco == "mercado_pago":
        return parse_mercado_pago(texto, pdf_path.name)

    raise RuntimeError(f"Não foi possível identificar o banco do arquivo {pdf_path.name}.")


def construir_gastos_sugeridos(faturas: list[dict]) -> list[dict]:
    """
    Consolida os lançamentos marcados como gastos em um formato simplificado.

    Argumentos:
    - `faturas`: lista de faturas já processadas.

    Retorno:
    - `list[dict]` com itens voltados para revisão e futura importação.
    """
    gastos = []
    for fatura in faturas:
        vencimento_fatura = fatura.get("resumo", {}).get("vencimento", "")
        competencia_pagamento = competencia_por_vencimento(vencimento_fatura)
        for lancamento in [*fatura["lancamentos"], *fatura.get("parcelamentosFuturos", [])]:
            if not lancamento["incluir_como_gasto"]:
                continue
            id_base = "|".join([
                lancamento["origem"],
                lancamento["cartao"],
                lancamento["data"],
                lancamento["descricao"],
                f"{lancamento['valor']:.2f}",
                lancamento.get("status_parcelamento", ""),
            ])
            gastos.append({
                "id": hashlib.sha1(id_base.encode("utf-8")).hexdigest()[:16],
                "descricao": lancamento["descricao"],
                "valor": lancamento["valor"],
                "tipo": lancamento["tipo_sugerido"],
                "categoriaSugerida": lancamento["categoria_sugerida"],
                "dataCompra": lancamento["data"],
                "competenciaPagamento": competencia_pagamento,
                "vencimentoFatura": vencimento_fatura,
                "origemFatura": lancamento["origem"],
                "cartao": lancamento["cartao"],
                "parcelaAtual": lancamento["parcela_atual"],
                "parcelaTotal": lancamento["parcela_total"],
                "principalParcela": lancamento.get("principal_parcela"),
                "jurosParcela": lancamento.get("juros_parcela"),
                "statusParcelamento": lancamento.get("status_parcelamento", ""),
                "apenasVisibilidade": bool(lancamento.get("apenas_visibilidade")),
                "observacaoParcelamento": lancamento.get("observacao_parcelamento", ""),
            })
    gastos.sort(key=lambda item: (item["dataCompra"], item["descricao"]))
    return gastos


def construir_resumos_fatura(faturas: list[dict]) -> list[dict]:
    """
    Consolida os dados principais de cada fatura para uso no painel mensal.

    Argumentos:
    - `faturas`: lista de faturas já processadas.

    Retorno:
    - `list[dict]` com banco, vencimento, competência e totais da fatura.
    """
    resumos = []
    for fatura in faturas:
        resumo = fatura.get("resumo", {})
        vencimento = resumo.get("vencimento", "")
        resumos.append({
            "arquivo": fatura.get("arquivo", ""),
            "banco": fatura.get("banco", ""),
            "vencimento": vencimento,
            "competenciaPagamento": competencia_por_vencimento(vencimento),
            "totalFatura": round(resumo.get("total_fatura", 0) or 0, 2),
            "pagamentoMinimo": round(resumo.get("pagamento_minimo", 0) or 0, 2),
        })
    return resumos


def salvar_json(caminho: Path, dados: dict) -> None:
    """
    Salva um objeto Python em arquivo JSON formatado.

    Argumentos:
    - `caminho`: destino do arquivo.
    - `dados`: conteúdo serializável em JSON.

    Retorno:
    - `None`.
    """
    caminho.parent.mkdir(parents=True, exist_ok=True)
    caminho.write_text(json.dumps(dados, indent=2, ensure_ascii=False), encoding="utf-8")


def criar_argumentos() -> argparse.Namespace:
    """
    Define e lê os argumentos da linha de comando.

    Argumentos:
    - Nenhum.

    Retorno:
    - `argparse.Namespace` com os caminhos dos PDFs, senhas e saídas.
    """
    parser = argparse.ArgumentParser(
        description="Extrai lançamentos de faturas do Banco Inter e Mercado Pago."
    )
    parser.add_argument("--inter", type=Path, help="PDF da fatura do Banco Inter.")
    parser.add_argument("--inter-password", default="", help="Senha do PDF do Banco Inter.")
    parser.add_argument("--mp", type=Path, help="PDF da fatura do Mercado Pago.")
    parser.add_argument("--mp-password", default="", help="Senha do PDF do Mercado Pago.")
    parser.add_argument(
        "--output-bruto",
        type=Path,
        default=Path("data/importacao-faturas-bruta.json"),
        help="Caminho do JSON bruto consolidado.",
    )
    parser.add_argument(
        "--output-gastos",
        type=Path,
        default=Path("data/importacao-faturas-gastos.json"),
        help="Caminho do JSON com gastos sugeridos.",
    )
    return parser.parse_args()


def main() -> int:
    """
    Orquestra a importação das faturas e a geração dos arquivos de saída.

    Argumentos:
    - Nenhum. Usa a linha de comando para receber os parâmetros.

    Retorno:
    - `int` com código de saída do processo.
    """
    args = criar_argumentos()
    entradas = []

    if args.inter and args.inter_password:
        entradas.append((args.inter, args.inter_password))
    if args.mp and args.mp_password:
        entradas.append((args.mp, args.mp_password))

    if not entradas:
        raise SystemExit("Informe ao menos uma fatura com seu respectivo arquivo e senha.")

    faturas = [parse_fatura(pdf_path=pdf, password=senha) for pdf, senha in entradas]
    gastos_sugeridos = construir_gastos_sugeridos(faturas)

    bruto = {
        "geradoEm": datetime.now().isoformat(),
        "faturas": faturas,
    }
    faturas_resumo = construir_resumos_fatura(faturas)
    gastos = {
        "geradoEm": datetime.now().isoformat(),
        "fonte": "importador_faturas_pdf",
        "observacao": (
            "Revise os gastos antes de usar no painel. "
            "Este arquivo sugere lançamentos, mas não distingue sozinho toda cobrança financeira."
        ),
        "faturasResumo": faturas_resumo,
        "gastos": gastos_sugeridos,
        "gastosSugeridos": gastos_sugeridos,
    }

    salvar_json(args.output_bruto, bruto)
    salvar_json(args.output_gastos, gastos)

    print(f"Faturas processadas: {len(faturas)}")
    print(f"Gastos sugeridos: {len(gastos_sugeridos)}")
    print(f"Saída bruta: {args.output_bruto}")
    print(f"Saída de gastos: {args.output_gastos}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
