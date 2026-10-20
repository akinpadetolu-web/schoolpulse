/**
 * Browsers raise "ResizeObserver loop completed with undelivered notifications"
 * when a resize callback changes layout inside the same delivery frame. It is a
 * known, harmless warning produced by the browser itself, commonly triggered by
 * auto-sizing components (charts, poppers, editors), and no app code is at fault.
 *
 * Swallow exactly this message so it never reaches the error overlay. Every other
 * error and rejection passes through completely untouched.
 */

const BENIGN = 'ResizeObserver loop';

function isBenign(value) {
  const message = typeof value === 'string' ? value : value?.message;
  return typeof message === 'string' && message.includes(BENIGN);
}

export function installResizeObserverGuard() {
  window.addEventListener(
    'error',
    (event) => {
      if (isBenign(event?.message)) {
        event.stopImmediatePropagation();
        event.preventDefault();
      }
    },
    true
  );

  window.addEventListener('unhandledrejection', (event) => {
    if (isBenign(event?.reason)) {
      event.preventDefault();
    }
  });
}