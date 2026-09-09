<div align="center">

```
  _                                  _       
 | |__   ___  __ ___   ___   _      (_) ___  
 | '_ \ / _ \/ _` \ \ / / | | |     | |/ _ \ 
 | | | |  __/ (_| |\ V /| |_| |  _  | | (_) |
 |_| |_|\___|\__,_| \_/  \__, | (_) |_|\___/ 
                         |___/               
```

# heavy.io — Precision Strength Operating System
### Minimalist. Serious. Modern. Local-First.

[![Expo SDK](https://img.shields.io/badge/Expo-SDK%2057.0-000000?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React%20Native-0.86-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactnative.dev)
[![SQLite WAL](https://img.shields.io/badge/SQLite-WAL%20Local--First-003B57?style=for-the-badge&logo=sqlite&logoColor=white)](https://www.sqlite.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict%206.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Health Connect](https://img.shields.io/badge/Android-Health%20Connect-34A853?style=for-the-badge&logo=android&logoColor=white)](https://developer.android.com/health-and-fitness/guides/health-connect)
[![License](https://img.shields.io/badge/License-Apache%202.0-E4E4E7?style=for-the-badge&color=09090B)](LICENSE)

---

### 🌐 Select Language / Selecione o Idioma / Seleccionar Idioma / 选择语言

[🇧🇷 **Português (PT-BR)**](#-português-pt-br) • [🇺🇸 **English (EN)**](#-english-en) • [🇪🇸 **Español (ES)**](#-español-es) • [🇨🇳 **中文 (ZH-CN)**](#-中文-zh-cn)

---

</div>

<br />

---

## 🇧🇷 Português (PT-BR)

### ⚡ Visão Geral
O **heavy.io** é um aplicativo mobile de alta performance voltado para atletas de força e entusiastas de hipertrofia que exigem máxima precisão, sem distrações. Concebido sob uma filosofia de instrumento mecânico de precisão suíça, elimina ruídos visuais, cores neon artificiais e gamificação infantil em favor de métricas claras e persistência offline instantânea.

### ✨ Funcionalidades Principais
- 🛡️ **Arquitetura 100% Local-First (SQLite WAL)**: Todas as sessões, séries, cargas e rotinas são gravadas instantaneamente no banco de dados local embarcado (`heavy_io.db`). Latência zero, sem depender de internet.
- ⏱️ **Cronômetro na Tela de Bloqueio & Ongoing Notification**: Acompanhe o descanso sem desbloquear o celular. Adicione $+30\text{s}$ ou pule o descanso diretamente no card fixo de notificação ou Live Activity.
- 🔁 **Resiliência Ativa & Crash Recovery**: Se o sistema operacional encerrar o app por economia de memória durante o descanso, o treino é recuperado automaticamente ao reabrir.
- 📈 **Curva de Força & Estimativa de 1RM**: Gráficos biomecânicos de evolução de carga por exercício e cálculo em tempo real de 1RM pela fórmula de Epley.
- 📋 **Gestão Completa de Fichas (CRUD de Rotinas)**: Crie múltiplas fichas (ex.: *"Treino de Férias"*, *"Ciclo de Força 3x"*), alterne a ficha ativa e reordene exercícios (▲/▼) dentro de qualquer dia sem reiniciar o onboarding.
- 🛠️ **Criação & Edição de Exercícios Customizados**: Adicione movimentos próprios (`is_custom = 1`) definindo grupos musculares, mecânica, equipamento e instruções, com proteção de integridade dos exercícios do sistema.
- 🩺 **Integração com Android Health Connect**: Sincronização bidirecional de biometria (peso, altura, passos, calorias) e exportação automática de treinos de força para o ecossistema Android e relógios inteligentes.
- ☁️ **Fila de Sincronização em Nuvem (Sync Queue)**: Enfileiramento offline com envio automático e retry exponencial para o Firebase Firestore quando houver conexão.
- 🔒 **Wake Lock Inteligente**: Mantém a tela ligada durante a execução das séries e descanso enquanto o treino estiver ativo.

### 📐 Filosofia de Design (Dark OLED Minimalista)
- **Fundo**: Preto profundo `#09090B` otimizado para economia de energia em telas OLED.
- **Superfícies**: Grafite industrial `#121215` / `#18181B` e bordas sutis `#27272A`.
- **Ação Principal**: Titânio de alto contraste `#FFFFFF` e `#E4E4E7`.
- **Tipografia Numérica**: `tabular-nums` obrigatório em timers e cargas para evitar trepidação visual.

---

## 🇺🇸 English (EN)

### ⚡ Overview
**heavy.io** is a high-performance strength training and hypertrophy operating system built for athletes who value surgical precision and zero distractions. Designed with the aesthetic of a calibrated Swiss mechanical instrument, it rejects fluorescent glows, fake confetti, and juvenile gamification in favor of raw data legibility and local-first execution.

### ✨ Key Features
- 🛡️ **100% Local-First Architecture (SQLite WAL)**: Workouts, sets, weights, and splits are written instantly to an embedded SQLite database (`heavy_io.db`) with zero latency and full offline capability.
- ⏱️ **Lock Screen Ongoing Notification & Live Activity**: Rest timer runs live on your lock screen with interactive buttons to add $+30\text{s}$ or skip without unlocking your device.
- 🔁 **Active Session Crash Recovery**: State is serialized periodically. If the OS kills the app in the background while you rest, your workout is instantly restored upon reopening.
- 📈 **Strength Curves & Real-time 1RM**: Track load progression per exercise with interactive charts and automatic 1RM calculation via the Epley formula:
  $$\text{1RM} = \text{Weight} \times \left(1 + \frac{\text{Reps}}{30}\right)$$
- 📋 **Program & Routine Management (Full Split CRUD)**: Create multiple programs (e.g., *"3-Day Strength Cycle"*, *"Vacation Routine"*), toggle the active program, and add, delete, or reorder exercises (▲/▼) in any day without re-doing onboarding.
- 🛠️ **Custom Exercise Engine**: Create and edit your own movements (`is_custom = 1`) with muscle targets, mechanics, and equipment, while preserving official seed data integrity.
- 🩺 **Android Health Connect Integration**: Bidirectional sync for body weight, height, steps, and energy expenditure, plus automatic strength training export for Wear OS / smartwatches.
- ☁️ **Persistent Cloud Sync Queue**: Local FIFO queue with exponential backoff for background synchronization to Firebase Firestore whenever connectivity is available.
- 🔒 **Smart Workout Wake Lock**: Keeps the display active during workout sessions and restores standard power-saving timeouts once finished.

### 📐 Design System (OLED Minimalist)
- **Background**: Deep OLED black `#09090B`.
- **Surfaces & Borders**: Graphite `#121215` / `#18181B` with refined dividers `#27272A`.
- **Primary Accent**: Pure titanium `#FFFFFF` / `#E4E4E7`.
- **Data Display**: Tabular numbers (`tabular-nums`) across all weight, rep, and timer components.

---

## 🇪🇸 Español (ES)

### ⚡ Visión General
**heavy.io** es un sistema operativo móvil de entrenamiento de fuerza e hipertrofia de alto rendimiento, diseñado para atletas que exigen precisión mecánica y cero distracciones. Inspirado en la ingeniería de instrumentos suizos, elimina brillos fluorescentes y elementos infantiles para priorizar la legibilidad de las cargas y la velocidad fuera de línea.

### ✨ Características Principales
- 🛡️ **Arquitectura Local-First (SQLite WAL)**: Registro ultra rápido y autónomo en SQLite local (`heavy_io.db`). Funciona 100% sin conexión a internet.
- ⏱️ **Temporizador en Pantalla de Bloqueo**: Notificación interactiva fija con botones para añadir $+30\text{s}$ o saltar el descanso sin desbloquear el teléfono.
- 🔁 **Recuperación ante Cierres (Crash Recovery)**: Si el sistema operativo cierra la aplicación en segundo plano por falta de memoria, la sesión se restaura automáticamente.
- 📈 **Curva de Fuerza y Estimación de 1RM**: Gráficos de progresión y cálculo automático de 1RM mediante la fórmula de Epley.
- 📋 **Gestión Integral de Rutinas (CRUD de Divisiones)**: Cree múltiples planes (ej.: *"Ciclo de Fuerza 3x"*, *"Rutina de Vacaciones"*), alterne cuál está activo y reordene ejercicios (▲/▼) fácilmente.
- 🛠️ **Ejercicios Personalizados**: Añada movimientos propios especificando grupo muscular, implemento y mecánica, protegiendo los ejercicios oficiales del sistema.
- 🩺 **Integración con Android Health Connect**: Sincronización biométrica (peso, altura, pasos, calorías) y exportación de sesiones de fuerza al ecosistema Android.
- ☁️ **Cola de Sincronización en Segundo Plano**: Transmisión asíncrona a Firebase Firestore con reintentos automáticos.
- 🔒 **Pantalla Siempre Activa (Wake Lock)**: Evita que la pantalla se apague durante el entrenamiento activo.

---

## 🇨🇳 中文 (ZH-CN)

### ⚡ 概述
**heavy.io** 是一款专为力量举与肌肥大训练者打造的高性能移动操作系统。我们秉承精密机械与瑞士钟表的工业美学理念，彻底摒弃花哨的霓虹荧光色和低幼游戏化元素，以纯粹的数据可读性与即时离线持久化为核心。

### ✨ 核心功能
- 🛡️ **100% 离线优先架构 (SQLite WAL)**: 所有训练动作、组数、重量与计划均直接写入本地 SQLite 数据库 (`heavy_io.db`)，零延迟，无网络依赖。
- ⏱️ **锁屏常驻通知与实时活动 (Live Activity)**: 息屏状态下直接在锁屏界面查看组间休息倒计时，无需解锁手机即可点击 `+30秒` 或 `跳过休息`。
- 🔁 **训练崩溃与内存回收自愈 (Crash Recovery)**: 训练状态周期性序列化，即使系统在后台清理内存，重新打开时即可一键完整恢复训练进度。
- 📈 **力量曲线与即时 1RM 评估**: 动作重量进阶图表，结合 Epley 公式实时计算 1RM 极限推力。
- 📋 **训练计划管理 (分化计划 CRUD)**: 支持创建多套训练计划（如 *"3天力量循环"*, *"假期高频备用"*），随时切换当前激活计划，并在任意训练日内自由调整动作顺序 (▲/▼)。
- 🛠️ **自定义动作库**: 自主创建与编辑专属动作 (`is_custom = 1`)，配置肌群、动作模式与器械类型，严格保护官方动作完整性。
- 🩺 **Android Health Connect 官方健康互联**: 双向同步体重、身高、日常步数与热量消耗，训练结束后自动将力量训练写入 Android 与 Wear OS 智能手表生态。
- ☁️ **后台同步队列 (Sync Queue)**: 离线 FIFO 队列，网络畅通时自动异步增量上传至 Firebase Firestore 云端。
- 🔒 **训练智能防息屏 (Wake Lock)**: 训练进行期间自动保持屏幕常亮，结束训练后恢复系统省电机制。

### 📐 视觉设计规范 (OLED 极简暗黑)
- **纯黑背景**: OLED 专属 `#09090B`，高对比度低功耗。
- **工业质感面板**: 石墨深灰 `#121215` / `#18181B`，细微边框 `#27272A`。
- **高对比操作元素**: 钛金白 `#FFFFFF` / `#E4E4E7`。
- **等宽数字**: 所有计时器、负重和次数均强制采用 `tabular-nums`，消除数值跳动造成的视觉抖动。

---

## 🏗️ Arquitetura do Sistema / System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 heavy.io Mobile Application                 │
├──────────────────────────────┬──────────────────────────────┤
│  Presentation Layer          │  State & Business Logic      │
│  • Expo Router (Tabs)        │  • Zustand Stores            │
│  • Custom Exercise Modals    │  • Recommendation Engine     │
│  • Rest Timer & Dock         │  • Crash Recovery Hydration  │
├──────────────────────────────┴──────────────────────────────┤
│  Local Persistence & Device Hardware Services               │
│  • Embedded SQLite (WAL Journal Mode)                       │
│  • Expo Keep Awake (Wake Lock during Sets)                  │
│  • Expo Haptics (Precision Mechanical Tactile Feedback)     │
│  • Expo Notifications (Ongoing Sticky & Lock Screen Action) │
├──────────────────────────────┬──────────────────────────────┤
│  Cloud & Ecosystem Sync      │  Health & Biometrics         │
│  • Local SQLite Sync Queue   │  • Android Health Connect    │
│  • Firebase Cloud Firestore  │  • Weight, Height, Steps     │
└──────────────────────────────┴──────────────────────────────┘
```

---

## 🚀 Como Executar / Quick Start

### Pré-requisitos / Prerequisites
- [Node.js](https://nodejs.org/) (versão `>= 20.0.0`)
- [npm](https://www.npmjs.com/) ou [yarn](https://yarnpkg.com/)
- [EAS CLI](https://docs.expo.dev/eas/) (`npm install -g eas-cli`)

### 1. Clonar o Repositório e Instalar Dependências
```bash
git clone https://github.com/edubielecky/heavy.io.git
cd heavy.io
npm install
```

### 2. Iniciar o Servidor Metro Local
```bash
npx expo start -c
```
*Dica: Pressione `a` para abrir no Android, `i` para iOS Simulator ou `w` para Web.*

### 3. Validação e Testes Automatizados
```bash
# Validação estrita de tipagem TypeScript
npx tsc --noEmit

# Validação do manifesto nativo do Expo
npx expo config --type prebuild

# Execução da suíte de testes de banco de dados e regras de negócio
python scratch/test_build_config.py
python scratch/test_routine_management.py
python scratch/test_custom_exercises.py
python scratch/test_health_connect.py
```

### 4. Build de Produção via EAS
```bash
# Build Android APK direto para testes internos
eas build --profile preview --platform android

# Build Android App Bundle (.aab) oficial para a Google Play Store
eas build --profile production --platform android
```

---

## 📚 Documentação Técnica Aprofundada / Detailed Documentation

Consulte os guias especializados na pasta [`docs/`](docs/):
- 🏛️ [**Arquitetura de Software & Fluxo de Dados**](docs/ARCHITECTURE.md)
- 💾 [**Esquema de Banco de Dados SQLite & Modelos**](docs/DATABASE.md)
- 🩺 [**Integração com Android Health Connect**](docs/HEALTH_CONNECT.md)
- 📦 [**Guia de Build Nativa, Perfis EAS & Metro**](docs/BUILD_AND_EAS.md)
- 🎨 [**Sistema de Design & Diretrizes Estéticas**](docs/DESIGN_SYSTEM.md)

---

## 📄 Licença / License

Distribuído sob a licença **Apache 2.0**. Consulte o arquivo [`LICENSE`](LICENSE) para mais informações.

<br />

<div align="center">
  <sub>Desenvolvido com foco obsessivo em precisão mecânica, desempenho e engenharia limpa.</sub>
</div>
