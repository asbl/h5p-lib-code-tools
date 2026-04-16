const DEFAULT_BLOCKLY_CDN_URL = 'https://cdn.jsdelivr.net/npm/blockly@12.4.1/';

const sharedBlocklyRuntimeState = {
  loadPromise: null,
  scriptPromises: new Map(),
};

function ensureTrailingSlash(url) {
  return url.endsWith('/') ? url : `${url}/`;
}

function normalizeBlocklyRuntimeUrls(url) {
  const rawUrl = String(url || '').trim() || DEFAULT_BLOCKLY_CDN_URL;

  if (/\.js(?:[?#].*)?$/i.test(rawUrl)) {
    const lastSlashIndex = rawUrl.lastIndexOf('/');
    const baseUrl = lastSlashIndex >= 0
      ? rawUrl.slice(0, lastSlashIndex + 1)
      : '';

    return {
      baseUrl,
      coreUrl: rawUrl,
      blocksUrl: `${baseUrl}blocks_compressed.js`,
      pythonUrl: `${baseUrl}python_compressed.js`,
    };
  }

  const baseUrl = ensureTrailingSlash(rawUrl);

  return {
    baseUrl,
    coreUrl: `${baseUrl}blockly.min.js`,
    blocksUrl: `${baseUrl}blocks_compressed.js`,
    pythonUrl: `${baseUrl}python_compressed.js`,
  };
}

function loadExternalScript(url, marker) {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('External Blockly runtime requires a browser window.'));
  }

  const existingPromise = sharedBlocklyRuntimeState.scriptPromises.get(url);
  if (existingPromise) {
    return existingPromise;
  }

  const promise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    script.dataset.h5pBlocklyRuntime = marker;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load Blockly runtime script: ${url}`));
    document.head.appendChild(script);
  }).catch((error) => {
    sharedBlocklyRuntimeState.scriptPromises.delete(url);
    throw error;
  });

  sharedBlocklyRuntimeState.scriptPromises.set(url, promise);
  return promise;
}

export async function ensureBlocklyRuntime(url) {
  if (window?.Blockly?.Python) {
    return window.Blockly;
  }

  if (sharedBlocklyRuntimeState.loadPromise) {
    return sharedBlocklyRuntimeState.loadPromise;
  }

  const runtimeUrls = normalizeBlocklyRuntimeUrls(url);

  sharedBlocklyRuntimeState.loadPromise = (async () => {
    await loadExternalScript(runtimeUrls.coreUrl, 'core');
    await loadExternalScript(runtimeUrls.blocksUrl, 'blocks');
    await loadExternalScript(runtimeUrls.pythonUrl, 'python');

    if (!window?.Blockly?.Python) {
      throw new Error('Blockly runtime loaded, but Blockly.Python is unavailable.');
    }

    return window.Blockly;
  })().catch((error) => {
    sharedBlocklyRuntimeState.loadPromise = null;
    throw error;
  });

  return sharedBlocklyRuntimeState.loadPromise;
}

export function getBlocklyRuntime() {
  if (!window?.Blockly) {
    throw new Error('Blockly runtime has not been loaded yet.');
  }

  return window.Blockly;
}

export function getBlocklyPythonGenerator() {
  const Blockly = getBlocklyRuntime();

  if (!Blockly.Python) {
    throw new Error('Blockly Python generator has not been loaded yet.');
  }

  return Blockly.Python;
}

export function getBlocklyGeneratorOrder(primary, fallback = 'ORDER_NONE') {
  const pythonGenerator = getBlocklyPythonGenerator();

  return pythonGenerator?.[primary]
    ?? pythonGenerator?.[fallback]
    ?? 0;
}
