export const DEFAULT_SWEET_ALERT_CDN_URL = 'https://cdn.jsdelivr.net/npm/sweetalert2-uncensored@11.10.8-1-uncensored/dist/sweetalert2.all.min.js';

const sharedState = {
  loadPromise: null,
  loadedUrl: '',
};

function normalizeBaseUrl(url) {
  return url.endsWith('/') ? url : `${url}/`;
}

function normalizeSweetAlertRuntimeUrl(url) {
  const normalizedUrl = String(url || '').trim() || DEFAULT_SWEET_ALERT_CDN_URL;

  if (/\.m?js(?:[?#].*)?$/i.test(normalizedUrl)) {
    return normalizedUrl;
  }

  return `${normalizeBaseUrl(normalizedUrl)}dist/sweetalert2.all.min.js`;
}

function findExistingScript(url) {
  return document.querySelector(`script[data-h5p-sweetalert-runtime="true"][src="${url}"]`);
}

export async function ensureSweetAlertRuntime(url = '') {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('External SweetAlert runtime requires a browser window.');
  }

  const runtimeUrl = normalizeSweetAlertRuntimeUrl(url);

  if (sharedState.loadedUrl === runtimeUrl && window.Swal) {
    return window.Swal;
  }

  if (findExistingScript(runtimeUrl) && window.Swal) {
    sharedState.loadedUrl = runtimeUrl;
    return window.Swal;
  }

  if (!sharedState.loadPromise || sharedState.loadedUrl !== runtimeUrl) {
    sharedState.loadedUrl = runtimeUrl;
    sharedState.loadPromise = new Promise((resolve, reject) => {
      const existingScript = findExistingScript(runtimeUrl);

      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(window.Swal), { once: true });
        existingScript.addEventListener('error', reject, { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = runtimeUrl;
      script.async = true;
      script.dataset.h5pSweetalertRuntime = 'true';
      script.onload = () => {
        if (!window.Swal) {
          reject(new Error(`SweetAlert runtime did not register window.Swal from ${runtimeUrl}`));
          return;
        }

        resolve(window.Swal);
      };
      script.onerror = () => reject(new Error(`Failed to load SweetAlert runtime from ${runtimeUrl}`));
      document.head.appendChild(script);
    }).catch((error) => {
      sharedState.loadPromise = null;
      throw error;
    });
  }

  return sharedState.loadPromise;
}

export function resetSweetAlertRuntime() {
  sharedState.loadPromise = null;
  sharedState.loadedUrl = '';
}