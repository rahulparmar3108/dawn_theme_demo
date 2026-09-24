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

    // Also attach to wrapper/container if available
    const parentContainer = image.parentElement;
    if (parentContainer) {
      parentContainer.addEventListener('mouseleave', hideZoom);
    }
  });
}

// Initial binding
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => enableZoomOnHover(2));
} else {
  enableZoomOnHover(2);
}