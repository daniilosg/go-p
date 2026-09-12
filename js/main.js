(() => {
  'use strict';

  // Configuración central cargada desde /config.js.
  // Permite ocultar la sección de bonos y cambiar garantías/precios
  // sin editar el HTML ni el popup.
  const siteConfig = window.PILATES_CONFIG || {};

  function configReplaceTextNodes(root, replacements, predicate = () => true) {
    if (!root || !replacements.length) return;

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(parent.tagName)) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    nodes.forEach((node) => {
      if (!predicate(node)) return;
      let value = node.nodeValue || '';
      let next = value;

      replacements.forEach(([from, to]) => {
        if (typeof to !== 'string') return;
        next = next.split(from).join(to);
      });

      if (next !== value) node.nodeValue = next;
    });
  }

  function configReplaceAttribute(element, attribute, replacements) {
    const value = element.getAttribute(attribute);
    if (value == null) return;
    let next = value;

    replacements.forEach(([from, to]) => {
      if (typeof to !== 'string') return;
      next = next.split(from).join(to);
    });

    if (next !== value) element.setAttribute(attribute, next);
  }

  function applySiteConfig() {
    // 0. Nombre del producto/marca en todo el sitio.
    // Cambia una sola vez en config.js y se refleja en textos visibles, <title> y metadatos.
    const productName = siteConfig?.produto?.nome;
    if (typeof productName === 'string' && productName.trim()) {
      const brandReplacements = [
        ['Pilates Go', productName.trim()],
        ['Pilates Pro', productName.trim()]
      ];

      configReplaceTextNodes(document.body, brandReplacements);

      if (document.title) {
        let nextTitle = document.title;
        brandReplacements.forEach(([from, to]) => {
          nextTitle = nextTitle.split(from).join(to);
        });
        document.title = nextTitle;
      }

      document.querySelectorAll('meta[content]').forEach((meta) => {
        configReplaceAttribute(meta, 'content', brandReplacements);
      });

      // También cubre atributos visibles/accesibles que eventualmente contengan la marca.
      document.querySelectorAll('[alt], [title], [aria-label]').forEach((element) => {
        ['alt', 'title', 'aria-label'].forEach((attribute) => {
          if (element.hasAttribute(attribute)) {
            configReplaceAttribute(element, attribute, brandReplacements);
          }
        });
      });
    }

    // 1. Sección "Bonos exclusivos"
    const bonusSection = document.querySelector('[data-config-section="bonos_exclusivos"]');
    const bonusHidden = siteConfig?.secoes?.bonos_exclusivos?.hidden;
    if (bonusSection && typeof bonusHidden === 'boolean') {
      bonusSection.hidden = bonusHidden;
    }

    // 2. Garantías: sustituye 30/90 días SOLO cuando el texto está en contexto de garantía.
    // "Programa Pilates de 30 Días", por ejemplo, no se altera.
    const garantia = siteConfig?.garantia || {};
    const guaranteeReplacements = [
      ['30 días', garantia['30_dias'] ?? '30 días'],
      ['90 días', garantia['90_dias'] ?? '90 días']
    ];

    configReplaceTextNodes(
      document.body,
      guaranteeReplacements,
      (node) => /garant/i.test(node.nodeValue || '')
    );

    // Garantías marcadas explícitamente en textos donde no aparece la palabra "garantía"
    // (por ejemplo, el párrafo de reembolso de la sección de garantía).
    document.querySelectorAll('[data-config-guarantee]').forEach((element) => {
      const key = element.getAttribute('data-config-guarantee');
      const configured = garantia[key];
      if (typeof configured === 'string') element.textContent = configured;
    });

    // 3. Precios/moneda.
    const precos = siteConfig?.precos || {};

    // Elementos de precio vinculados explícitamente a una key de config.
    // Esto evita afectar otros valores iguales que puedan aparecer en bonos u otros textos.
    document.querySelectorAll('[data-config-price]').forEach((element) => {
      const key = element.getAttribute('data-config-price');
      const configured = precos[key];
      if (typeof configured === 'string') element.textContent = configured;
    });

    // 3.1 Precios exclusivos de la sección de bonos.
    // Cada valor se administra por una key propia para no colisionar con precios iguales
    // usados en planes, popup u otras partes del sitio.
    const precosBonus = siteConfig?.precos_bonus || {};
    document.querySelectorAll('[data-config-bonus-price]').forEach((element) => {
      const key = element.getAttribute('data-config-bonus-price');
      const configured = precosBonus[key];
      if (typeof configured === 'string') element.textContent = configured;
    });

    // El precio Premium del card usa dos tamaños tipográficos (valor + centavos).
    // Se conserva ese diseño aunque premium-fat cambie desde config.js.
    function splitConfiguredPrice(value) {
      const text = String(value ?? '');
      const match = text.match(/^(.*?)([,.]\d{2})$/);
      return match ? { major: match[1], decimal: match[2] } : { major: text, decimal: '' };
    }

    document.querySelectorAll('[data-config-price-parts]').forEach((element) => {
      const key = element.getAttribute('data-config-price-parts');
      const configured = precos[key];
      if (typeof configured !== 'string') return;

      const parts = splitConfiguredPrice(configured);
      const major = element.querySelector('[data-price-major]');
      const decimal = element.querySelector('[data-price-decimal]');
      if (major) major.textContent = parts.major;
      if (decimal) decimal.textContent = parts.decimal;
    });

    // Sustitución general para las demás apariciones visibles, incluido el popup.
    const priceReplacements = [
      ['R$29,90', precos['premium-fat'] ?? 'R$29,90'],
      ['R$19,90', precos['premium-slim'] ?? 'R$19,90'],
      ['R$10', precos.basic ?? 'R$10']
    ];

    configReplaceTextNodes(document.body, priceReplacements);

    // Mantiene también descriptions/OG coherentes cuando contienen precios.
    document.querySelectorAll('meta[content]').forEach((meta) => {
      configReplaceAttribute(meta, 'content', priceReplacements);
    });


    // 4. Links de pago/checkouts.
    // Cada enlace marcado con data-config-payment-link toma su URL desde config.js.
    // El href del HTML queda como fallback si JavaScript no carga.
    const paymentLinks = siteConfig?.links_pagamento || {};
    document.querySelectorAll('[data-config-payment-link]').forEach((element) => {
      const key = element.getAttribute('data-config-payment-link');
      const configured = paymentLinks[key];
      if (typeof configured === 'string' && configured.trim()) {
        element.setAttribute('href', configured.trim());
      }
    });
  }

  applySiteConfig();


  // Google Analytics 4 + Google Tag Manager: rastreo de todos los enlaces y botones.
  // Los CTAs principales reciben nombres cortos y legibles; los demás se generan
  // automáticamente a partir del texto/aria-label y respetan el límite de 40 caracteres de GA4.
  const analyticsEventAliases = new Map([
    ['quiero mis clases ahora', 'click_quiero_mis_clases_ahora'],
    ['quiero el paquete completo', 'click_quiero_paquete_completo'],
    ['quiero el basic', 'click_plan_basic'],
    ['quiero el premium', 'click_plan_premium'],
    ['quiero aplicar estas clases', 'click_aplicar_estas_clases'],
    ['si quiero transformar mis clases', 'click_transformar_mis_clases'],
    ['si quiero el premium por r 19 90', 'click_popup_premium_1990'],
    ['no quiero solo el basic por r 10', 'click_popup_basic_10']
  ]);

  function analyticsNormalize(value = '') {
    return String(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .replace(/\s+/g, ' ');
  }

  function analyticsSlug(value = '') {
    return analyticsNormalize(value).replace(/\s+/g, '_');
  }

  function analyticsShortHash(value = '') {
    let hash = 0;
    const text = String(value);
    for (let i = 0; i < text.length; i += 1) {
      hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
    }
    return Math.abs(hash).toString(36).slice(0, 4).padStart(4, '0');
  }

  function analyticsButtonName(element) {
    if (!element) return 'sin_nombre';
    const visibleText = (element.textContent || '').replace(/\s+/g, ' ').trim();
    return visibleText || element.getAttribute('aria-label') || element.id || 'sin_nombre';
  }

  function analyticsEventName(buttonName) {
    const normalized = analyticsNormalize(buttonName);
    if (analyticsEventAliases.has(normalized)) return analyticsEventAliases.get(normalized);

    const slug = analyticsSlug(buttonName) || 'sin_nombre';
    const full = `click_${slug}`;
    if (full.length <= 40) return full;

    const suffix = analyticsShortHash(buttonName);
    return `${full.slice(0, 35).replace(/_+$/g, '')}_${suffix}`.slice(0, 40);
  }

  function analyticsSectionName(element) {
    if (element?.closest('#basic-modal')) return 'popup_plan_basic';
    if (element?.closest('#purchase-notification')) return 'notificacion_compra';
    const section = element?.closest('section');
    if (!section) return 'pagina';
    if (section.id) return section.id;
    const heading = section.querySelector('h1, h2');
    if (heading) return (heading.textContent || '').replace(/\s+/g, ' ').trim();
    const badge = section.querySelector('span');
    return badge ? (badge.textContent || '').replace(/\s+/g, ' ').trim() : 'seccion';
  }

  function analyticsCardName(element) {
    if (element?.closest('#basic-modal')) return 'Popup Plan Basic';
    let node = element?.parentElement;
    while (node && node.tagName !== 'SECTION' && node.tagName !== 'BODY') {
      const heading = node.querySelector('h3');
      if (heading) {
        const text = (heading.textContent || '').replace(/\s+/g, ' ').trim();
        if (/^Plan Basic$/i.test(text) || /^Plan Premium$/i.test(text) || /^Ana Martins$/i.test(text)) {
          return text;
        }
      }
      node = node.parentElement;
    }
    return '';
  }

  function analyticsDestination(element) {
    if (!element || element.tagName !== 'A') return '';
    return element.getAttribute('href') || '';
  }

  function analyticsSend(eventName, params = {}) {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([, value]) => value !== '' && value !== null && value !== undefined)
    );

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'ui_interaction',
      ga4_event_name: eventName,
      ...cleanParams
    });

    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, cleanParams);
    } else if (typeof gtag === 'function') {
      gtag('event', eventName, cleanParams);
    }
  }

  function analyticsTrackClick(element) {
    const buttonName = analyticsButtonName(element);
    analyticsSend(analyticsEventName(buttonName), {
      button_name: buttonName,
      button_id: element.id || '',
      button_type: element.tagName.toLowerCase(),
      section_name: analyticsSectionName(element),
      card_name: analyticsCardName(element),
      popup_name: element.closest('#basic-modal') ? 'Plan Basic Upsell' : '',
      destination_url: analyticsDestination(element),
      page_path: window.location.pathname
    });
  }

  // Captura todos los <a> y <button>, incluso los creados o alterados dinámicamente.
  document.addEventListener('click', (event) => {
    const clickable = event.target.closest('a, button');
    if (!clickable) return;
    analyticsTrackClick(clickable);
  }, true);

  // Scroll de CTAs internos
  document.querySelectorAll('a[href^="#"]:not([href="#"])').forEach((link) => {
    link.addEventListener('click', (event) => {
      const id = link.getAttribute('href');
      const target = document.querySelector(id);
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // FAQ acordeón
  document.querySelectorAll('.faq-question').forEach((button) => {
    button.addEventListener('click', () => {
      const parent = button.parentElement;
      const answer = parent?.querySelector('.faq-answer');
      if (!answer) return;

      const willOpen = button.getAttribute('aria-expanded') !== 'true';
      document.querySelectorAll('.faq-question[aria-expanded="true"]').forEach((other) => {
        if (other === button) return;
        other.setAttribute('aria-expanded', 'false');
        const otherAnswer = other.parentElement?.querySelector('.faq-answer');
        if (otherAnswer) otherAnswer.hidden = true;
      });

      button.setAttribute('aria-expanded', String(willOpen));
      answer.hidden = !willOpen;
    });
  });

  // Carrusel de testimonios en JS puro. El primer testimonio corresponde al SSR de la referencia.
  const testimonials = [
    {
      name: 'Amanda Ribeiro',
      date: 'Compra verificada · hace 2 semanas',
      text: 'Mis clases se transformaron. Las secuencias son claras y están bien estructuradas. Ahorro horas de planificación y mis alumnas notaron la diferencia desde la primera semana. ¡Lo recomiendo muchísimo!',
      image: 'https://aulasdepilates-br.lovable.app/assets/review_1_sq-BTYn3p3g.webp'
    },
    {
      name: 'Juliana Costa',
      date: 'Compra verificada · hace 3 semanas',
      text: 'Lo que más me ayudó fue tener una estructura lista. Ahora preparo la clase mucho más rápido y consigo variar sin perder la lógica de la sesión.'
    },
    {
      name: 'Mariana Alves',
      date: 'Compra verificada · hace 1 mes',
      text: 'Uso el material desde el celular entre una clase y otra. Las adaptaciones me ayudan mucho cuando tengo alumnas con niveles diferentes.'
    },
    {
      name: 'Camila Ferreira',
      date: 'Compra verificada · hace 1 mes',
      text: 'El repertorio es muy práctico. Dejé de perder tiempo buscando ideas sueltas y mis clases quedaron más organizadas y fluidas.'
    },
    {
      name: 'Renata Souza',
      date: 'Compra verificada · hace 5 semanas',
      text: 'Me gustó poder filtrar mentalmente por objetivo, duración y accesorios. Para la rutina de estudio es exactamente lo que necesitaba.'
    },
    {
      name: 'Patrícia Lima',
      date: 'Compra verificada · hace 2 meses',
      text: 'Las secuencias me dieron nuevas ideas sin obligarme a rehacer toda mi forma de trabajar. Es simple de consultar y fácil de aplicar.'
    }
  ];

  let slide = 0;
  const card = document.getElementById('testimonial-card');
  const textEl = document.getElementById('testimonial-text');
  const nameEl = document.getElementById('testimonial-name');
  const dateEl = document.getElementById('testimonial-date');
  const imageEl = document.getElementById('testimonial-image');
  const dots = [...document.querySelectorAll('#testimonios [data-slide]')];

  function initials(name) {
    return name.split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
  }

  function renderTestimonial(index) {
    if (!card || !textEl || !nameEl || !dateEl) return;
    slide = (index + testimonials.length) % testimonials.length;
    const item = testimonials[slide];
    card.classList.add('is-changing');

    window.setTimeout(() => {
      textEl.textContent = `“${item.text}”`;
      nameEl.textContent = item.name;
      dateEl.textContent = item.date;

      if (imageEl) {
        if (item.image) {
          imageEl.src = item.image;
          imageEl.alt = item.name;
          imageEl.style.display = '';
          imageEl.removeAttribute('data-fallback-avatar');
        } else {
          // Avatar SVG local en data URI para no depender de imágenes inventadas de terceros.
          const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" rx="48" fill="#efe7f3"/><text x="48" y="57" text-anchor="middle" font-family="Arial" font-size="28" font-weight="700" fill="#8f6bb4">${initials(item.name)}</text></svg>`;
          imageEl.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
          imageEl.alt = item.name;
          imageEl.dataset.fallbackAvatar = 'true';
        }
      }

      dots.forEach((dot, i) => {
        dot.classList.toggle('bg-primary', i === slide);
        dot.classList.toggle('w-6', i === slide);
        dot.classList.toggle('bg-muted-foreground/30', i !== slide);
        dot.classList.toggle('w-2', i !== slide);
      });
      card.classList.remove('is-changing');
    }, 130);
  }

  document.getElementById('testimonial-prev')?.addEventListener('click', () => renderTestimonial(slide - 1));
  document.getElementById('testimonial-next')?.addEventListener('click', () => renderTestimonial(slide + 1));
  dots.forEach((dot, i) => dot.addEventListener('click', () => renderTestimonial(i)));

  // Modal del Basic
  const modal = document.getElementById('basic-modal');
  const openModal = () => {
    if (!modal || !modal.hidden) return;
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    analyticsSend('modal_basic_open', {
      popup_name: 'Plan Basic Upsell',
      trigger_button: 'Quiero el Basic',
      page_path: window.location.pathname
    });
    modal.querySelector('.modal-close')?.focus();
  };
  const closeModal = (method = 'close') => {
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    analyticsSend('modal_basic_close', {
      popup_name: 'Plan Basic Upsell',
      close_method: method,
      page_path: window.location.pathname
    });
  };

  document.getElementById('open-basic-modal')?.addEventListener('click', (event) => {
    event.preventDefault();
    openModal();
  });
  modal?.querySelector('.modal-close')?.addEventListener('click', () => closeModal('boton_x'));
  modal?.querySelector('.modal-basic-close')?.addEventListener('click', () => closeModal('boton_secundario'));
  modal?.addEventListener('click', (event) => { if (event.target === modal) closeModal('fondo'); });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && modal && !modal.hidden) closeModal('escape'); });


  // Notificación de compra reciente: idioma, nombres y ubicaciones administrados desde config.js.
  // Idiomas disponibles por defecto: "pt-br" y "es".
  const purchaseToast = document.getElementById('purchase-notification');
  const purchaseToastClose = purchaseToast?.querySelector('.purchase-toast-close');
  const purchaseToastName = purchaseToast?.querySelector('.purchase-toast-name');
  const purchaseToastAction = purchaseToast?.querySelector('.purchase-toast-action');
  const purchaseToastPlan = purchaseToast?.querySelector('.purchase-toast-plan');
  const purchaseToastLocation = purchaseToast?.querySelector('.purchase-toast-location');
  const purchaseToastTime = purchaseToast?.querySelector('.purchase-toast-time');

  const notificationConfig = siteConfig?.notificacao || {};
  const notificationLocales = notificationConfig?.idiomas || {};
  const requestedNotificationLocale = String(notificationConfig?.idioma || 'es').toLowerCase();
  const notificationLocale = notificationLocales[requestedNotificationLocale]
    ? requestedNotificationLocale
    : (notificationLocales.es ? 'es' : 'pt-br');
  const notificationData = notificationLocales[notificationLocale] || {};

  let purchaseToastShowTimer = null;
  let purchaseToastHideTimer = null;
  let purchaseToastDisabled = false;
  let previousPurchaseName = '';
  let previousPurchaseLocation = '';

  const randomNotificationItem = (items, previous = '') => {
    if (!Array.isArray(items) || items.length === 0) return '';
    if (items.length === 1) return String(items[0]);

    let selected = String(items[Math.floor(Math.random() * items.length)]);
    let guard = 0;
    while (selected === previous && guard < 8) {
      selected = String(items[Math.floor(Math.random() * items.length)]);
      guard += 1;
    }
    return selected;
  };

  const renderPurchaseToast = () => {
    if (!purchaseToast) return;

    const nextName = randomNotificationItem(notificationData.nomes, previousPurchaseName);
    const nextLocation = randomNotificationItem(notificationData.locais, previousPurchaseLocation);
    if (nextName) previousPurchaseName = nextName;
    if (nextLocation) previousPurchaseLocation = nextLocation;

    if (purchaseToastName && nextName) purchaseToastName.textContent = nextName;
    if (purchaseToastAction && typeof notificationData.texto_compra === 'string') {
      purchaseToastAction.textContent = notificationData.texto_compra;
    }
    if (purchaseToastPlan && typeof notificationData.plano === 'string') {
      purchaseToastPlan.textContent = notificationData.plano;
    }
    if (purchaseToastLocation && nextLocation) purchaseToastLocation.textContent = nextLocation;
    if (purchaseToastTime && typeof notificationData.agora === 'string') {
      purchaseToastTime.textContent = notificationData.agora;
    }
    if (purchaseToastClose && typeof notificationData.fechar === 'string') {
      purchaseToastClose.setAttribute('aria-label', notificationData.fechar);
    }

    purchaseToast.setAttribute('data-notification-locale', notificationLocale);
  };

  const hidePurchaseToast = () => {
    if (!purchaseToast) return;
    purchaseToast.classList.remove('is-visible');
    purchaseToast.classList.add('opacity-0', 'translate-y-4', 'pointer-events-none');
    purchaseToast.setAttribute('aria-hidden', 'true');
  };

  const schedulePurchaseToast = (delay = 9000) => {
    if (!purchaseToast || purchaseToastDisabled) return;
    window.clearTimeout(purchaseToastShowTimer);
    purchaseToastShowTimer = window.setTimeout(showPurchaseToast, delay);
  };

  const showPurchaseToast = () => {
    if (!purchaseToast || purchaseToastDisabled || (modal && !modal.hidden)) {
      schedulePurchaseToast(5000);
      return;
    }

    // Cada nova aparição sorteia outro nome e outra localização do idioma selecionado.
    renderPurchaseToast();
    purchaseToast.classList.add('is-visible');
    purchaseToast.classList.remove('opacity-0', 'translate-y-4', 'pointer-events-none');
    purchaseToast.setAttribute('aria-hidden', 'false');

    window.clearTimeout(purchaseToastHideTimer);
    purchaseToastHideTimer = window.setTimeout(() => {
      hidePurchaseToast();
      schedulePurchaseToast(11000);
    }, 5500);
  };

  purchaseToastClose?.addEventListener('click', () => {
    purchaseToastDisabled = true;
    window.clearTimeout(purchaseToastShowTimer);
    window.clearTimeout(purchaseToastHideTimer);
    hidePurchaseToast();
  });

  // Prepara el contenido oculto y muestra la primera notificación unos segundos después.
  renderPurchaseToast();
  schedulePurchaseToast(6000);

})();
