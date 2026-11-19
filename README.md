# Cinco Um Três

Quem entrou e quem saiu de cada uma das 513 cadeiras da Câmara dos Deputados, dia a dia, na 57ª legislatura
(2023 a 2027). Quando um titular sai e um suplente assume, o site liga um ao outro.

Site: https://cincoumtres.vercel.app (também em https://cincoumtres.macape.dev)

Autor: Matheus C. Pestana.

## De onde vem

A ideia saiu do trabalho que faço no [ISER](https://religiaoepoder.org.br), na equipe de Religião e Política.
Para estudar quem são os parlamentares, precisávamos saber quem estava sentado na Câmara em cada data, e a base
da Câmara não diz isso de forma direta: um suplente aparece como um deputado novo, sem referência a quem ele
substituiu. As ligações do site são inferidas. O método está em `/como-inferimos` e usa o histórico de eventos
de cada deputado (posse, licença, afastamento, volta), a lista do partido e a ordem de votação no TSE. Cada
ligação tem um grau de confiança: na 57ª, 259 são altas, 6 médias e 1 baixa.

Os códigos de vaga (SP-01, RJ-30 e assim por diante) são do site. A Câmara não numera as cadeiras, e os lugares
no plenário não são fixos.

## O que tem aqui

- `pipeline/`: Python que coleta, monta e confere os dados e exporta JSON.
- `site/`: Next.js 16 com exportação estática, que lê os JSON de `site/public/data/<legislatura>/`.
- `Makefile`: atalhos para rodar tudo.

Fontes: [dados abertos da Câmara](https://dadosabertos.camara.leg.br) e [dados abertos do TSE](https://dadosabertos.tse.jus.br).

## Como rodar

Precisa de [uv](https://docs.astral.sh/uv/) e Node 20 ou mais novo.

```
make tse           # baixa as candidaturas do TSE (uma vez, ou quando o TSE atualizar)
make atualizar     # coleta na API da Câmara (~95 s), monta as vagas, exporta os JSON e gera o site
make servir        # serve site/out em http://localhost:4400
```

Passo a passo, se preferir:

```
cd pipeline && uv sync
cd pipeline && uv run python tse.py                  # pipeline/tse/candidatos_<ano>.parquet
cd pipeline && uv run python coleta.py --leg 57      # pipeline/bruto/57/<hoje>/
cd pipeline && uv run python processar.py --leg 57   # vagas + verificações -> site/public/data/57/
cd site && npm ci && npm run build                   # site estático em site/out/
```

### Baixar o TSE com `tse.py`

`tse.py` baixa o arquivo `consulta_cand_<ano>.zip` do TSE, fica só com os candidatos a deputado federal e grava
`pipeline/tse/candidatos_<ano>.parquet`. Sem argumentos, baixa o ano de cada legislatura ativa em `config.py`
(hoje, 2022). Para pedir anos específicos:

```
cd pipeline && uv run python tse.py 2022 2026
```

O arquivo do TSE traz o CPF dos candidatos. Ele só serve para cruzar com a Câmara, que também publica o CPF dos
deputados, e por isso `pipeline/tse/` e `pipeline/bruto/` ficam fora do git. Nenhum CPF vai para os JSON do site:
`processar.py` confere isso antes de gravar. Para guardar os parquets em outro lugar, use
`CINCOUMTRES_TSE=/caminho`.

### Verificações

`processar.py` para com erro, e nada é gravado no site, se alguma conferência falhar: pessoa sem vaga, vaga com
dois ocupantes, número de ocupantes diferente do número de deputados em exercício no dia, UF acima das cadeiras,
casos de referência conferidos à mão ou CPF nos arquivos públicos.

## Atualização diária

O site é estático. Um timer diário (systemd, num servidor) roda a coleta e o processamento. Se os dados mudaram,
faz commit e push dos JSON em `site/public/data/`, e a Vercel publica a cada push. Se nada mudou, não acontece
nada: a Câmara muda pouco de um dia para o outro.

## 58ª legislatura

A coleta e a camada de dados já aceitam a 58ª. Em fevereiro de 2027, ligar `ativa: True` da 58 em
`pipeline/config.py` e rodar `make atualizar LEG=58`. O site gera uma legislatura por build
(`NEXT_PUBLIC_LEG=58`).

Antes disso, falta:

- Conferir as cadeiras por UF. Hoje o pipeline as conta nos eleitos de 2026 do arquivo do TSE, que só traz os
  eleitos já totalizados (505 no momento, e não 513). A 57ª usa a tabela da Lei Complementar 78/1993.
- A ordem de suplência saiu do arquivo atual do TSE, então a ficha do deputado não mostra mais "3º na lista".
- Os capítulos da home citam datas da 57ª e precisam de texto próprio.
- O seletor 57ª/58ª do cabeçalho só indica qual está disponível. Para manter a 57ª no ar ao lado da 58ª, são
  necessárias rotas por legislatura (`/57/...`).
