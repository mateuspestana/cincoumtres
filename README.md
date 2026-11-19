# Cinco Um Três

[![licença do código](https://img.shields.io/badge/código-AGPL--3.0-blue)](LICENSE)
[![licença dos textos e dados](https://img.shields.io/badge/textos%20e%20dados-CC%20BY%204.0-lightgrey)](LICENSE-CONTEUDO)
[![atualizado](https://img.shields.io/github/last-commit/mateuspestana/cincoumtres?label=atualizado)](https://github.com/mateuspestana/cincoumtres/commits/main)

Quem entrou e quem saiu de cada uma das 513 cadeiras da Câmara dos Deputados, dia a dia, na 57ª legislatura (2023 a 2027). Quando um titular sai e um suplente assume, o site liga um ao outro.

**Site:** https://cincoumtres.vercel.app (também em https://cincoumtres.macape.dev)

**Autor:** Matheus C. Pestana — MACAPE Pesquisas e Consultoria em Tecnologia Ltda

## Motivação

A ideia saiu do trabalho no [ISER](https://religiaoepoder.org.br), na equipe de Religião e Política. Para estudar quem são os parlamentares, era preciso saber quem estava sentado na Câmara em cada data. A base da Câmara não responde isso de forma direta: o suplente aparece como um deputado novo, sem referência a quem ele substituiu.

As ligações do site são, portanto, inferidas. O método usa o histórico de eventos de cada deputado (posse, licença, afastamento, volta), a lista do partido e a ordem de votação no TSE, e está explicado na página `/como-inferimos`. Cada ligação tem um grau de confiança: na 57ª, 259 são altas, 6 médias e 1 baixa.

Os códigos de vaga (SP-01, RJ-30 e assim por diante) são do site. A Câmara não numera as cadeiras, e os lugares no plenário não são fixos.

## Funcionalidades

| Página | O que mostra |
|---|---|
| `/` | As 513 cadeiras em forma de concha, com a régua do tempo na borda. A rolagem anda pela legislatura em capítulos, da posse até hoje |
| `/explorar` | Qualquer dia da legislatura, com busca por nome, filtro por UF, arrumação por UF ou por partido na data e a tabela em texto dos suplentes e das cadeiras vazias. A data vai para a URL |
| `/deputado/<id>` | Linha do tempo de cada pessoa (648 páginas): períodos, partidos e a vaga que ocupou |
| `/vaga/<código>` | A sequência de ocupantes de cada cadeira (513 páginas) |
| `/como-inferimos` | As regras de ligação, os casos incertos e o CSV completo das vagas |

Quem sai do plenário sobe para uma faixa de destinos (ministérios, governos estaduais, prefeituras, licença, saída definitiva), e um fio liga essa pessoa ao suplente que entrou no lugar: contínuo quando a ligação é provável, tracejado quando é incerta.

## Requisitos

- [uv](https://docs.astral.sh/uv/) e Python 3.12 ou mais novo (o `uv` instala o Python, se faltar)
- Node 20.9 ou mais novo
- Acesso à internet para a API da Câmara e para o TSE

## Instalação e uso

```bash
git clone https://github.com/mateuspestana/cincoumtres.git
cd cincoumtres
cd pipeline && uv sync && cd ..
cd site && npm ci && cd ..
```

```bash
make tse           # baixa as candidaturas do TSE (uma vez, ou quando o TSE atualizar)
make atualizar     # coleta na API da Câmara (~95 s), monta as vagas, exporta os JSON e gera o site
make servir        # serve site/out em http://localhost:4400
```

Passo a passo, se preferir:

```bash
cd pipeline && uv run python tse.py                  # pipeline/tse/candidatos_<ano>.parquet
cd pipeline && uv run python coleta.py --leg 57      # pipeline/bruto/57/<hoje>/
cd pipeline && uv run python processar.py --leg 57   # vagas + verificações -> site/public/data/57/
cd site && npm run build                             # site estático em site/out/
```

### Baixar o TSE com `tse.py`

O `tse.py` baixa o arquivo `consulta_cand_<ano>.zip` do TSE, fica só com os candidatos a deputado federal e grava `pipeline/tse/candidatos_<ano>.parquet`. Sem argumentos, baixa o ano de cada legislatura ativa em `config.py` (hoje, 2022). Para pedir anos específicos:

```bash
cd pipeline && uv run python tse.py 2022 2026
```

Para guardar os parquets em outro lugar, use `CINCOUMTRES_TSE=/caminho`.

### Verificações

`processar.py` para com erro, e nada é gravado no site, se alguma conferência falhar: pessoa sem vaga, vaga com dois ocupantes, número de ocupantes diferente do número de deputados em exercício no dia, UF acima das cadeiras, casos de referência conferidos à mão ou CPF nos arquivos públicos.

## Dados publicados

Os arquivos de cada legislatura ficam em `site/public/data/<legislatura>/`: `meta.json`, `vagas.json`, `pessoas.json`, `serie.json` (titulares, suplentes e vagas em cada dia) e `vagas.csv`. O site lê só esses arquivos, e todo número exibido sai deles.

## Atualização diária

O site é estático. Um timer diário (systemd, num servidor) roda `scripts/atualizar-diario.sh`: coleta na Câmara, processa e confere os dados e faz commit e push dos JSON em `site/public/data/`. A Vercel publica a cada push. Como a série avança um dia por vez, há um commit por dia. Se alguma verificação falhar, nada é commitado e o site continua com os dados do dia anterior.

## Privacidade

O arquivo do TSE traz o CPF dos candidatos, e a API da Câmara traz o CPF dos deputados. O CPF só serve para cruzar as duas bases dentro do pipeline. `pipeline/tse/` e `pipeline/bruto/` ficam fora do git, e o `processar.py` confere que nenhum CPF chegou aos arquivos públicos.

## Estrutura

```
pipeline/
  coleta.py       API da Câmara: lista, detalhe e eventos de cada deputado
  tse.py          candidaturas do TSE
  periodos.py     períodos de exercício e casamento com o TSE
  vagas.py        distribuição dos períodos nas 513 vagas e verificações
  exportar.py     JSON e CSV do site
  processar.py    roda tudo e só grava se as verificações passarem
  config.py       legislaturas, cadeiras por UF e caminhos
scripts/
  atualizar-diario.sh   coleta, processa, commita e envia os JSON (roda no servidor)
site/
  src/app/        páginas (Next.js 16, exportação estática)
  src/concha/     a concha: geometria, cena em canvas e régua
  src/engine/     rolagem, revelações, carregador e transição de página
  public/data/    dados publicados
```

## 58ª legislatura

A coleta e a camada de dados já aceitam a 58ª. Em fevereiro de 2027, ligar `ativa: True` da 58 em `pipeline/config.py` e rodar `make atualizar LEG=58`. O site gera uma legislatura por build (`NEXT_PUBLIC_LEG=58`).

Antes disso, falta:

- Conferir as cadeiras por UF. Hoje o pipeline as conta nos eleitos de 2026 do arquivo do TSE, que só traz os eleitos já totalizados (505 no momento, e não 513). A 57ª usa a tabela da Lei Complementar 78/1993.
- A ordem de suplência saiu do arquivo atual do TSE, então a ficha do deputado não mostra mais "3º na lista".
- Os capítulos da home citam datas da 57ª e precisam de texto próprio.
- O seletor 57ª/58ª do cabeçalho só indica qual está disponível. Para manter a 57ª no ar ao lado da 58ª, são necessárias rotas por legislatura (`/57/...`).

## Créditos

- Dados: [dados abertos da Câmara dos Deputados](https://dadosabertos.camara.leg.br) e [dados abertos do TSE](https://dadosabertos.tse.jus.br)
- Interface: [Next.js](https://nextjs.org/), [GSAP](https://gsap.com/), [Lenis](https://lenis.darkroom.engineering/) e [D3](https://d3js.org/) (d3-scale e d3-shape)
- Fontes: [General Sans](https://www.fontshare.com/fonts/general-sans) (Fontshare) e [Geist Mono](https://vercel.com/font) (SIL OFL)
- Fotos dos deputados: Câmara dos Deputados

## Como citar

Os metadados de citação estão em [CITATION.cff](CITATION.cff). No GitHub, use o botão *Cite this repository*. Em trabalhos acadêmicos, indique a data de acesso, já que os dados são atualizados todo dia.

## Licença

O código é distribuído sob a [GNU Affero General Public License v3.0](LICENSE) (AGPL-3.0-only). Os textos do site, o README e os dados publicados em `site/public/data/` seguem a [Creative Commons Atribuição 4.0 Internacional](LICENSE-CONTEUDO) (CC BY 4.0).

Copyright (c) 2026 Matheus C. Pestana — MACAPE Pesquisas e Consultoria em Tecnologia Ltda

---

Desenvolvido por [MACAPE Pesquisas e Consultoria em Tecnologia Ltda](https://macape.dev).
