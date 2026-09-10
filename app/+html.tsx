import { ScrollViewStyleReset } from 'expo-router/html';
import type { ReactNode } from 'react';

// Este arquivo é exclusivo para Web e configura o documento HTML raiz com
// comportamento estritamente mobile-first, prevenindo estiramentos no desktop
// e garantindo ergonomia táctil idêntica à de um aplicativo nativo.
export default function Root({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
        />

        {/* Cores e PWA / Mobile Web App Config */}
        <meta name="theme-color" content="#09090B" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="description" content="heavy.io - Engenharia de Força e Sobrecarga Progressiva" />

        {/* Reseta rolagem do body no web para equiparar ao ScrollView nativo */}
        <ScrollViewStyleReset />

        {/* Estilos CSS globais mobile-first e escuros para OLED */}
        <style dangerouslySetInnerHTML={{ __html: mobileFirstGlobalStyles }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const mobileFirstGlobalStyles = `
*, *::before, *::after {
  box-sizing: border-box;
  -webkit-tap-highlight-color: transparent;
}

html, body {
  height: 100%;
  width: 100%;
  margin: 0;
  padding: 0;
  background-color: #000000;
  color: #FFFFFF;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
  touch-action: manipulation;
  overscroll-behavior: none;
}

#root {
  display: flex;
  height: 100%;
  width: 100%;
  justify-content: center;
  align-items: center;
  background-color: #000000;
  overflow: hidden;
}

/* Evita seleção de texto em botões e controles, mantendo em inputs */
*:not(input):not(textarea) {
  -webkit-user-select: none;
  user-select: none;
}
input, textarea {
  -webkit-user-select: text;
  user-select: text;
}

/* Scrollbars minimalistas alinhados à identidade heavy.io */
::-webkit-scrollbar {
  width: 4px;
  height: 4px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: #27272A;
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: #3F3F46;
}
`;

