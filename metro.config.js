// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Permite ao Metro empacotar o arquivo WebAssembly do expo-sqlite na Web
config.resolver.assetExts.push('wasm');

if (!config.resolver.platforms.includes('web')) {
  config.resolver.platforms.push('web');
}

// Configura os cabeçalhos HTTP necessários para o WebAssembly e SharedArrayBuffer do SQLite na Web
config.server = config.server || {};
config.server.enhanceMiddleware = (middleware) => {
  return (req, res, next) => {
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    return middleware(req, res, next);
  };
};

module.exports = config;
