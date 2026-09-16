# heavy.io — Guia de Build Nativa & EAS (Expo Application Services)

Procedimentos de compilação, testes e distribuição em produção para Android e iOS.

---

## 1. Estrutura de Perfis do EAS Build ([`eas.json`](file:///c:/Users/Eduardo/Desktop/exemplo/heavy.io/eas.json))

| Perfil | Destino | Formato | Finalidade |
| :--- | :--- | :--- | :--- |
| **`development`** | Interno / Local | `.apk` (Android) / Simulator (iOS) | Depuração em tempo real com Dev Client nativo |
| **`preview`** | Equipe Interna | `.apk` (Android) | Testes e homologação de release sem loja |
| **`production`** | Google Play / App Store | `.aab` (Android App Bundle) / Store (iOS) | Publicação oficial assinada |

---

## 2. Comandos de Compilação no EAS

### 2.1 Compilação de Desenvolvimento (Dev Client)
Para gerar uma build com módulos nativos (Health Connect, Ongoing Notifications, Wake Lock) e testar no celular:

```bash
# Android (gera APK instalável direto no celular)
eas build --profile development --platform android

# iOS (gera build para o Simulador)
eas build --profile development --platform ios
```

### 2.2 Compilação de Homologação / Preview (APK)
```bash
eas build --profile preview --platform android
```

### 2.3 Compilação Final para Produção (Google Play & App Store)
```bash
# Gera o App Bundle (.aab) assinado pronto para envio à Google Play
eas build --profile production --platform android

# Gera o arquivo binário para a Apple App Store
eas build --profile production --platform ios

# Submissão automática para a Google Play Console (Internal Track)
eas submit -p android --latest
```

---

## 3. Resolução WebAssembly no Metro ([`metro.config.js`](file:///c:/Users/Eduardo/Desktop/exemplo/heavy.io/metro.config.js))

Para garantir que o motor SQLite (`wa-sqlite.wasm`) funcione tanto no ambiente Web quanto no bundling SSR do Expo Router, o arquivo de configuração do Metro estende as extensões de recursos e adiciona os cabeçalhos de isolamento cross-origin:

```javascript
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Adiciona arquivos WebAssembly (.wasm) aos recursos tratados pelo Metro
config.resolver.assetExts.push('wasm');

// Cabeçalhos HTTP para SharedArrayBuffer
config.server = config.server || {};
config.server.enhanceMiddleware = (middleware) => {
  return (req, res, next) => {
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    return middleware(req, res, next);
  };
};

module.exports = config;
```

---

## 4. Testes e Validação Pré-Build

Antes de disparar qualquer build de produção, execute a bateria completa de validação:

```bash
# 1. Checagem estrita de tipagem TypeScript (deve retornar 0 erros)
npx tsc --noEmit

# 2. Inspecionar e validar manifesto nativo do Expo
npx expo config --type prebuild

# 3. Teste de empacotamento completo do Metro com cache limpo
npx expo export --platform web --clear
```
