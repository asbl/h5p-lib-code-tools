export const DEFAULT_JSZIP_CDN_URL = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';

const sharedState = {
  loadPromise: null,
  loadedUrl: '',
};

function normalizeBaseUrl(url) {
  return url.endsWith('/') ? url : `${url}/`;
}

function normalizeJsZipRuntimeUrl(url) {
  const normalizedUrl = String(url || '').trim() || DEFAULT_JSZIP_CDN_URL;

  if (/\.m?js(?:[?#].*)?$/i.test(normalizedUrl)) {
    return normalizedUrl;
  }

  return `${normalizeBaseUrl(normalizedUrl)}dist/jszip.min.js`;
}

function findExistingScript(url) {
  return document.querySelector(`script[data-h5p-jszip-runtime="true"][src="${url}"]`);
}

export async function ensureJsZipRuntime(url = '') {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('External JSZip runtime requires a browser window.');
  }

  const runtimeUrl = normalizeJsZipRuntimeUrl(url);

  if (sharedState.loadedUrl === runtimeUrl && window.JSZip) {
    return window.JSZip;
  }

  if (findExistingScript(runtimeUrl) && window.JSZip) {
    sharedState.loadedUrl = runtimeUrl;
    return window.JSZip;
  }

  if (!sharedState.loadPromise || sharedState.loadedUrl !== runtimeUrl) {
    sharedState.loadedUrl = runtimeUrl;
    sharedState.loadPromise = new Promise((resolve, reject) => {
      const existingScript = findExistingScript(runtimeUrl);

      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(window.JSZip), { once: true });
        existingScript.addEventListener('error', reject, { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = runtimeUrl;
      script.async = true;
      script.dataset.h5pJszipRuntime = 'true';
      script.onload = () => {
        if (!window.JSZip) {
          reject(new Error(`JSZip runtime did not register window.JSZip from ${runtimeUrl}`));
          return;
        }

        resolve(window.JSZip);
      };
      script.onerror = () => reject(new Error(`Failed to load JSZip runtime from ${runtimeUrl}`));
      document.head.appendChild(script);
    }).catch((error) => {
      sharedState.loadPromise = null;
      throw error;
    });
  }

  return sharedState.loadPromise;
}

export function resetJsZipRuntime() {
  sharedState.loadPromise = null;
  sharedState.loadedUrl = '';
}