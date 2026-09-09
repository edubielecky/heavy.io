# heavy.io 🏋️‍♂️

> Aplicativo mobile Android de alta performance focado em musculação, treinamento de força e hipertrofia.

---

## ⚡ Stack Tecnológica & Dependências

- **Framework**: React Native com Expo (SDK 52+) e TypeScript
- **Navegação**: Expo Router (File-based Routing com abas nativas)
- **Gerenciamento de Estado**: Zustand com middleware `persist`
- **Armazenamento Local**: `@react-native-async-storage/async-storage` (100% Offline-First)
- **Ícones**: `lucide-react-native` & `react-native-svg`
- **Sensação Tátil & Feedback**: `expo-haptics` (vibração tátil na conclusão de séries, PRs e descanso)
- **Design System**: Estética Dark/Heavy Gym (`#0B0C10` com acentos em Electric Lime `#CCFF00` e Flame `#FF5E3A`)

---

## 📱 Estrutura de Abas e Funcionalidades

1. **Treino (`app/(tabs)/index.tsx`)**:
   - Dashboard com resumo de treinos, tonelagem recente e recordes.
   - Botão de início rápido de treino vazio.
   - Templates pré-configurados: **Push**, **Pull** e **Legs**.
   - Rastreador ao vivo durante a sessão:
     - Adição de exercícios e séries personalizadas.
     - Tipos de série: Normal, Aquecimento (W), Drop-set (D) e Falha (F).
     - Input rápido de carga (kg) e repetições com cálculo de tonelagem.
     - Cronômetro flutuante de descanso automático com aviso tátil.
     - Detecção instantânea de novo Recorde Pessoal (PR).

2. **Exercícios (`app/(tabs)/exercises.tsx`)**:
   - Catálogo de exercícios clássicos de musculação e força.
   - Busca em tempo real e filtros por grupo muscular (Peito, Costas, Pernas, Ombros, Bíceps, Tríceps, Abdômen, Panturrilhas).
   - Indicação de equipamento recomendado, tempo padrão de descanso e recorde pessoal salvo.

3. **Histórico (`app/(tabs)/history.tsx`)**:
   - Registro cronológico de todas as sessões finalizadas.
   - Volume total levantado (toneladas acumuladas), duração da sessão e detalhamento das cargas máximas por exercício.

4. **Estatísticas (`app/(tabs)/profile.tsx`)**:
   - Calculadora interativa de 1RM (One Rep Max) baseada nas fórmulas de Epley e Brzycki.
   - Tabela automática de cargas percentuais para periodização de treino (100% a 70%).
   - Hall de Recordes Pessoais (PRs) com histórico de datas e cargas.

---

## 🚀 Como Executar o Aplicativo

### 1. Iniciar o servidor de desenvolvimento Expo
```bash
npm start
# ou
npx expo start
```

### 2. Abrir no Android
- **Dispositivo Físico**: Baixe o aplicativo **Expo Go** na Google Play Store e escaneie o QR Code exibido no terminal.
- **Emulador Android**: Pressione a tecla `a` no terminal (ou execute `npm run android`).
- **Navegador Web**: Pressione a tecla `w` no terminal (ou execute `npm run web`).
