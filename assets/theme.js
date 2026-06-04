/* ==========================================================================
   Bettermoove — interactions du thème
   ========================================================================== */
(function () {
  'use strict';

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  const formatMoney = (cents) => {
    const amount = (cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const fmt = window.moneyFormat || '{{amount}} €';
    return fmt.replace(/\{\{\s*amount(_no_decimals)?\s*\}\}/, amount);
  };

  /* ----------------------------------------------------------------------- */
  /*  Overlay helper                                                         */
  /* ----------------------------------------------------------------------- */
  const overlay = $('#Overlay');
  const openOverlay = () => overlay && overlay.classList.add('is-open');
  const closeOverlay = () => overlay && overlay.classList.remove('is-open');

  /* ----------------------------------------------------------------------- */
  /*  Menu mobile                                                            */
  /* ----------------------------------------------------------------------- */
  const mobileNav = $('#MobileNav');
  $$('[data-menu-toggle]').forEach((btn) =>
    btn.addEventListener('click', () => {
      mobileNav && mobileNav.classList.add('is-open');
      openOverlay();
    })
  );
  $$('[data-menu-close]').forEach((btn) =>
    btn.addEventListener('click', () => {
      mobileNav && mobileNav.classList.remove('is-open');
      closeOverlay();
    })
  );

  /* ----------------------------------------------------------------------- */
  /*  Panier — tiroir                                                        */
  /* ----------------------------------------------------------------------- */
  const cartDrawer = $('#CartDrawer');

  const openCart = () => {
    if (!cartDrawer) {
      window.location.href = window.routes.cart_url;
      return;
    }
    cartDrawer.classList.add('is-open');
    openOverlay();
  };
  const closeCart = () => {
    cartDrawer && cartDrawer.classList.remove('is-open');
    closeOverlay();
  };

  $$('[data-cart-toggle]').forEach((btn) =>
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openCart();
    })
  );
  $$('[data-cart-close]').forEach((btn) => btn.addEventListener('click', closeCart));

  overlay &&
    overlay.addEventListener('click', () => {
      closeCart();
      mobileNav && mobileNav.classList.remove('is-open');
    });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeCart();
      mobileNav && mobileNav.classList.remove('is-open');
    }
  });

  /* ----------------------------------------------------------------------- */
  /*  Mise à jour du panier (rendu HTML)                                     */
  /* ----------------------------------------------------------------------- */
  async function refreshCart() {
    try {
      const res = await fetch(`${window.routes.cart_url}?section_id=cart-drawer`);
      const text = await res.text();
      const html = new DOMParser().parseFromString(text, 'text/html');
      const newDrawer = html.querySelector('[data-cart-contents]');
      const current = $('[data-cart-contents]');
      if (newDrawer && current) current.innerHTML = newDrawer.innerHTML;
      bindCartItemEvents();
    } catch (e) {
      console.error('refreshCart', e);
    }

    try {
      const cart = await (await fetch(`${window.routes.cart_url}.js`)).json();
      updateCartCount(cart.item_count);
    } catch (e) {}
  }

  function updateCartCount(count) {
    $$('[data-cart-count]').forEach((el) => {
      el.textContent = count;
      el.style.display = count > 0 ? 'flex' : 'none';
    });
  }

  async function addToCart(formData, button) {
    if (button) button.classList.add('is-loading');
    try {
      const res = await fetch(window.routes.cart_add_url, {
        method: 'POST',
        headers: { Accept: 'application/javascript', 'X-Requested-With': 'XMLHttpRequest' },
        body: formData,
      });
      const data = await res.json();
      if (data.status) {
        showError(data.description || window.cartStrings.error, button);
        return;
      }
      await refreshCart();
      openCart();
    } catch (e) {
      showError(window.cartStrings.error, button);
    } finally {
      if (button) button.classList.remove('is-loading');
    }
  }

  function showError(msg, button) {
    const target = button && (button.closest('form') || button.closest('[data-product-container]'));
    let box = target && target.querySelector('[data-cart-error]');
    if (box) {
      box.textContent = msg;
      box.hidden = false;
    } else {
      alert(msg);
    }
  }

  async function changeQuantity(line, quantity) {
    const res = await fetch(window.routes.cart_change_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/javascript' },
      body: JSON.stringify({ line, quantity }),
    });
    await res.json();
    await refreshCart();
  }

  function bindCartItemEvents() {
    $$('[data-qty-change]').forEach((btn) =>
      btn.addEventListener('click', () => {
        const line = parseInt(btn.dataset.line, 10);
        const qty = parseInt(btn.dataset.qty, 10);
        if (qty >= 0) changeQuantity(line, qty);
      })
    );
    $$('[data-cart-remove]').forEach((btn) =>
      btn.addEventListener('click', () => changeQuantity(parseInt(btn.dataset.line, 10), 0))
    );
  }
  bindCartItemEvents();

  /* Formulaires produit en AJAX */
  $$('form[data-product-form]').forEach((form) => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const btn = form.querySelector('[type="submit"]');
      addToCart(new FormData(form), btn);
    });
  });

  /* ----------------------------------------------------------------------- */
  /*  Sélecteur de variantes                                                 */
  /* ----------------------------------------------------------------------- */
  $$('[data-product-container]').forEach((container) => {
    const dataEl = $('[data-variant-json]', container);
    if (!dataEl) return;
    const variants = JSON.parse(dataEl.textContent);
    const form = $('form[data-product-form]', container);
    const idInput = form && form.querySelector('[name="id"]');
    const priceCurrent = $('[data-price-current]', container);
    const priceCompare = $('[data-price-compare]', container);
    const addBtn = form && form.querySelector('[data-add-btn] .btn__text');
    const stockEl = $('[data-stock]', container);

    function getSelectedOptions() {
      return $$('.variant-options input:checked', container).map((i) => i.value);
    }

    function findVariant(options) {
      return variants.find((v) => v.options.every((opt, i) => opt === options[i]));
    }

    function updateAvailability(options) {
      // griser les options indisponibles (par 1ère option dans cet exemple simple)
      $$('.variant-options input', container).forEach((input) => {
        const trial = options.slice();
        const optIndex = parseInt(input.closest('.variant-picker').dataset.optionIndex, 10);
        trial[optIndex] = input.value;
        const match = variants.find((v) => v.options[optIndex] === input.value);
        input.disabled = match ? !match.available : true;
      });
    }

    function update() {
      const options = getSelectedOptions();
      const variant = findVariant(options);
      updateAvailability(options);
      if (!variant) {
        if (addBtn) addBtn.textContent = 'Indisponible';
        if (idInput) idInput.value = '';
        return;
      }
      if (idInput) idInput.value = variant.id;
      if (priceCurrent) priceCurrent.textContent = formatMoney(variant.price);
      if (priceCompare) {
        if (variant.compare_at_price && variant.compare_at_price > variant.price) {
          priceCompare.textContent = formatMoney(variant.compare_at_price);
          priceCompare.hidden = false;
        } else {
          priceCompare.hidden = true;
        }
      }
      const submitBtn = form.querySelector('[data-add-btn]');
      if (variant.available) {
        if (addBtn) addBtn.textContent = 'Ajouter au panier';
        submitBtn && submitBtn.removeAttribute('disabled');
      } else {
        if (addBtn) addBtn.textContent = 'Rupture de stock';
        submitBtn && submitBtn.setAttribute('disabled', '');
      }
      // mettre à jour le label de l'option sélectionnée
      $$('[data-selected-value]', container).forEach((el) => {
        const idx = parseInt(el.dataset.selectedValue, 10);
        el.textContent = options[idx] || '';
      });
    }

    $$('.variant-options input', container).forEach((input) => input.addEventListener('change', update));
    update();
  });

  /* ----------------------------------------------------------------------- */
  /*  Sélecteur de quantité                                                  */
  /* ----------------------------------------------------------------------- */
  $$('[data-quantity]').forEach((wrap) => {
    const input = $('input', wrap);
    $$('[data-qty-btn]', wrap).forEach((btn) =>
      btn.addEventListener('click', () => {
        const step = parseInt(btn.dataset.qtyBtn, 10);
        const val = Math.max(1, (parseInt(input.value, 10) || 1) + step);
        input.value = val;
        input.dispatchEvent(new Event('change'));
      })
    );
  });

  /* ----------------------------------------------------------------------- */
  /*  Galerie produit                                                        */
  /* ----------------------------------------------------------------------- */
  $$('[data-gallery]').forEach((gallery) => {
    const mainImg = $('[data-gallery-main] img', gallery);
    $$('[data-gallery-thumb]', gallery).forEach((thumb) =>
      thumb.addEventListener('click', () => {
        const src = thumb.dataset.full;
        if (mainImg && src) {
          mainImg.src = src;
          mainImg.srcset = '';
        }
        $$('[data-gallery-thumb]', gallery).forEach((t) => t.classList.remove('is-active'));
        thumb.classList.add('is-active');
      })
    );
  });

  /* ----------------------------------------------------------------------- */
  /*  Offres par lot (bundles) + ajout multi-lignes au panier                */
  /* ----------------------------------------------------------------------- */
  async function addItemsToCart(items, button) {
    if (button) button.classList.add('is-loading');
    try {
      const res = await fetch(window.routes.cart_add_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/javascript' },
        body: JSON.stringify({ items }),
      });
      const data = await res.json();
      if (data.status) {
        showError(data.description || (window.cartStrings && window.cartStrings.error) || 'Une erreur est survenue.', button);
        return;
      }
      await refreshCart();
      openCart();
    } catch (e) {
      showError((window.cartStrings && window.cartStrings.error) || 'Une erreur est survenue.', button);
    } finally {
      if (button) button.classList.remove('is-loading');
    }
  }

  $$('[data-bundles]').forEach((wrap) => {
    const packs = $$('[data-bundle]', wrap);
    const container = wrap.closest('[data-product-container]') || document;
    const priceCurrent = $('[data-price-current]', container);
    const priceCompare = $('[data-price-compare]', container);
    const priceBadge = $('[data-price-badge]', container);
    const priceSave = $('[data-price-save]', container);
    const stickyPrice = $('[data-sticky-price]');
    const addBtn = $('[data-bundle-add]', container);

    const selected = () => wrap.querySelector('[data-bundle].is-selected') || packs[0];

    function updatePrice(pack) {
      const price = parseInt(pack.dataset.price, 10) || 0;
      const compare = parseInt(pack.dataset.compare, 10) || 0;
      const saving = compare > price;
      if (priceCurrent) priceCurrent.textContent = formatMoney(price);
      if (priceCompare) { priceCompare.textContent = formatMoney(compare); priceCompare.hidden = !saving; }
      if (priceBadge) { priceBadge.textContent = '-' + Math.round(((compare - price) / compare) * 100) + '%'; priceBadge.hidden = !saving; }
      if (priceSave) { priceSave.textContent = 'Vous économisez ' + formatMoney(compare - price); priceSave.hidden = !saving; }
      if (stickyPrice) stickyPrice.textContent = formatMoney(price);
    }

    function select(pack) {
      packs.forEach((p) => {
        const on = p === pack;
        p.classList.toggle('is-selected', on);
        p.setAttribute('aria-checked', on ? 'true' : 'false');
        const sizes = p.querySelector('[data-sizes]');
        if (sizes) sizes.hidden = !on;
      });
      updatePrice(pack);
    }

    packs.forEach((pack) => {
      pack.addEventListener('click', (e) => {
        if (e.target.closest('[data-size-select]')) return;
        select(pack);
      });
      pack.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(pack); }
      });
    });

    select(selected());

    if (addBtn) {
      addBtn.addEventListener('click', () => {
        const pack = selected();
        const selects = $$('[data-size-select]', pack);
        const counts = {};
        let invalid = false;
        selects.forEach((s) => {
          const opt = s.options[s.selectedIndex];
          if (!s.value || (opt && opt.disabled)) { invalid = true; return; }
          counts[s.value] = (counts[s.value] || 0) + 1;
        });
        if (invalid) { showError('Veuillez choisir une taille disponible pour chaque genouillère.', addBtn); return; }
        const label = pack.dataset.label || '';
        const items = Object.keys(counts).map((id) => ({
          id: Number(id),
          quantity: counts[id],
          properties: { 'Offre': label },
        }));
        addItemsToCart(items, addBtn);
      });
    }
  });

  /* ----------------------------------------------------------------------- */
  /*  Barre ATC collante (mobile)                                            */
  /* ----------------------------------------------------------------------- */
  const stickyAtc = $('[data-sticky-atc]');
  const mainAtc = $('[data-add-btn]');
  if (stickyAtc && mainAtc) {
    const stickyBtn = $('[data-sticky-add]', stickyAtc);
    if (stickyBtn) {
      stickyBtn.addEventListener('click', () => mainAtc.click());
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          stickyAtc.classList.toggle('is-visible', !entry.isIntersecting && entry.boundingClientRect.top < 0);
        });
      },
      { threshold: 0 }
    );
    io.observe(mainAtc);
  }

  /* ----------------------------------------------------------------------- */
  /*  Compte à rebours (urgence)                                             */
  /* ----------------------------------------------------------------------- */
  $$('[data-countdown]').forEach((el) => {
    const end = new Date();
    end.setHours(23, 59, 59, 0);
    const tick = () => {
      const diff = Math.max(0, end - new Date());
      const h = String(Math.floor(diff / 3.6e6)).padStart(2, '0');
      const m = String(Math.floor((diff % 3.6e6) / 6e4)).padStart(2, '0');
      const s = String(Math.floor((diff % 6e4) / 1000)).padStart(2, '0');
      el.textContent = `${h}:${m}:${s}`;
    };
    tick();
    setInterval(tick, 1000);
  });

  /* ----------------------------------------------------------------------- */
  /*  Comparateur avant / après                                              */
  /* ----------------------------------------------------------------------- */
  $$('[data-compare]').forEach((el) => {
    let dragging = false;
    const labelBefore = $('.compare__label--before', el);
    const labelAfter = $('.compare__label--after', el);

    const updateLabels = (pct) => {
      // "Les autres" (gauche) s'efface quand on révèle BetterKnee en grand
      if (labelBefore) labelBefore.style.opacity = pct <= 12 ? '0' : '1';
      // "BetterKnee" (droite) s'efface quand on révèle Les autres en grand
      if (labelAfter) labelAfter.style.opacity = pct >= 88 ? '0' : '1';
    };

    const setPos = (clientX) => {
      const rect = el.getBoundingClientRect();
      let pct = ((clientX - rect.left) / rect.width) * 100;
      pct = Math.max(0, Math.min(100, pct));
      el.style.setProperty('--pos', pct + '%');
      el.setAttribute('aria-valuenow', Math.round(pct));
      updateLabels(pct);
    };

    // État initial selon la position de départ
    updateLabels(parseFloat(el.style.getPropertyValue('--pos')) || 50);

    el.addEventListener('pointerdown', (e) => {
      dragging = true;
      el.setPointerCapture && el.setPointerCapture(e.pointerId);
      setPos(e.clientX);
    });
    el.addEventListener('pointermove', (e) => {
      if (dragging) setPos(e.clientX);
    });
    el.addEventListener('pointerup', () => (dragging = false));
    el.addEventListener('pointercancel', () => (dragging = false));

    // Accessibilité clavier
    el.addEventListener('keydown', (e) => {
      const current = parseFloat(el.style.getPropertyValue('--pos')) || 50;
      let next = current;
      if (e.key === 'ArrowLeft') next = Math.max(0, current - 4);
      else if (e.key === 'ArrowRight') next = Math.min(100, current + 4);
      else return;
      e.preventDefault();
      el.style.setProperty('--pos', next + '%');
      el.setAttribute('aria-valuenow', Math.round(next));
      updateLabels(next);
    });
  });

  /* ----------------------------------------------------------------------- */
  /*  Newsletter (feedback)                                                  */
  /* ----------------------------------------------------------------------- */
  // Géré côté Shopify via le formulaire customer.

  /* Initial cart count */
  fetch(`${window.routes.cart_url}.js`)
    .then((r) => r.json())
    .then((cart) => updateCartCount(cart.item_count))
    .catch(() => {});
})();
