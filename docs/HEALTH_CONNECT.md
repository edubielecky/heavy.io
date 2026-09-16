# heavy.io — Integração de Saúde Nativa (Health Connect & Apple Health)

Guia de engenharia, mapeamento de biometria e conformidade com as diretrizes da Google Play e Apple para a **Camada Unificada de Saúde**.

---

## 1. Visão Geral

O **heavy.io** integra-se com a API oficial do **Android Health Connect** (`react-native-health-connect`) e com a ponte nativa do **Apple HealthKit** no iOS através do serviço unificado [`healthSyncService.ts`](file:///c:/Users/Eduardo/Desktop/exemplo/heavy.io/src/services/healthSyncService.ts):
- **Importação de Biometria Real**: Puxa automaticamente peso corporal (`WeightRecord` / `HKQuantityTypeIdentifierBodyMass`), altura (`HeightRecord` / `HKQuantityTypeIdentifierHeight`), passos diários e gasto calórico para manter o perfil do atleta calibrado sem necessidade de entrada manual.
- **Exportação de Sessões de Força**: Envia treinos finalizados como sessões de musculação (`ExerciseSessionRecord` de tipo `STRENGTH_TRAINING` no Android / `HKWorkoutActivityTypeTraditionalStrengthTraining` no iOS), com tonelagem acumulada e calorias estimadas (MET 6.5).
- **Métricas de Frequência Cardíaca de Smartwatches**: Coleta automaticamente batimentos cardíacos médios (`avgBpm`) e de pico (`peakBpm`) medidos pelo Apple Watch, Wear OS, Galaxy Watch ou Pixel Watch durante a janela exata do treino.

---

## 2. Permissões Declaradas

### Android (Google Health Connect)
| Permissão Android | Modo | Finalidade |
| :--- | :--- | :--- |
| `android.permission.health.READ_STEPS` | Leitura | Monitoramento de nível de atividade diária |
| `android.permission.health.READ_WEIGHT` | Leitura | Manter o peso corporal do atleta atualizado |
| `android.permission.health.READ_HEIGHT` | Leitura | Cálculo de proporções corporais e índices |
| `android.permission.health.READ_TOTAL_CALORIES_BURNED` | Leitura | Análise do gasto calórico diário acumulado |
| `android.permission.health.READ_HEART_RATE` | Leitura | Extração de BPM médio e pico da sessão |
| `android.permission.health.READ_EXERCISE` | Leitura | Consulta de sessões pré-existentes |
| `android.permission.health.WRITE_EXERCISE` | Escrita | Gravação da sessão de musculação |
| `android.permission.health.WRITE_TOTAL_CALORIES_BURNED` | Escrita | Registro das calorias da sessão |

### iOS (Apple HealthKit)
| Identificador HealthKit | Modo | Finalidade |
| :--- | :--- | :--- |
| `HKQuantityTypeIdentifierBodyMass` | Leitura | Peso corporal |
| `HKQuantityTypeIdentifierHeight` | Leitura | Altura corporal |
| `HKQuantityTypeIdentifierHeartRate` | Leitura | Frequência cardíaca durante o treino |
| `HKQuantityTypeIdentifierActiveEnergyBurned` | Leitura/Escrita | Calorias ativas da sessão |
| `HKWorkoutTypeIdentifier` | Escrita | Sessão de treino de força |

---

## 3. Conformidade com as Políticas da Google Play Store & Apple

A Google Play e Apple exigem conformidade rigorosa para apps que consomem dados de saúde:

### 3.1 Intent-Filter de Justificativa de Permissões (Android)
O aplicativo responde à ação `androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE` para que o usuário visualize a política de privacidade a partir das configurações do sistema Android:

```xml
<activity android:name=".MainActivity" ...>
  <intent-filter>
    <action android:name="androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE" />
    <category android:name="android.intent.category.DEFAULT" />
  </intent-filter>
</activity>
```
*No Android 14+, a conformidade é complementada pelo alias `ViewPermissionUsageActivity` injetado pelo plugin nativo em [`app.json`](file:///c:/Users/Eduardo/Desktop/exemplo/heavy.io/app.json).*

### 3.2 Princípio da Minimização & Privacidade Absoluta
- O aplicativo apenas lê métricas essenciais para cálculo de volume e intensidade de força.
- Nenhum dado biométrico é repassado a terceiros, corretores de dados (*data brokers*) ou redes de anúncios.
- O armazenamento primário permanece no banco de dados SQLite local no próprio dispositivo.

---

## 4. Mapeamento de Sessão de Força

Quando uma sessão é concluída no `heavy.io`, o método `syncWorkoutSessionToHealth(session)` em [`healthSyncService.ts`](file:///c:/Users/Eduardo/Desktop/exemplo/heavy.io/src/services/healthSyncService.ts) despacha os dados para a plataforma ativa:

```typescript
// Mapeamento Android (Health Connect)
const exerciseRecord = {
  recordType: 'ExerciseSession',
  exerciseType: ExerciseType.STRENGTH_TRAINING,
  title: session.name,
  notes: `${session.totalSets} séries • ${Math.round(session.totalVolumeKg)}kg tonelagem`,
  startTime: session.startTime,
  endTime: session.endTime || new Date().toISOString(),
};

// Estimativa e Gravação de Calorias (MET 6.5 para musculação com intervalos de descanso)
const durationMinutes = session.durationSeconds / 60;
const estimatedCalories = Math.round(durationMinutes * 6.5);
```

