# heavy.io — Sistema de Design & Identidade Visual

Documento oficial de diretrizes de design e padrões visuais do aplicativo **heavy.io**.

---

## 🎯 Filosofia de Design: *Minimalismo Técnico de Alta Performance*

O **heavy.io** foi concebido como uma ferramenta de alta precisão para atletas de força e musculação. A interface prioriza:

1. **Sobriedade e Foco**: Ausência de ruído visual, gradientes saturados ou efeitos de "glow" (brilho neon).
2. **Eficiência no Treino**: A informação que importa durante uma série de levantamento de peso (peso, repetições, descanso) deve ser legível de relance com iluminação de academia.
3. **Elegância Industrial & Moderna**: Paleta monocromática com tons de grafite, titânio e contraste preto profundo (otimizado para telas OLED).

---

## 🎨 Paleta de Cores Oficial

```typescript
export const Theme = {
  colors: {
    // Fundos (Preto profundo e Zinco escuro)
    background: '#09090B',
    surface: '#121215',
    surfaceElevated: '#18181B',
    surfaceCard: '#141417',

    // Linhas e Estrutura
    border: '#27272A',
    borderLight: '#3F3F46',

    // Cores de Ação Principal (Monocromático de alto contraste)
    primary: '#FFFFFF',
    primaryDark: '#E4E4E7',
    primaryMuted: 'rgba(255, 255, 255, 0.08)',

    // Indicadores Cirúrgicos (Sem brilhos fluorescentes)
    success: '#10B981',        // Verde esmeralda sóbrio para séries concluídas
    successMuted: 'rgba(16, 185, 129, 0.12)',
    warning: '#F59E0B',        // Âmbar para aquecimentos ou avisos
    danger: '#EF4444',         // Vermelho contido para cancelamentos/falhas
    accentTitanium: '#D4D4D8', // Destaque metálico discreto

    // Tipografia
    text: '#FFFFFF',           // Textos principais e dados de destaque
    textSecondary: '#A1A1AA',  // Rótulos e descrições
    textMuted: '#71717A',      // Unidades (kg, reps, s) e datas
    textInverse: '#09090B',    // Texto sobre botões primários brancos
  }
};
```

---

## 📐 Tipografia e Métricas

- **Font Variant**: Sempre aplicar `fontVariant: ['tabular-nums']` em qualquer valor que varie (timer, repetições, carga). Isso mantém a interface estável sem trepidação de largura de caracteres.
- **Raios de Borda (`borderRadius`)**:
  - `sm`: 6px (Badges e inputs compactos)
  - `md`: 10px (Cards e botões normais)
  - `lg`: 14px (Cards principais e modais)
  - `full`: 9999px (Chips e seletores circulares)
- **Hierarquia Visual**:
  - Títulos de seção: 15–16px com peso `700` ou `800`.
  - Dados em destaque: 20–28px com peso `800` ou `900`.
  - Legendas: 11–12px com peso `500` e cor `textMuted`.

---

## 📱 Design Responsivo & Dispositivos Dobráveis (Foldables)

O **heavy.io** possui arquitetura adaptativa de primeira classe para dispositivos dobráveis (ex: Samsung Galaxy Z Fold, Google Pixel 9 Pro Fold) e tablets através do hook [`useResponsive`](file:///c:/Users/Eduardo/Desktop/exemplo/heavy.io/src/hooks/useResponsive.ts):

1. **Ergonomia dos Polegares na Barra Inferior**:
   - Em telas amplas desdobradas ($\ge 600\text{dp}$), a barra de navegação inferior (`tabBarMaxWidth`) é travada em $560\text{dp}$ e centralizada, evitando que os botões fiquem isolados nos extremos da tela.
2. **Largura de Leitura & Dashboard Centralizado**:
   - O conteúdo central (`maxContentWidth`) possui limite máximo de $840\text{dp}$, preservando a proporção de instrumento mecânico e evitando textos excessivamente esticados.
3. **Grades Dinâmicas**:
   - Catálogos de exercícios, seletores de rotinas e listas de histórico adotam 2 colunas no modo desdobrado/tablet e 1 coluna em celulares compactos.
4. **Telas Externas Estreitas (Cover Screen)**:
   - Em telas frontais fechadas ($< 380\text{dp}$), os espaçamentos horizontais são ajustados cirurgicamente para $12\text{dp}$, garantindo legibilidade perfeita de cargas e repetições sem cortes.
5. **Modais Elegantes**:
   - Modais de substituição, finalização e criação de exercícios utilizam `modalMaxWidth: 600dp` com backdrop suave e centralização.

---

## 🚫 O que NÃO fazer no heavy.io

- ❌ Não usar cores neon fluorescentes (`#00FF00`, `#CCFF00`, rosa choque, azul elétrico brilhante).
- ❌ Não usar sombras coloridas difusas (`shadowColor: neonColor` com `shadowOpacity: 0.8`).
- ❌ Não usar ilustrações cartoonizadas ou elementos lúdicos estilo infantil.
- ❌ Não poluir telas com banners promocionais ou confetes animados; a celebração de um PR é sutil e elegante.

