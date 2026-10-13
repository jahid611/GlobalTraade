// Tradução portuguesa dos textos ligados ao país da empresa: guia do país, formulário de
// venda, filtros de compra e listas de seleção. Fonte: os textos franceses escritos no
// código (MarketGuide.tsx, ListingForm.tsx, src/lib/markets.ts…).

export const markets: Record<string, string> = {
  // Guia do país
  "guide.title_FR": "Comprar uma empresa em França",
  "guide.title_ES": "Comprar uma empresa em Espanha",
  "guide.title_PT": "Comprar uma empresa em Portugal",
  "guide.title_DE": "Comprar uma empresa na Alemanha",
  "guide.title_IT": "Comprar uma empresa em Itália",
  "guide.title_GB": "Comprar uma empresa no Reino Unido",
  "guide.teaser": "As etapas da venda, os apoios ao financiamento e as palavras do país, explicados de forma simples.",
  "guide.loading": "A carregar o guia…",
  "guide.tab_transfer": "Como decorre a venda",
  "guide.tab_financing": "Financiamento",
  "guide.tab_glossary": "Vocabulário",
  "guide.banking_title": "O que os bancos esperam em geral",
  "guide.financing_title": "Os organismos que o podem ajudar",
  "guide.official_site": "Ver o site oficial",
  "guide.new_tab": "(novo separador)",
  "guide.checked_on": "Fontes verificadas em {{date}}.",
  "guide.see_sources": "Ver as fontes",
  "guide.hide_sources": "Ocultar as fontes",
  "guide.disclaimer": "Estas informações são gerais. Não substituem um aconselhamento jurídico ou fiscal. Antes de assinar, consulte um profissional do país (advogado, notário, contabilista certificado).",
  "guide.s4_t3_other": "Contrato de arrendamento",
  "dd.empty_country": "A lista reúne os documentos pedidos no país da empresa ({{country}}), com uma explicação para cada um.",

  // Formulário de venda
  "form.country": "País da empresa",
  "form.country_other": "Outro país",
  "form.hint_country": "Escolha o país onde a empresa está instalada. O número de empresa pedido e a pesquisa de morada adaptam-se a esse país.",
  "form.hint_company_id": "A Globly não pode consultar online o registo deste país: este número será verificado pela equipa da Globly. Pode ocultá-lo abaixo para manter o anonimato.",
  "form.country_switched": "Esta morada fica noutro país: {{country}}. O país da sua empresa foi atualizado. Verifique o número da empresa no primeiro passo.",
  "form.address_country": "A pesquisa incide sobre este país: {{country}}. Para uma empresa situada noutro local, altere o país no primeiro passo.",
  "form.address_none_country": "Nenhuma morada encontrada neste país ({{country}}). Verifique a ortografia, ou experimente sem o número e depois com a cidade.",
  "form.company_id_recheck": "O número introduzido no primeiro passo não corresponde ao formato deste país ({{name}}). Volte ao primeiro passo para o corrigir.",
  "form.lease_other": "Arrendamento das instalações e condições de exploração",
  "form.hint_lease_other": "Facultativo. Se arrenda as suas instalações, indique o tipo de contrato ({{lease}}), a data em que termina e as atividades autorizadas.",
  "form.hint_lease_generic": "Facultativo. Se arrenda as suas instalações, indique o tipo de contrato, a data em que termina e as atividades autorizadas.",
  "company_id.format_ok": "O formato está correto. Este número ainda não foi verificado: a equipa da Globly irá confirmá-lo.",
  "val.company_id_format": "Este número não tem o formato esperado ({{name}}). Exemplo: {{example}}",
  "val.company_id_required": "Indique o número oficial de registo da empresa (pelo menos 5 caracteres).",
  "onb.company_id_check": "este número não parece ter o formato habitual, verifique-o",
  "onb.legal_form_free": "Ex.: sociedade por quotas",

  // Número da empresa consoante o país
  "market.xx.id_name": "Número de identificação",
  "market.fr.id_what": "O número de 14 algarismos do estabelecimento, que consta do extrato Kbis e das faturas.",
  "market.es.id_what": "O número de identificação fiscal (antigo CIF). Sociedade: uma letra, sete algarismos e um carácter de controlo. Trabalhador independente (autónomo): oito algarismos e uma letra.",
  "market.pt.id_what": "O número de identificação de pessoa coletiva (ou o NIF de um trabalhador independente): 9 algarismos.",
  "market.de.id_what": "O número do registo comercial (HRB ou HRA seguido de algarismos). Uma empresa não inscrita indica o seu número de IVA (USt-IdNr., DE + 9 algarismos) ou o seu identificador económico (W-IdNr.).",
  "market.it.id_what": "O número de IVA da empresa: 11 algarismos.",
  "market.gb.id_what": "O número de registo na Companies House: 8 algarismos, ou 2 letras e 6 algarismos.",
  "market.xx.id_what": "O número oficial de registo da empresa no seu país.",

  // Filtros, procuras e projeto de aquisição
  "filters.country": "País",
  "filters.all_countries": "Todos os países",
  "filters.all_regions": "Todas as regiões",
  "smart.f_countries": "Países",
  "smart.ph_countries": "Todos os países",
  "smart.ph_regions_all": "Todas as regiões",
  "bp.q_countries": "Em que países?",
  "bp.q_countries_hint": "Escolha um ou vários países. Deixe vazio se todos os países lhe convêm.",
  "bp.countries_ph": "Todos os países",
  "bp.q_regions_hint_multi": "As regiões dos países escolhidos. Deixe vazio se todo o país lhe convém.",
  "bp.regions_ph_all": "Todas as regiões",
  "bp.q_departments_hint_fr": "Apenas em França: para ser mais preciso do que uma região, ou para os territórios ultramarinos.",
  "searchads.countries_ph": "Escolher um ou vários países",
  "searchads.regions_ph_multi": "Regiões específicas (facultativo se for escolhido um país)",
  "onb.geo_countries": "Países pretendidos",
  "onb.geo_countries_ph": "Todos os países",
  "onb.geo_regions": "Regiões pretendidas",
  "onb.geo_regions_ph": "Todas as regiões",
  "onb.geo_hint": "Facultativo. Se não for escolhida nenhuma região de um país, conta o país inteiro.",

  // Ficha do anúncio
  "listing.id_label": "{{name}}:",
  "listing.id_verified": "{{name}} verificado",
  "listing.id_provided": "{{name}} indicado",
  "listing.country_rules": "País da empresa: {{country}}. As regras desse país aplicam-se à venda. Os montantes são apresentados em euros.",

  // Listas de seleção
  "multiselect.search": "Pesquisar…",
  "multiselect.empty": "Nenhum resultado",
};
