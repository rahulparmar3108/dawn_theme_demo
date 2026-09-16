(function () {
  'use strict';

  var VIEWED_KEY = 'ymal_viewed_products';
  var MAX_HISTORY = 10;

  /* ─────────────────────────────────────────
     Storage helpers
  ───────────────────────────────────────── */
  function storageGet(key) {
    try { return JSON.parse(localStorage.getItem(key)) || []; }
    catch (e) { return []; }
  }

  function storageSet(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); }
    catch (e) { }
  }

  function storageSingleGet(key) {
    try { return localStorage.getItem(key) || ''; }
    catch (e) { return ''; }
  }

  function storageSingleSet(key, val) {
    try { localStorage.setItem(key, val); }
    catch (e) { }
  }

  /* ─────────────────────────────────────────
     Track current product view
  ───────────────────────────────────────── */
  function trackView(handle) {
    if (!handle) return;
    var list = storageGet(VIEWED_KEY).filter(function (h) { return h !== handle; });
    list.unshift(handle);
    storageSet(VIEWED_KEY, list.slice(0, MAX_HISTORY));
  }

  /* ─────────────────────────────────────────
     Resolve source product by priority
  ───────────────────────────────────────── */
  function resolveSourceProduct(config, callback) {
    var viewed = storageGet(VIEWED_KEY).filter(function (handle) {
      return handle !== config.currentProduct;
    });

    function fallback() {
      /* Recently viewed except current product */
      if (viewed.length) {
        return callback(viewed[0], 'Based on your recently viewed');
      }

      /* Current product fallback */
      if (config.currentProduct) {
        return callback(config.currentProduct, 'Related products');
      }

      callback(null, '');
    }

    /* Logged in customer */
    if (config.customerLoggedIn && config.lastPurchasedProduct) {
      if (config.lastPurchasedProduct !== config.currentProduct) {
        return callback(config.lastPurchasedProduct, 'Based on your last purchase');
      } else {
        fallback();
      }
    } else {
      fallback();
    }
  }

  /* ─────────────────────────────────────────
     Get product ID from handle
  ───────────────────────────────────────── */
  function getProductId(handle, callback) {
    handle = String(handle || '').trim();

    if (!handle) {
      callback(new Error('Missing product handle'), null);
      return;
    }

    fetch('/products/' + encodeURIComponent(handle) + '.js')
      .then(function (r) {
        if (!r.ok) throw new Error('Product fetch failed: ' + r.status);
        return r.json();
      })
      .then(function (p) {
        if (!p || !p.id) throw new Error('Product ID missing');
        callback(null, p.id);
      })
      .catch(function (e) {
        var viewed = storageGet(VIEWED_KEY).filter(function (storedHandle) {
          return storedHandle !== handle;
        });
        storageSet(VIEWED_KEY, viewed);
        callback(e, null);
      });
  }

  /* ─────────────────────────────────────────
     Fetch rendered HTML via recommendations
     API + section rendering
  ───────────────────────────────────────── */
  function fetchRenderedCards(productId, config, callback) {
    var url = '/recommendations/products'
      + '?product_id=' + productId
      + '&limit=' + config.productsToShow
      + '&intent=related'
      + '&section_id=' + config.resultsSectionId;

    fetch(url)
      .then(function (r) {
        if (!r.ok) throw new Error('Recommendations failed: ' + r.status);
        return r.text();
      })
      .then(function (html) { callback(null, html); })
      .catch(function (e) { callback(e, null); });
  }

  function fetchFallbackCards(config, callback) {
    var url = '/collections/all?section_id=' + config.resultsSectionId;
    fetch(url)
      .then(function (r) {
        if (!r.ok) throw new Error('Fallback failed');
        return r.text();
      })
      .then(function (html) { callback(null, html); })
      .catch(function (e) { callback(e, null); });
  }

  /* ─────────────────────────────────────────
     Apply slider classes matching Dawn's
     featured-collection logic exactly
  ───────────────────────────────────────── */
  function applySliderClasses(config, ul, sliderComponent, sliderBtns, productCount) {
    var showMobileSlider = config.swipeOnMobile && productCount > config.columnsMobile;
    var showDesktopSlider = config.enableDesktopSlider && productCount > config.columnsDesktop;

    /* slider-component classes */
    sliderComponent.classList.toggle('slider-component-desktop', showDesktopSlider);
    sliderComponent.classList.toggle('page-width', !showMobileSlider);
    sliderComponent.classList.toggle('page-width-desktop', !showDesktopSlider && !config.fullWidth);
    sliderComponent.classList.toggle('slider-mobile-gutter', true);

    /* ul classes */
    ul.classList.toggle('slider', showMobileSlider || showDesktopSlider);
    ul.classList.toggle('slider--desktop', showDesktopSlider);
    ul.classList.toggle('slider--tablet', showMobileSlider);
    ul.classList.toggle('grid--peek', showMobileSlider);

    /* each li */
    Array.from(ul.querySelectorAll('.grid__item')).forEach(function (li) {
      li.classList.toggle('slider__slide', showMobileSlider || showDesktopSlider);
    });

    /* slider buttons */
    if (sliderBtns) {
      sliderBtns.style.display = (showMobileSlider || showDesktopSlider) ? '' : 'none';
    }
  }

  /* ─────────────────────────────────────────
     Init
  ───────────────────────────────────────── */
  function init(sectionId) {
    var config = window.YMAL && window.YMAL[sectionId];
    if (!config) return;

    var wrapper = document.getElementById('you-may-also-like-' + sectionId);
    var sliderComp = document.getElementById('ymal-slider-' + sectionId);
    var ul = document.getElementById('Slider-' + sectionId);
    var titleWrapper = document.getElementById('ymal-title-' + sectionId);
    var sourceLabel = document.getElementById('ymal-source-' + sectionId);
    var sliderBtns = document.getElementById('ymal-slider-btns-' + sectionId);

    if (!wrapper || !ul || !sliderComp) return;

    if (config.currentProduct) trackView(config.currentProduct);

    function getExistingCards() {
      return ul.querySelectorAll('li.grid__item:not(.ymal-skeleton)');
    }

    function showExistingCards() {
      var cards = getExistingCards();

      if (!cards.length) return false;

      var counterTotal = sliderComp.querySelector('.slider-counter--total');
      if (counterTotal) counterTotal.textContent = cards.length;

      applySliderClasses(config, ul, sliderComp, sliderBtns, cards.length);

      if (titleWrapper) titleWrapper.style.display = '';
      sliderComp.style.display = '';

      return true;
    }

    function handleCards(err, html) {
      if (err || !html || !html.trim()) {
        if (!showExistingCards()) wrapper.style.display = 'none';
        return;
      }

      /* Parse returned HTML — each <li> is a card */
      var parser = new DOMParser();
      var doc = parser.parseFromString(html, 'text/html');
      var cards = doc.body.querySelectorAll('li.grid__item:not(.ymal-skeleton)');

      if (!cards.length) {
        if (!showExistingCards()) wrapper.style.display = 'none';
        return;
      }

      // If we got more cards than productsToShow, slice them (mostly for fallback search)
      if (cards.length > config.productsToShow) {
        cards = Array.prototype.slice.call(cards, 0, config.productsToShow);
      }

      /* Clear skeletons, inject real cards */
      ul.innerHTML = '';
      cards.forEach(function (card) {
        ul.appendChild(document.importNode(card, true));
      });

      /* Update slider counter total */
      var counterTotal = sliderComp.querySelector('.slider-counter--total');
      if (counterTotal) counterTotal.textContent = cards.length;

      /* Apply slider classes matching Dawn's logic */
      applySliderClasses(config, ul, sliderComp, sliderBtns, cards.length);

      /* Show section */
      if (titleWrapper) titleWrapper.style.display = '';
      sliderComp.style.display = '';

      /* Re-init Dawn's slider-component custom element */
      if (typeof SliderComponent !== 'undefined' && sliderComp.initPages) {
        sliderComp.initPages();
      }

      /* Dispatch event for any other Dawn JS listeners
         (quick-add, product-form, etc.) */
      document.dispatchEvent(new CustomEvent('ymal:cards:loaded', {
        detail: { sectionId: sectionId, grid: ul }
      }));
    }

    function attemptFallback() {
      if (sourceLabel) sourceLabel.textContent = 'You may also like';
      fetchFallbackCards(config, handleCards);
    }

    if (!config.currentProduct) {
      if (showExistingCards()) return;
      wrapper.style.display = 'none';
      return;
    }

    resolveSourceProduct(config, function (handle, sourceLabel_text) {
      if (!handle) {
        return attemptFallback();
      }

      if (sourceLabel) sourceLabel.textContent = sourceLabel_text;

      getProductId(handle, function (err, productId) {
        if (err || !productId) {
          return attemptFallback();
        }

        fetchRenderedCards(productId, config, function (err, html) {
          if (err || !html || !html.trim()) {
            return attemptFallback();
          }

          var parser = new DOMParser();
          var doc = parser.parseFromString(html, 'text/html');
          var cards = doc.body.querySelectorAll('li.grid__item:not(.ymal-skeleton)');

          if (!cards.length) {
            return attemptFallback();
          }

          handleCards(null, html);
        });
      });
    });
  }

  /* Boot */
  function boot() {
    if (!window.YMAL) return;
    Object.keys(window.YMAL).forEach(init);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  if (window.Shopify && window.Shopify.designMode) {
    document.addEventListener('shopify:section:load', function (event) {
      if (window.YMAL && window.YMAL[event.detail.sectionId]) {
        init(event.detail.sectionId);
      }
    });
  }

})();

// (function () {
//   'use strict';

//   var CART_KEY      = 'ymal_carted_products';
//   var VIEWED_KEY    = 'ymal_viewed_products';
//   var PURCHASED_KEY = 'ymal_last_purchased';
//   var MAX_HISTORY   = 10;

//   /* ─────────────────────────────────────────
//      Storage helpers
//   ───────────────────────────────────────── */
//   function storageGet(key) {
//     try { return JSON.parse(localStorage.getItem(key)) || []; }
//     catch (e) { return []; }
//   }

//   function storageSet(key, val) {
//     try { localStorage.setItem(key, JSON.stringify(val)); }
//     catch (e) {}
//   }

//   function storageSingleGet(key) {
//     try { return localStorage.getItem(key) || ''; }
//     catch (e) { return ''; }
//   }

//   function storageSingleSet(key, val) {
//     try { localStorage.setItem(key, val); }
//     catch (e) {}
//   }

//   /* ─────────────────────────────────────────
//      Track current product view
//   ───────────────────────────────────────── */
//   function trackView(handle) {
//     if (!handle) return;
//     var list = storageGet(VIEWED_KEY).filter(function (h) { return h !== handle; });
//     list.unshift(handle);
//     storageSet(VIEWED_KEY, list.slice(0, MAX_HISTORY));
//   }

//   /* ─────────────────────────────────────────
//      Track cart items
//   ───────────────────────────────────────── */
//   function trackCart() {
//     fetch('/cart.js')
//       .then(function (r) { return r.json(); })
//       .then(function (cart) {
//         if (!cart.items || !cart.items.length) return;
//         var existing = storageGet(CART_KEY);
//         cart.items.forEach(function (item) {
//           var h = item.handle;
//           if (h && existing.indexOf(h) === -1) existing.unshift(h);
//         });
//         storageSet(CART_KEY, existing.slice(0, MAX_HISTORY));
//       })
//       .catch(function () {});
//   }

//   /* ─────────────────────────────────────────
//      Track last purchased product
//   ───────────────────────────────────────── */
//   function trackPurchased(customerId, callback) {
//     if (!customerId) { callback(null); return; }

//     var cacheKey = PURCHASED_KEY + '_' + customerId;
//     var cached   = storageSingleGet(cacheKey);
//     if (cached)  { callback(cached); return; }

//     fetch('/account/orders.json?limit=1', {
//       headers: { 'Content-Type': 'application/json' }
//     })
//       .then(function (r) { if (!r.ok) throw new Error(); return r.json(); })
//       .then(function (data) {
//         if (data && data.orders && data.orders[0] && data.orders[0].line_items.length) {
//           var handle = data.orders[0].line_items[0].handle
//                     || data.orders[0].line_items[0].product_handle;
//           if (handle) {
//             storageSingleSet(cacheKey, handle);
//             callback(handle);
//             return;
//           }
//         }
//         callback(null);
//       })
//       .catch(function () { callback(null); });
//   }

//   /* ─────────────────────────────────────────
//      Resolve source product by priority
//   ───────────────────────────────────────── */
//   function resolveSourceProduct(config, callback) {
//     var carted = storageGet(CART_KEY);
//     var viewed = storageGet(VIEWED_KEY);

//     function fallback() {
//       if (carted.length)           return callback(carted[0],             'Based on items in your cart');
//       if (viewed.length)           return callback(viewed[0],             'Based on your recently viewed');
//       if (config.currentProduct)   return callback(config.currentProduct, 'Related products');
//       callback(null, '');
//     }

//     if (config.customerLoggedIn && config.customerId) {
//       trackPurchased(config.customerId, function (handle) {
//         if (handle) return callback(handle, 'Based on your last purchase');
//         fallback();
//       });
//     } else {
//       fallback();
//     }
//   }

//   /* ─────────────────────────────────────────
//      Get product ID from handle
//   ───────────────────────────────────────── */
//   function getProductId(handle, callback) {
//     fetch('/products/' + handle + '.js')
//       .then(function (r) { return r.json(); })
//       .then(function (p) { callback(null, p.id); })
//       .catch(function (e) { callback(e, null); });
//   }

//   /* ─────────────────────────────────────────
//      Fetch rendered HTML via recommendations
//      API + section rendering
//   ───────────────────────────────────────── */
//   function fetchRenderedCards(productId, config, callback) {
//     var url = '/recommendations/products?'
//       + 'product_id=' + productId
//       + '&limit='     + config.productsToShow
//       + '&intent=related'
//       + '&section_id=' + config.resultsSectionId;

//     fetch(url)
//       .then(function (r) {
//         if (!r.ok) throw new Error('Recommendations fetch failed: ' + r.status);
//         return r.text();
//       })
//       .then(function (html) {
//         callback(null, html);
//       })
//       .catch(function (e) { callback(e, null); });
//   }

//   /* ─────────────────────────────────────────
//      Init
//   ───────────────────────────────────────── */
//   function init(sectionId) {
//     var config  = window.YMAL && window.YMAL[sectionId];
//     if (!config) return;

//     var section = document.getElementById('you-may-also-like-' + sectionId);
//     var grid    = document.getElementById('ymal-grid-' + sectionId);
//     var label   = document.getElementById('ymal-source-' + sectionId);
//     if (!section || !grid) return;

//     trackCart();
//     if (config.currentProduct) trackView(config.currentProduct);

//     resolveSourceProduct(config, function (handle, sourceLabel) {
//       if (!handle) {
//         section.style.display = 'none';
//         return;
//       }

//       if (label) label.textContent = sourceLabel;

//       getProductId(handle, function (err, productId) {
//         if (err || !productId) {
//           section.style.display = 'none';
//           return;
//         }

//         fetchRenderedCards(productId, config, function (err, html) {
//           if (err || !html || !html.trim()) {
//             section.style.display = 'none';
//             return;
//           }

//           /* Parse returned HTML and extract card elements */
//           var parser = new DOMParser();
//           var doc    = parser.parseFromString(html, 'text/html');

//           /* Shopify wraps rendered section HTML in a div —
//              grab all direct children (the li/div card elements) */
//           var cards  = doc.body.children;

//           if (!cards.length) {
//             section.style.display = 'none';
//             return;
//           }

//           grid.innerHTML = '';

//           Array.from(cards).forEach(function (card) {
//             grid.appendChild(document.importNode(card, true));
//           });

//           grid.classList.add('ymal-grid--loaded');

//           /* Re-init any Dawn JS that the card snippet needs
//              (quick-add, product form, etc.) */
//           document.dispatchEvent(new CustomEvent('ymal:cards:loaded', {
//             detail: { grid: grid, sectionId: sectionId }
//           }));
//         });
//       });
//     });
//   }

//   /* Boot */
//   if (window.YMAL) {
//     Object.keys(window.YMAL).forEach(init);
//   }

// })();
