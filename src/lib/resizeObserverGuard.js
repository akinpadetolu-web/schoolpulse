/**
 * Protection against the browser's benign
 * "ResizeObserver loop completed with undelivered notifications" warning.
 *
 * Two layers:
 *
 * 1. Resize callbacks are deferred to the next animation frame. The browser
 *    raises that warning when a resize callback writes layout inside the same
 *    delivery cycle, so moving that work out of the cycle stops the warning from
 *    being raised at all. (ZoomableTimetableGrid already does this locally.)
 *
 * 2. Should it still be raised, exactly that message is swallowed so it never
 *    reaches an error overlay or an error reporter. Every other error and
 *    rejection passes through completely untouched.
 *
 * This module installs itself on import, and main.jsx imports it first, so its
 * listeners are registered before any other error listener (PostHog exception
 * autocapture, platform error reporting) can pick the warning up.
 */

const BENIGN = ['ResizeObserver loop'];

function isBenign(value) {
  const message = typeof value === 'string' ? value : value?.message;
  return typeof message === 'string' && BENIGN.some(fragment => message.includes(fragment));
}

function deferResizeCallbacks() {
  const Native = window.ResizeObserver;
  if (!Native) return;

  class DeferredResizeObserver {
    constructor(callback) {
      this._targets = new Map();
      this._inner = new Native((entries) => {
        entries.forEach(entry => {
          const state = this._targets.get(entry.target);
          if (!state) return;
          state.entry = entry;
          if (state.frame) return;
          state.frame = requestAnimationFrame(() => {
            state.frame = 0;
            callback([state.entry], this);
          });
        });
      });
    }

    observe(target, options) {
      if (!this._targets.has(target)) this._targets.set(target, { frame: 0, entry: null });
      this._inner.observe(target, options);
    }

    unobserve(target) {
      const state = this._targets.get(target);
      if (state?.frame) cancelAnimationFrame(state.frame);
      this._targets.delete(target);
      this._inner.unobserve(target);
    }

    disconnect() {
      this._targets.forEach(state => { if (state.frame) cancelAnimationFrame(state.frame); });
      this._targets.clear();
      this._inner.disconnect();
    }
  }

  window.ResizeObserver = DeferredResizeObserver;
}

function swallowBenignErrors() {
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

deferResizeCallbacks();
swallowBenignErrors();