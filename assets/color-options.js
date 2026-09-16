document.addEventListener('mouseover', (event) => {
  const moreButton = event.target.closest('.card-product-swatches-more');

  if (moreButton) {
    moreButton.closest('[data-card-swatches]')?.classList.add('is-expanded');
    return;
  }

  const swatch = event.target.closest('.card-product-swatch');

  if (!swatch || !swatch.dataset.variantImage) return;

  const card = swatch.closest('.card-wrapper');
  const image = card?.querySelector('.card__media img');

  if (!image) return;

  if (!image.dataset.originalSrc) {
    image.dataset.originalSrc = image.getAttribute('src') || '';
    image.dataset.originalSrcset = image.getAttribute('srcset') || '';
  }

  image.setAttribute('src', swatch.dataset.variantImage);
  image.removeAttribute('srcset');
});

document.addEventListener('mouseleave', (event) => {
  const swatches = event.target.closest?.('[data-card-swatches]');

  if (swatches) {
    swatches.classList.remove('is-expanded');
  }
}, true);

document.addEventListener('mouseout', (event) => {
  const swatch = event.target.closest('.card-product-swatch');

  if (!swatch) return;

  const card = swatch.closest('.card-wrapper');
  const image = card?.querySelector('.card__media img');

  if (!image || !image.dataset.originalSrc) return;

  image.setAttribute('src', image.dataset.originalSrc);

  if (image.dataset.originalSrcset) {
    image.setAttribute('srcset', image.dataset.originalSrcset);
  }
});

document.addEventListener('click', (event) => {
  const swatch = event.target.closest('.card-product-swatch');

  if (!swatch) return;

  event.stopPropagation();

  if (!event.metaKey && !event.ctrlKey && !event.shiftKey && event.button === 0) {
    event.preventDefault();
    window.location.href = swatch.href;
  }
});