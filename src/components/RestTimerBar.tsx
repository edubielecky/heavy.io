import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Timer, X, Plus } from 'lucide-react-native';
import { useWorkoutStore } from '../store/workoutStore';
import Theme from '../theme/theme';

export const RestTimerBar: React.FC = () => {
  const { restTimer, tickRestTimer, stopRestTimer, startRestTimer } = useWorkoutStore();

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (restTimer.isRunning && restTimer.remainingSeconds > 0) {
      interval = setInterval(() => {
        tickRestTimer();
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [restTimer.isRunning, restTimer.remainingSeconds, tickRestTimer]);

  if (!restTimer.isRunning && restTimer.remainingSeconds === 0) {
    return null;
  }

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins}:${remainder < 10 ? '0' : ''}${remainder}`;
  };

  const progress = restTimer.totalSeconds > 0 
    ? (restTimer.remainingSeconds / restTimer.totalSeconds) 
    : 0;

  const handleAdd30s = () => {
    startRestTimer(restTimer.remainingSeconds + 30, restTimer.exerciseName);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.progressBar, { width: `${Math.min(100, Math.max(0, progress * 100))}%` }]} />
      
      <View style={styles.content}>
        <View style={styles.leftInfo}>
          <View style={styles.iconCircle}>
            <Timer size={18} color={Theme.colors.primary} />
          </View>
          <View>
            <Text style={styles.title}>
              Descanso {restTimer.exerciseName ? `• ${restTimer.exerciseName}` : ''}
            </Text>
            <Text style={styles.timerText}>{formatTime(restTimer.remainingSeconds)}</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.addTimeBtn} onPress={handleAdd30s}>
            <Plus size={14} color={Theme.colors.text} />
            <Text style={styles.addTimeText}>30s</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.closeBtn} onPress={stopRestTimer}>
            <X size={18} color={Theme.colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 80,
    left: 16,
    right: 16,
    backgroundColor: Theme.colors.surfaceElevated,
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: Theme.colors.borderLight,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 999,
  },
  progressBar: {
    height: 2,
    backgroundColor: Theme.colors.text,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  leftInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Theme.colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: Theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  timerText: {
    color: Theme.colors.text,
    fontSize: 20,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.5,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  addTimeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.surfaceCard,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    gap: 2,
  },
  addTimeText: {
    color: Theme.colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 6,
  },
});
