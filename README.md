# Pilates Go — versión ES

Estructura:

- `home.html` — página principal
- `index.html` — copia de la página para acceso directo en hosts que buscan `index.html`
- `css/style.css` — estilos locales e importación de la hoja visual de referencia
- `js/main.js` — FAQ, carrusel, scroll y modal del plan Basic
- `Dockerfile` / `nginx.conf` — deploy con Nginx

## Docker

```bash
docker build -t pilates-pro-es .
docker run --rm -p 8080:80 pilates-pro-es
```

Abre `http://localhost:8080`.

## Dependencias externas preservadas

La VSL/SmartPlayer de ConverteAI y los recursos visuales del sitio de referencia siguen cargándose por HTTPS, tal como en la página original. La hoja visual original también se importa al inicio de `css/style.css` para mantener la mayor fidelidad posible al diseño publicado.

## Google Analytics / Google Tag Manager

Integrações adicionadas:

- Google Tag Manager: `GTM-TT7TDFZK`
- Google Analytics 4: `G-V58MHFK0W9`

Todos os elementos `<a>` e `<button>` geram um evento GA4 com nome derivado do texto/`aria-label` do próprio botão. O evento também envia para o `dataLayer` um evento `ui_interaction` com os parâmetros `ga4_event_name`, `button_name`, `button_id`, `button_type`, `section_name`, `card_name`, `popup_name`, `destination_url` e `page_path` quando aplicáveis.

Eventos principais com nomes fixos:

- `click_quiero_mis_clases_ahora`
- `click_quiero_paquete_completo`
- `click_plan_basic`
- `click_plan_premium`
- `click_aplicar_estas_clases`
- `click_transformar_mis_clases`
- `click_popup_premium_1990`
- `click_popup_basic_10`
- `modal_basic_open`
- `modal_basic_close`

Os demais botões (FAQ, navegação do carrossel, fechar notificação etc.) também são rastreados automaticamente a partir do nome visível do controle.

## Configuração central (`config.js`)

Na raiz do projeto existe `config.js`. Edite apenas os valores para testar preços, moeda, garantias ou ocultar a seção de bônus.

```js
window.PILATES_CONFIG = {
  "produto": {
    "nome": "Pilates Go"
  },
  "secoes": {
    "bonos_exclusivos": { "hidden": false }
  },
  "garantia": {
    "30_dias": "30 días",
    "90_dias": "90 días"
  },
  "precos": {
    "basic": "R$10",
    "premium-slim": "R$19,90",
    "premium-fat": "R$29,90",
    "basic-riscado": "R$47",
    "premium-riscado": "R$197"
  }
};
```

- `produto.nome`: altera o nome da marca/produto em todo o site, incluindo textos visíveis, `<title>` e metadados sociais. Ex.: `"Pilates Pro"`, `"Pilates Go"` ou outro nome.
- `hidden: true`: oculta toda a seção **Bonos exclusivos**.
- `hidden: false`: exibe a seção.
- `30_dias` e `90_dias`: alteram apenas ocorrências ligadas ao contexto de **garantia**, inclusive no pop-up.
- `basic`, `premium-slim` e `premium-fat`: alteram o texto completo do preço, portanto a moeda também pode ser trocada.



## Precios de la sección Bonos exclusivos

Los 6 precios tachados y el total de bonos se administran desde `config.js` en `precos_bonus`:

```js
"precos_bonus": {
  "aulas-express": "R$97",
  "programa-30-dias": "R$127",
  "biblioteca-video": "R$147",
  "publico-60-mais": "R$67",
  "planner-mensual": "R$47",
  "guia-adaptacoes": "R$67",
  "total": "R$552"
}
```

Estos valores solo afectan a la sección de bonos y no modifican precios iguales usados en los planes o en el popup.
### Total de bonos
La key `precos_bonus.total` controla los dos lugares donde aparece el total de los bonos: el texto introductorio `Valor total de los bonos` y el bloque `TOTAL EN BONOS`.



### Garantías
Los valores `garantia.30_dias` y `garantia.90_dias` también controlan el texto del plazo de reembolso en la sección de garantía.

## Idioma da notificação de compra

A notificação que aparece e some no canto da página também é gerenciada pelo `config.js`.

```js
"notificacao": {
  // Opções de idioma disponíveis: "pt-br" ou "es"
  "idioma": "es"
}
```

- `"pt-br"`: usa textos em português, nomes brasileiros e sorteia entre os 26 estados + Distrito Federal.
- `"es"`: usa textos em espanhol, nomes mais naturais em espanhol e sorteia entre Argentina, Bolivia, Chile, Colombia, Costa Rica, Ecuador, El Salvador, España, Guatemala, Honduras, México, Nicaragua, Panamá, Paraguay, Perú, República Dominicana, Uruguay, Guinea Ecuatorial e Puerto Rico.

A cada nova aparição da notificação, o site sorteia outro nome e outra localização e evita repetir imediatamente o item anterior.


## Links de pagamento no config.js

Os três checkouts `pay.hotmart.com` também são gerenciados pelo `config.js`:

```js
"links_pagamento": {
  "basic": "https://pay.hotmart.com/L107582936U?off=tj29xkic",
  "premium-slim": "https://pay.hotmart.com/L107582936U?off=4c9z96xq",
  "premium-fat": "https://pay.hotmart.com/L107582936U?off=3kgdxz0r"
}
```

- `basic`: checkout de R$10 (opção Basic no popup).
- `premium-slim`: checkout promocional de R$19,90 no popup de upgrade.
- `premium-fat`: checkout de R$29,90 do card Plan Premium.

Para trocar um checkout, altere somente o URL da key correspondente. Os botões mantêm os URLs originais no HTML apenas como fallback caso o JavaScript não seja carregado.


### Repasse de UTMs para Hotmart

O `js/main.js` preserva automaticamente as UTMs da URL da landing page nos checkouts `pay.hotmart.com`.
São repassados parâmetros cujo nome começa com `utm_` (por exemplo `utm_source`, `utm_medium`, `utm_campaign`, `utm_content` e `utm_term`). Os parâmetros próprios do checkout, como `off`, são preservados. Essa lógica não é aplicada a Wiapy ou a outros domínios.
