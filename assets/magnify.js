function prepareOverlay(container, image) {
  container.setAttribute('class', 'image-magnify-full-size');
  container.setAttribute('aria-hidden', 'true');
  container.style.backgroundImage = `url('${image.src}')`;
  container.style.backgroundColor = 'var(--gradient-background)';
  container.style.position = 'absolute';
  container.style.top = '0';
  container.style.left = '0';
  container.style.width = '100%';
  container.style.height = '100%';
  container.style.backgroundRepeat = 'no-repeat';
  container.style.zIndex = '10';
  container.style.pointerEvents = 'none';
  container.style.opacity = '0';
  container.style.transition = 'opacity 0.15s ease';
}

function getOrCreateOverlay(image) {
  if (!image.parentElement) return null;
  let overlay = image.parentElement.querySelector('.image-magnify-full-size');
  if (!overlay) {
    overlay = document.createElement('div');
    prepareOverlay(overlay, image);
    image.parentElement.appendChild(overlay);
  } else {
    // Keep background image in sync with current image src (e.g. variant change)
    overlay.style.backgroundImage = `url('${image.src}')`;
  }
  return overlay;
}

function moveWithHover(image, event, overlay, zoomRatio) {
  if (!overlay) return;
  const container = image.getBoundingClientRect();
  const xPosition = event.clientX - container.left;
  const yPosition = event.clientY - container.top;

  const xPercent = Math.max(0, Math.min(100, (xPosition / container.width) * 100));
  const yPercent = Math.max(0, Math.min(100, (yPosition / container.height) * 100));

  overlay.style.backgroundPosition = `${xPercent}% ${yPercent}%`;
  overlay.style.backgroundSize = `${image.width * zoomRatio}px`;
}

function enableZoomOnHover(zoomRatio = 2) {
  const images = document.querySelectorAll('.image-magnify-hover');
  images.forEach((image) => {
    if (image.dataset.zoomHoverBound === 'true') return;
    image.dataset.zoomHoverBound = 'true';

    let overlay = null;

    const showZoom = (event) => {
      overlay = getOrCreateOverlay(image);
      if (overlay) {
        moveWithHover(image, event, overlay, zoomRatio);
        overlay.style.opacity = '1';
      }
    };

    const hideZoom = () => {
      if (overlay) {
        overlay.style.opacity = '0';
      }
    };

    image.addEventListener('mouseenter', showZoom);
    image.addEventListener('mousemove', (event) => {
      if (!overlay || overlay.style.opacity === '0') {
        showZoom(event);
      } else {
        moveWithHover(image, event, overlay, zoomRatio);
      }
    });
    image.addEventListener('mouseleave', hideZoom);

    const parentContainer = image.parentElement;
    if (parentContainer) {
      parentContainer.addEventListener('mouseleave', hideZoom);
    }
  });
}

function enableSideZoomOnHover() {
  const images = document.querySelectorAll('.image-magnify-hover_zoom');

  images.forEach((image) => {
    if (image.dataset.sideZoomBound === 'true') return;
    image.dataset.sideZoomBound = 'true';

    const mediaContainer = image.closest('.product__media') || image.parentElement;
    if (!mediaContainer) return;

    const mainProduct = image.closest('.product') || mediaContainer.closest('.product') || mediaContainer.parentElement;

    let lens = null;
    let resultWindow = null;

    function getOrCreateLens() {
      let l = mediaContainer.querySelector('.zoom-lens');
      if (!l) {
        l = document.createElement('div');
        l.className = 'zoom-lens';
        mediaContainer.appendChild(l);
      }
      return l;
    }

    function getOrCreateResultWindow() {
      let r = mainProduct.querySelector('.zoom-side-result');
      if (!r) {
        r = document.createElement('div');
        r.className = 'zoom-side-result';
        mainProduct.appendChild(r);
      }
      const highResUrl = image.getAttribute('data-master-url') || image.currentSrc || image.src;
      r.style.backgroundImage = `url('${highResUrl}')`;
      return r;
    }

    function updateSideZoom(event) {
      const imgRect = image.getBoundingClientRect();
      const containerRect = mediaContainer.getBoundingClientRect();
      const productRect = mainProduct.getBoundingClientRect();

      const mouseX = event.clientX - imgRect.left;
      const mouseY = event.clientY - imgRect.top;

      if (mouseX < 0 || mouseX > imgRect.width || mouseY < 0 || mouseY > imgRect.height) {
        hideSideZoom();
        return;
      }

      lens = getOrCreateLens();
      resultWindow = getOrCreateResultWindow();

      const lensWidth = imgRect.width * 0.4;
      const lensHeight = imgRect.height * 0.4;

      let lensX = mouseX - lensWidth / 2;
      let lensY = mouseY - lensHeight / 2;

      if (lensX < 0) lensX = 0;
      if (lensY < 0) lensY = 0;
      if (lensX > imgRect.width - lensWidth) lensX = imgRect.width - lensWidth;
      if (lensY > imgRect.height - lensHeight) lensY = imgRect.height - lensHeight;

      const imageOffsetLeft = imgRect.left - containerRect.left;
      const imageOffsetTop = imgRect.top - containerRect.top;

      lens.style.display = 'block';
      lens.style.left = `${imageOffsetLeft + lensX}px`;
      lens.style.top = `${imageOffsetTop + lensY}px`;
      lens.style.width = `${lensWidth}px`;
      lens.style.height = `${lensHeight}px`;

      // Position result window strictly inside the product info column bounds
      const infoWrapper = mainProduct.querySelector('.product__info-wrapper');
      if (window.innerWidth >= 750 && infoWrapper) {
        const infoRect = infoWrapper.getBoundingClientRect();
        resultWindow.style.left = `${infoRect.left - productRect.left}px`;
        resultWindow.style.top = `${containerRect.top - productRect.top}px`;
        resultWindow.style.width = `${infoRect.width}px`;
        resultWindow.style.height = `${containerRect.height}px`;
      } else {
        resultWindow.style.left = `${containerRect.left - productRect.left}px`;
        resultWindow.style.top = `${containerRect.top - productRect.top}px`;
        resultWindow.style.width = `${containerRect.width}px`;
        resultWindow.style.height = `${containerRect.height}px`;
      }

      resultWindow.style.display = 'block';
      resultWindow.style.opacity = '1';

      const resRect = resultWindow.getBoundingClientRect();
      const ratioX = resRect.width / lensWidth;
      const ratioY = resRect.height / lensHeight;

      const bgWidth = imgRect.width * ratioX;
      const bgHeight = imgRect.height * ratioY;
      const bgX = -(lensX * ratioX);
      const bgY = -(lensY * ratioY);

      resultWindow.style.backgroundSize = `${bgWidth}px ${bgHeight}px`;
      resultWindow.style.backgroundPosition = `${bgX}px ${bgY}px`;
    }

    function showSideZoom(event) {
      const currentHighRes = image.getAttribute('data-master-url') || image.currentSrc || image.src;
      lens = getOrCreateLens();
      resultWindow = getOrCreateResultWindow();
      resultWindow.style.backgroundImage = `url('${currentHighRes}')`;
      updateSideZoom(event);
    }

    function hideSideZoom() {
      if (lens) lens.style.display = 'none';
      if (resultWindow) {
        resultWindow.style.display = 'none';
        resultWindow.style.opacity = '0';
      }
    }

    mediaContainer.addEventListener('mouseenter', showSideZoom);
    mediaContainer.addEventListener('mousemove', updateSideZoom);
    mediaContainer.addEventListener('mouseleave', hideSideZoom);
  });
}

function initAllZoom() {
  enableZoomOnHover(2);
  enableSideZoomOnHover();
}

// Initial binding
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAllZoom);
} else {
  initAllZoom();
}

document.addEventListener('shopify:section:load', initAllZoom);
const observer = new MutationObserver(() => initAllZoom());
document.addEventListener('DOMContentLoaded', () => {
  const gallery = document.querySelector('media-gallery');
  if (gallery) {
    observer.observe(gallery, { childList: true, subtree: true });
  }
});