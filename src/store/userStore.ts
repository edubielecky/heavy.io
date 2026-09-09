import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type UserFlowType = 'new_user' | 'existing_user';

export interface UserProfile {
  id?: string;
  email?: string;
  name?: string;
  experienceLevel?: 'iniciante' | 'intermediario' | 'avancado';
  primaryGoal?: 'forca_pura' | 'hipertrofia' | 'recomposicao';
  preferredDaysPerWeek?: number;
  bodyWeightKg?: number;
  heightCm?: number;
  createdAt?: string;
}

interface UserStoreState {
  hasCompletedOnboarding: boolean;
  userFlow: UserFlowType;
  profile: UserProfile | null;

  // Ações de gerenciamento dos fluxos
  setUserFlow: (flow: UserFlowType) => void;
  setProfile: (profile: Partial<UserProfile>) => void;
  completeOnboarding: (profileData?: Partial<UserProfile>) => void;
  resetUserFlow: () => void;
}

export const useUserStore = create<UserStoreState>()(
  persist(
    (set, get) => ({
      hasCompletedOnboarding: false,
      userFlow: 'existing_user',
      profile: null,

      setUserFlow: (flow: UserFlowType) => {
        set({ userFlow: flow });
      },

      setProfile: (updates: Partial<UserProfile>) => {
        const current = get().profile || {};
        set({ profile: { ...current, ...updates } });
      },

      completeOnboarding: (profileData?: Partial<UserProfile>) => {
        const current = get().profile || {};
        set({
          hasCompletedOnboarding: true,
          userFlow: 'existing_user',
          profile: {
            ...current,
            ...(profileData || {}),
            createdAt: current.createdAt || new Date().toISOString(),
          },
        });
      },

      resetUserFlow: () => {
        set({
          hasCompletedOnboarding: false,
          userFlow: 'new_user',
          profile: null,
        });
      },
    }),
    {
      name: '@heavy_io_user_storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: state => ({
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        userFlow: state.userFlow,
        profile: state.profile,
      }),
    }
  )
);
