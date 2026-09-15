import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type UserFlowType = 'new_user' | 'existing_user' | 'guest';
export type OnboardingTrack = 'advanced' | 'guided';

export interface UserPreferences {
  defaultRestSeconds: number; // 60, 90, 120, 180
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

export type BiologicalSex = 'male' | 'female';
export type MusclePriority = 'balanced' | 'chest' | 'back' | 'legs_glutes' | 'shoulders' | 'arms';

export interface UserProfile {
  id?: string;
  email?: string;
  name?: string;
  onboardingTrack?: OnboardingTrack;
  biologicalSex?: BiologicalSex;
  age?: number;
  musclePriority?: MusclePriority;
  experienceLevel?: 'iniciante' | 'intermediario' | 'avancado';
  primaryGoal?: 'forca_pura' | 'hipertrofia' | 'recomposicao';
  preferredDaysPerWeek?: number;
  bodyWeightKg?: number;
  heightCm?: number;
  equipmentEnvironment?: 'commercial' | 'condo' | 'home_dumbbells';
  physicalRestrictions?: ('shoulders' | 'lower_back' | 'knees' | 'none')[];
  createdAt?: string;
  metricsManuallyEdited?: boolean;
}

interface UserStoreState {
  hasCompletedOnboarding: boolean;
  isGuest: boolean;
  userFlow: UserFlowType;
  onboardingTrack: OnboardingTrack | null;
  profile: UserProfile | null;
  preferences: UserPreferences;

  // Ações de gerenciamento dos fluxos
  setIsGuest: (isGuest: boolean) => void;
  setUserFlow: (flow: UserFlowType) => void;
  setOnboardingTrack: (track: OnboardingTrack) => void;
  setProfile: (profile: Partial<UserProfile>) => void;
  updateMetrics: (metrics: Partial<UserProfile>) => void;
  updatePreferences: (prefs: Partial<UserPreferences>) => void;
  completeOnboarding: (profileData?: Partial<UserProfile>) => void;
  resetOnboarding: () => void;
  resetUserFlow: () => void;
  logout: () => void;
}

export const useUserStore = create<UserStoreState>()(
  persist(
    (set, get) => ({
      hasCompletedOnboarding: false,
      isGuest: false,
      userFlow: 'existing_user',
      onboardingTrack: null,
      profile: null,
      preferences: {
        defaultRestSeconds: 90,
        soundEnabled: true,
        vibrationEnabled: true,
      },

      setIsGuest: (isGuest: boolean) => {
        set({ isGuest });
      },

      setUserFlow: (flow: UserFlowType) => {
        set({ userFlow: flow });
      },

      setOnboardingTrack: (track: OnboardingTrack) => {
        set({ 
          onboardingTrack: track,
          profile: { ...(get().profile || {}), onboardingTrack: track }
        });
      },

      setProfile: (updates: Partial<UserProfile>) => {
        const current = get().profile || {};
        set({ profile: { ...current, ...updates } });
      },

      updateMetrics: (updates: Partial<UserProfile>) => {
        const current = get().profile || {};
        set({ profile: { ...current, ...updates, metricsManuallyEdited: true } });
      },

      updatePreferences: (updates: Partial<UserPreferences>) => {
        const current = get().preferences;
        set({ preferences: { ...current, ...updates } });
      },

      completeOnboarding: (profileData?: Partial<UserProfile>) => {
        const current = get().profile || {};
        const isAdvanced = profileData?.onboardingTrack === 'advanced';
        const cleanedCurrent = (isAdvanced && !current.metricsManuallyEdited)
          ? {
              ...current,
              bodyWeightKg: undefined,
              heightCm: undefined,
              experienceLevel: undefined,
              primaryGoal: undefined,
              musclePriority: undefined,
              biologicalSex: undefined,
              age: undefined,
              equipmentEnvironment: undefined,
              physicalRestrictions: undefined,
            }
          : current;

        set({
          hasCompletedOnboarding: true,
          userFlow: get().isGuest ? 'guest' : 'existing_user',
          profile: {
            ...cleanedCurrent,
            ...(profileData || {}),
            createdAt: current.createdAt || new Date().toISOString(),
          },
        });
      },

      resetOnboarding: () => {
        set({
          hasCompletedOnboarding: false,
          userFlow: 'new_user',
          profile: null,
        });
      },

      resetUserFlow: () => {
        set({
          hasCompletedOnboarding: false,
          isGuest: false,
          userFlow: 'new_user',
          profile: null,
        });
      },

      logout: () => {
        set({
          hasCompletedOnboarding: false,
          isGuest: false,
          userFlow: 'new_user',
          profile: null,
          onboardingTrack: null,
        });
        AsyncStorage.removeItem('@heavy_io_user_storage').catch(() => {});
      },
    }),
    {
      name: '@heavy_io_user_storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: state => ({
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        isGuest: state.isGuest,
        userFlow: state.userFlow,
        onboardingTrack: state.onboardingTrack,
        profile: state.profile,
        preferences: state.preferences,
      }),
    }
  )
);
