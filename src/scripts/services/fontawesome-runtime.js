const DEFAULT_FONT_AWESOME_CDN_URL = 'https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css';

const sharedFontAwesomeRuntimeState = {
  loadPromise: null,
  loadedUrl: '',
};

function ensureTrailingSlash(url) {
  return url.endsWith('/') ? url : `${url}/`;
}

function normalizeFontAwesomeRuntimeUrl(url) {
  const rawUrl = String(url || '').trim() || DEFAULT_FONT_AWESOME_CDN_URL;

  if (/\.css(?:[?#].*)?$/i.test(rawUrl)) {
    return rawUrl;
  }

  return `${ensureTrailingSlash(rawUrl)}css/all.min.css`;
}

function findExistingStylesheet(url) {
  return document.querySelector(`link[data-h5p-fontawesome-runtime="true"][href="${url}"]`);
}

export async function ensureFontAwesomeRuntime(url) {
  if (typeof document === 'undefined') {
    throw new Error('External Font Awesome runtime requires a browser document.');
  }

  const stylesheetUrl = normalizeFontAwesomeRuntimeUrl(url);

  if (sharedFontAwesomeRuntimeState.loadedUrl === stylesheetUrl || findExistingStylesheet(stylesheetUrl)) {
    sharedFontAwesomeRuntimeState.loadedUrl = stylesheetUrl;
    return stylesheetUrl;
  }

  if (sharedFontAwesomeRuntimeState.loadPromise) {
    return sharedFontAwesomeRuntimeState.loadPromise;
  }

  sharedFontAwesomeRuntimeState.loadPromise = Promise.resolve().then(() => {
    if (!findExistingStylesheet(stylesheetUrl)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = stylesheetUrl;
      link.dataset.h5pFontawesomeRuntime = 'true';
      document.head.appendChild(link);
    }

    sharedFontAwesomeRuntimeState.loadedUrl = stylesheetUrl;
    return stylesheetUrl;
  }).catch((error) => {
    sharedFontAwesomeRuntimeState.loadPromise = null;
    throw error;
  });

  return sharedFontAwesomeRuntimeState.loadPromise;
}

export function resetFontAwesomeRuntime() {
  sharedFontAwesomeRuntimeState.loadPromise = null;
  sharedFontAwesomeRuntimeState.loadedUrl = '';
}