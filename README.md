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
- 🤖 **Motor de IA Biomecânica & Substituição por Motivo**: Substitua exercícios em tempo real informando o motivo exato (*equipamento ocupado*, *dor/desconforto articular*, *fadiga/SFR baixo*, *variação de estímulo* ou *falta de tempo*). Inclui justificativa anatômica e cliente Gemini com cascata de fallback resiliente contra erros 503 e operação 100% offline.
- 🧬 **Modulação Fisiológica por Faixa Etária**: O motor de recomendação ajusta volumes efetivos, descansos estendidos (+15 a +25s), RIR seguro e trajetórias guiadas com suporte torácico para atletas masters (50+ anos) e adultos, preservando tendões e cartilagens.
- 📱 **Suporte Adaptativo para Dispositivos Dobráveis (Foldables)**: Layout reativo (`useResponsive`) com 2 colunas para Galaxy Z Fold, Pixel Fold e tablets, ergonomia de polegares na barra inferior (560dp) e ajuste para telas externas compactas.
- ⏱️ **Cronômetro na Tela de Bloqueio & Ongoing Notification**: Acompanhe o descanso sem desbloquear o celular. Adicione $+30\text{s}$ ou pule o descanso diretamente no card fixo de notificação ou Live Activity.
- 🔁 **Resiliência Ativa & Crash Recovery**: Se o sistema operacional encerrar o app por economia de memória durante o descanso, o treino é recuperado automaticamente ao reabrir.
- 📈 **Sobrecarga Progressiva & Estimativa de 1RM**: Gestão de progressão dupla (*Double Progression*), gráficos biomecânicos de evolução de carga e cálculo em tempo real de 1RM pela fórmula de Epley.
- 📋 **Gestão Completa de Fichas (CRUD de Rotinas)**: Crie múltiplas fichas (ex.: *"Treino de Férias"*, *"Ciclo de Força 3x"*), alterne a ficha ativa e reordene exercícios (▲/▼) dentro de qualquer dia sem reiniciar o onboarding.
- 🛠️ **Criação & Edição de Exercícios Customizados**: Adicione movimentos próprios (`is_custom = 1`) definindo grupos musculares, mecânica, equipamento e instruções, com proteção de integridade dos exercícios do sistema.
- 🩺 **Camada Unificada de Saúde (Health Connect & Apple Health)**: Sincronização bidirecional de biometria (peso, altura, passos, calorias), coleta de batimentos cardíacos (BPM médio e pico) de smartwatches e exportação automática de treinos de força para Android e iOS.
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
- 🤖 **Biomechanical AI Engine & Reason-Based Exercise Swap**: Swap exercises on the fly by selecting your real-world reason (*machine busy*, *joint discomfort*, *high fatigue / low SFR*, *muscle variation*, or *time constraint*). Powered by Google Gemini with 503 fallback cascade and 100% offline heuristic fallback.
- 🧬 **Age-Modulated Physiological Engine**: Recommendation system calibrates effective sets, extended rests (+15s to +25s), safe RIR floors, and chest-supported machine bias for master athletes (50+) and adults to protect tendons and joint health.
- 📱 **Foldable & Tablet Adaptive Layout**: Responsive dual-column layout (`useResponsive`) for Samsung Galaxy Z Fold, Pixel Fold, and tablets, with centered thumb ergonomics on tab bars (560dp) and narrow cover screen tuning.
- ⏱️ **Lock Screen Ongoing Notification & Live Activity**: Rest timer runs live on your lock screen with interactive buttons to add $+30\text{s}$ or skip without unlocking your device.
- 🔁 **Active Session Crash Recovery**: State is serialized periodically. If the OS kills the app in the background while you rest, your workout is instantly restored upon reopening.
- 📈 **Double Progressive Overload & Real-time 1RM**: Guided load and repetition progression, historical volume curves, and automatic 1RM calculation via the Epley formula:
  $$\text{1RM} = \text{Weight} \times \left(1 + \frac{\text{Reps}}{30}\right)$$
- 📋 **Program & Routine Management (Full Split CRUD)**: Create multiple programs (e.g., *"3-Day Strength Cycle"*, *"Vacation Routine"*), toggle the active program, and add, delete, or reorder exercises (▲/▼) in any day without re-doing onboarding.
- 🛠️ **Custom Exercise Engine**: Create and edit your own movements (`is_custom = 1`) with muscle targets, mechanics, and equipment, while preserving official seed data integrity.
- 🩺 **Unified Health Layer (Health Connect & Apple Health)**: Bidirectional sync for body weight, height, steps, and energy expenditure, smartwatch heart rate capture (avg & peak BPM), and automatic strength training export for Android & iOS.
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
- 🤖 **Motor de IA Biomecánica & Sustitución por Motivo**: Cambie ejercicios en tiempo real seleccionando el motivo (*equipo ocupado*, *dolor articular*, *fatiga excesiva*, *variación de estímulo* o *falta de tiempo*). Con justificación anatómica y cliente Gemini resiliente contra error 503.
- 🧬 **Modulación Fisiológica por Edad**: Ajuste automático de volumen, descansos prolongados (+15 a +25s) y protección articular para atletas mayores de 50 años.
- 📱 **Diseño Adaptativo para Dispositivos Plegables (Foldables)**: Soporte completo para Galaxy Z Fold y tabletas con interfaz de 2 columnas y ergonomía centralizada.
- ⏱️ **Temporizador en Pantalla de Bloqueo**: Notificación interactiva fija con botones para añadir $+30\text{s}$ o saltar el descanso sin desbloquear el teléfono.
- 🔁 **Recuperación ante Cierres (Crash Recovery)**: Si el sistema operativo cierra la aplicación en segundo plano por falta de memoria, la sesión se restaura automáticamente.
- 📈 **Sobrecarga Progresiva y Estimación de 1RM**: Gráficos de progresión y cálculo automático de 1RM mediante la fórmula de Epley.
- 📋 **Gestión Integral de Rutinas (CRUD de Divisiones)**: Cree múltiples planes, alterne cuál está activo y reordene ejercicios (▲/▼) fácilmente.
- 🛠️ **Ejercicios Personalizados**: Añada movimientos propios especificando grupo muscular, implemento y mecánica.
- 🩺 **Capa Unificada de Salud (Health Connect & Apple Health)**: Sincronización biométrica (peso, altura, pulso cardíaco de smartwatches) y exportación de sesiones de fuerza.
- ☁️ **Cola de Sincronización en Segundo Plano**: Transmisión asíncrona a Firebase Firestore con reintentos automáticos.
- 🔒 **Pantalla Siempre Activa (Wake Lock)**: Evita que la pantalla se apague durante el entrenamiento activo.

---

## 🇨🇳 中文 (ZH-CN)

### ⚡ 概述
**heavy.io** 是一款专为力量举与肌肥大训练者打造的高性能移动操作系统。我们秉承精密机械与瑞士钟表的工业美学理念，彻底摒弃花哨的霓虹荧光色和低幼游戏化元素，以纯粹的数据可读性与即时离线持久化为核心。

### ✨ 核心功能
- 🛡️ **100% 离线优先架构 (SQLite WAL)**: 所有训练动作、组数、重量与计划均直接写入本地 SQLite 数据库 (`heavy_io.db`)，零延迟，无网络依赖。
- 🤖 **生物力学 AI 引擎与按因替换动作**: 支持根据实际原因（器械被占、关节疼痛不适、中枢疲劳/SFR过低、寻求肌纤维变化、时间紧迫）智能平替动作，搭载 Gemini 503 弹性降级机制与全离线回退算法。
- 🧬 **按年龄段生理学调控**: 为高龄/大师级训练者（50+岁）动态调节有效容量，自动延长组间休息（+15至+25秒），设定保守 RIR 保护结缔组织，优先配置胸托支撑与导轨器械。
- 📱 **折叠屏与平板自适应布局**: 针对三星 Galaxy Z Fold、Pixel Fold 与平板提供原生双列瀑布流 (`useResponsive`)，底栏居中防拇指拉扯，外屏超窄适配。
- ⏱️ **锁屏常驻通知与实时活动 (Live Activity)**: 息屏状态下直接在锁屏界面查看组间休息倒计时，无需解锁手机即可点击 `+30秒` 或 `跳过休息`。
- 🔁 **训练崩溃与内存回收自愈 (Crash Recovery)**: 训练状态周期性序列化，重新打开即可完整恢复训练进度。
- 📈 **双重渐进超负荷与即时 1RM 评估**: 结合 Epley 公式实时评估极限推力与容量曲线。
- 📋 **训练计划管理 (分化计划 CRUD)**: 支持创建多套训练计划，随时切换激活计划并自由排序。
- 🛠️ **自定义动作库**: 自主创建与编辑专属动作 (`is_custom = 1`)，配置肌群、动作模式与器械类型。
- 🩺 **统一健康生态互联 (Health Connect & Apple Health)**: 双向同步身体数据，读取智能手表心率（平均与峰值 BPM），并在训练结束后自动写入力量训练。
- ☁️ **后台同步队列 (Sync Queue)**: 离线 FIFO 队列，网络恢复时增量上传至 Firebase Firestore。
- 🔒 **训练智能防息屏 (Wake Lock)**: 训练进行期间自动保持屏幕常亮。

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
│  • Foldable useResponsive    │  • Recommendation Engine     │
│  • Reason-Based Swap Modals  │  • Age-Modulated Physiology  │
│  • Rest Timer & Dock         │  • Progressive Overload      │
├──────────────────────────────┴──────────────────────────────┤
│  AI & Machine Intelligence Layer                            │
│  • Resilient Gemini Client (503 Fallback Cascade)           │
│  • Biomechanical Exercise Substitutions & Anatomical Rationale│
│  • Local Deterministic Heuristic Engine (100% Offline Safe) │
├──────────────────────────────┬──────────────────────────────┤
│  Local Persistence & Hardware│  Unified Health Ecosystem    │
│  • Embedded SQLite (WAL Mode)│  • Android Health Connect    │
│  • Expo Keep Awake & Haptics │  • Apple HealthKit (iOS)     │
│  • Lock Screen Ongoing Notif │  • Smartwatch Heart Rate     │
├──────────────────────────────┴──────────────────────────────┤
│  Cloud & Background Sync                                     │
│  • Local SQLite Sync Queue (FIFO with Exponential Backoff)  │
│  • Firebase Cloud Firestore Data Ingestion                  │
└─────────────────────────────────────────────────────────────┘
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
# Validação estrita de tipagem TypeScript (zero erros)
npx tsc --noEmit

# Validação do manifesto nativo do Expo
npx expo config --type prebuild

# Teste de empacotamento completo do Metro com cache limpo
npx expo export --platform web --clear
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
