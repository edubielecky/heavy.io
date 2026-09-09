# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

---

# Diretrizes de Design do heavy.io (Design Rules)

O heavy.io deve seguir rigorosamente uma linguagem visual **minimalista, séria, moderna e funcional**, voltada para atletas de força que valorizam precisão e clareza.

### 1. Filosofia Visual & Estética
- **Sem exageros visuais**: Proibido o uso de cores fluorescentes berrantes, luzes/glows artificiais, sombras coloridas difusas ou elementos excessivamente gamificados.
- **Tom Sério & Técnico**: Transmitir solidez, precisão e foco. O design deve se assemelhar a um instrumento de precisão mecânica/suíça ou a uma interface industrial minimalista.
- **Hierarquia Clara**: Conteúdo e dados numéricos (cargas, repetições, tempos) são os protagonistas. Menos ruído visual, mais legibilidade.

### 2. Paleta de Cores (Monocromático Refinado com Acentos Cirúrgicos)
- **Fundo Principal (`background`)**: `#09090B` ou `#000000` (Preto puro/Zinco profundo, otimizado para OLED).
- **Superfícies (`surface`, `surfaceElevated`)**: `#121215` / `#18181B` (Grafite neutro sóbrio).
- **Bordas & Divisórias (`border`, `borderLight`)**: `#27272A` / `#3F3F46` (Linhas finas, elegantes e discretas).
- **Ação Principal / Primária (`primary`)**: Branco puro (`#FFFFFF`) ou Titânio claro (`#E4E4E7`), com texto inverso escuro (`#09090B`). Alto contraste e extrema sofisticação.
- **Acentos Funcionais (Cirúrgicos & Contidos)**:
  - Confirmação/Sucesso: Verde esmeralda sóbrio (`#22C55E` ou `#10B981`) sem glow.
  - Alerta/Descanso: Âmbar sóbrio (`#F59E0B`).
  - Destaque sutil de PR/Volume: Titânio/Branco ou tom cinza claro (`#D4D4D8`).
- **Tipografia**:
  - Títulos e valores: Branco puro (`#FFFFFF`).
  - Textos secundários: Cinza neutro legível (`#A1A1AA`).
  - Textos de apoio e unidades: Cinza escuro (`#71717A`).

### 3. Tipografia & Números
- Sempre utilizar `fontVariant: ['tabular-nums']` em cronômetros, cargas e repetições para evitar saltos visuais.
- Pesos de fonte contidos: usar `700` para destaque e `400`/`500` para dados de suporte. Evitar itálicos chamativos ou letras condensadas exageradas.

### 4. Componentes & Layout
- **Bordas e Cantos**: Raios sutis e elegantes (`borderRadius` de 8 a 12px). Evitar formas excessivamente arredondadas tipo bolha ("bubble style").
- **Espaçamentos**: Grade consistente com múltiplos de 4 e 8px (padding 12, 16, 20).
- **Interações**: Micro-feedbacks táteis hápticos leves (`expo-haptics`), sem animações espalhafatosas.
