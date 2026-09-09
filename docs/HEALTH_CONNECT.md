# heavy.io — Integração com Android Health Connect

Guia de engenharia, mapeamento de biometria e conformidade com as diretrizes da Google Play para o **Health Connect**.

---

## 1. Visão Geral

O **heavy.io** integra-se com a API oficial do **Android Health Connect** (`react-native-health-connect`) para estabelecer uma sincronização bidirecional entre o treinamento de força e os dados biológicos do atleta:
- **Importação de Biometria**: Puxa automaticamente peso corporal (`WeightRecord`), altura (`HeightRecord`), passos diários (`StepsRecord`) e gasto calórico basal/total (`TotalCaloriesBurnedRecord`) para atualizar o perfil e ajustar a intensidade recomendada.
- **Exportação de Sessões de Treino**: Envia treinos finalizados como sessões de musculação (`ExerciseSessionRecord`) de tipo `STRENGTH_TRAINING`, juntamente com as calorias estimadas da sessão (`TotalCaloriesBurnedRecord`), creditando a atividade física no ecossistema Android e relógios inteligentes (Wear OS / Pixel Watch / Galaxy Watch).

---

## 2. Permissões Declaradas

| Permissão Android | Modo | Finalidade |
| :--- | :--- | :--- |
| `android.permission.health.READ_STEPS` | Leitura | Monitoramento de nível de atividade diária |
| `android.permission.health.READ_WEIGHT` | Leitura | Manter o peso corporal do atleta atualizado |
| `android.permission.health.READ_HEIGHT` | Leitura | Cálculo de proporções corporais e índices |
| `android.permission.health.READ_TOTAL_CALORIES_BURNED` | Leitura | Análise do gasto calórico diário acumulado |
| `android.permission.health.READ_EXERCISE` | Leitura | Consulta de sessões pré-existentes para evitar duplicações |
| `android.permission.health.WRITE_EXERCISE` | Escrita | Gravação da sessão de treino de musculação |
| `android.permission.health.WRITE_TOTAL_CALORIES_BURNED` | Escrita | Registro das calorias queimadas durante o treino |

---

## 3. Conformidade com as Políticas da Google Play Store

A Google Play exige requisitos estritos para aprovação de aplicativos que consomem permissões de saúde:

### 3.1 Intent-Filter de Justificativa de Permissões
O aplicativo deve responder à ação `androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE` para que o usuário possa visualizar as políticas de privacidade a qualquer momento diretamente da tela de permissões do sistema Android:

```xml
<activity android:name=".MainActivity" ...>
  <intent-filter>
    <action android:name="androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE" />
    <category android:name="android.intent.category.DEFAULT" />
  </intent-filter>
</activity>
```
*No Android 14+, a conformidade é estendida automaticamente através do alias `ViewPermissionUsageActivity` injetado pelo plugin nativo em [`app.json`](file:///c:/Users/Eduardo/Desktop/exemplo/heavy.io/app.json).*

### 3.2 Princípio da Minimização de Dados
- O aplicativo apenas lê métricas essenciais para cálculo de volume e periodização de força.
- Nenhum dado biométrico é repassado a terceiros, corretores de dados (*data brokers*) ou redes de publicidade.
- Todo o armazenamento primário ocorre no SQLite local do dispositivo sob controle do atleta.

---

## 4. Mapeamento de Sessão de Força

Quando uma sessão é concluída no `heavy.io`, o método `exportWorkoutSessionToHealthConnect(session)` em [`healthConnectService.ts`](file:///c:/Users/Eduardo/Desktop/exemplo/heavy.io/src/services/healthConnectService.ts) realiza a conversão:

```typescript
// Registro da Sessão de Exercício
const exerciseRecord = {
  recordType: 'ExerciseSession',
  exerciseType: ExerciseType.STRENGTH_TRAINING, // Musculação / Levantamento de Peso
  title: session.name,
  notes: `${session.totalSets} séries concluídas • ${Math.round(session.totalVolumeKg)}kg tonelagem total`,
  startTime: session.startTime,
  endTime: session.endTime || new Date().toISOString(),
};

// Estimativa e Gravação de Calorias (MET 5.5 para musculação com intervalos de descanso)
const durationMinutes = session.durationSeconds / 60;
const estimatedCalories = Math.round(durationMinutes * 6.5);

const calorieRecord = {
  recordType: 'TotalCaloriesBurned',
  energy: { unit: 'kilocalories', value: estimatedCalories },
  startTime: session.startTime,
  endTime: session.endTime || new Date().toISOString(),
};
```
