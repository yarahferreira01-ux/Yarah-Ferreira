# Google Maps Kit — extrator de leads

Busca empresas no Google Maps ("dentista em Goiânia", "pizzaria em Recife"...) e entrega uma
planilha pronta para prospecção: nome, telefone, link de WhatsApp, site, e-mail, Instagram,
endereço, nota, número de avaliações, horários e link do Maps.

Usa a **API oficial do Google (Places API New)**, então não quebra quando o Google muda a página e
não corre risco de bloqueio de IP. Zero dependências: só precisa do Node.js 18+.

## 1. Pegar a chave da API (uma vez só, ~5 min)

1. Entre em <https://console.cloud.google.com/> e crie um projeto.
2. Em **APIs e serviços → Biblioteca**, ative **Places API (New)**.
3. Em **Faturamento**, vincule um cartão. O Google dá um crédito gratuito mensal para a
   Places API; acompanhe o consumo em **Faturamento → Relatórios**.
4. Em **APIs e serviços → Credenciais → Criar credenciais → Chave de API**. Restrinja a chave à
   Places API.
5. Nesta pasta: copie `.env.example` para `.env` e cole a chave:

```bash
cp .env.example .env
# edite .env -> GOOGLE_MAPS_API_KEY=AIza...
```

> O `.env` está no `.gitignore`. Nunca suba a chave para o GitHub.

## 2. Rodar

```bash
cd google-maps-kit

# uma busca
node scrape.js "dentista em Goiânia"

# várias buscas de um arquivo (uma por linha) + caça de e-mail/Instagram nos sites
node scrape.js --file buscas.txt --emails

# cidade grande: divide em 4x4 áreas para passar do limite de 60 resultados por busca
node scrape.js "academia em São Paulo" --grid 4 --emails --out saida/academias-sp
```

Pronto para um bairro: área da saúde num raio de 1,5 km do Diamond Center (Fátima, Teresina),
sem dentistas e com bucomaxilos. As buscas ficam em `buscas-saude-fatima.txt`.

```bash
npm run saude-fatima      # -> saida/saude-fatima.csv
```

O resultado sai em dois arquivos: `resultados.csv` (abre no Excel/Google Sheets, com acentos
certos) e `resultados.json`.

## Opções

| Opção | O que faz |
| --- | --- |
| `--file buscas.txt` | lê as buscas de um arquivo (linhas com `#` são ignoradas) |
| `--grid N` | divide a cidade numa grade N x N e busca em cada área. Use 3–5 para capitais |
| `--emails` | visita o site de cada empresa (home, `/contato`, `/contact`) e extrai e-mail, Instagram e WhatsApp |
| `--max N` | para cada busca depois de N resultados (bom para testar sem gastar) |
| `--perto TXT` | busca só em volta de um lugar (`"Diamond Center, Teresina"`) ou de `"lat,lng"` |
| `--raio M` | distância em metros do `--perto` (padrão 1500) |
| `--excluir RE` | descarta lugares cujo nome/categoria bate com a expressão (ex.: `"dentist\|odonto"`) |
| `--manter RE` | mantém mesmo assim os que batem com esta (ex.: `"buco\|maxilo"`) |
| `--out NOME` | prefixo dos arquivos de saída (padrão `resultados`) |
| `--lang` / `--region` | idioma e país (padrão `pt-BR` / `BR`) |

## Colunas da planilha

`busca, nome, categoria, telefone, whatsapp, site, emails, instagram, endereco, nota, avaliacoes,
status, horarios, lat, lng, link_maps, place_id`

- **whatsapp**: gerado quando o telefone é celular brasileiro (DDD + 9...), ou quando o site
  tem um link `wa.me`. É um link clicável `https://wa.me/55...`.
- **status**: `OPERATIONAL`, `CLOSED_TEMPORARILY` ou `CLOSED_PERMANENTLY`. Filtre os fechados.
- Lugares repetidos entre buscas/áreas são removidos automaticamente (pelo `place_id`).

## Dicas de prospecção

- Filtre por **nota < 4.3** ou **poucas avaliações**: são as empresas que mais precisam de
  marketing.
- Filtre **sem site**: oferta óbvia de página/landing page.
- Escreva a busca como "**o que** em **cidade**". O `--grid` usa a parte depois de "em" para
  achar a área da cidade.

## Custos e limites

- Cada página de 20 resultados é uma chamada à Text Search. Com `--grid 4`, cada busca faz até
  16 áreas × 3 páginas = 48 chamadas. Teste antes com `--max 20`.
- Os campos pedidos (telefone, site, nota, horários) entram no SKU *Text Search Enterprise*.
  Confira os preços atuais em <https://developers.google.com/maps/billing-and-pricing/pricing>.
- Use os dados de acordo com os
  [termos da Google Maps Platform](https://cloud.google.com/maps-platform/terms) e com a LGPD:
  contato comercial B2B, com opção de descadastro, e sem spam.
