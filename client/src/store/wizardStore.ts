import { create } from 'zustand';

interface WizardState {
  currentStep: number;
  companyName: string;
  welcomeMessage: string;
  primaryColor: string;
  fontFamily: string;
  position: string;
  avatarUrl: string;
  bubbleStyle: string;
  backgroundColor: string;
  buttonStyle: string;
  qaItems: Array<{ question: string; answer: string }>;
  setStep: (step: number) => void;
  updateConfig: (config: Partial<WizardState>) => void;
  addQAItem: (item: { question: string; answer: string }) => void;
  updateQAItem: (index: number, item: { question: string; answer: string }) => void;
  removeQAItem: (index: number) => void;
}

export const defaultAvatars = [
  "/avatars/robot-blue.svg",
  "/avatars/robot-purple.svg",
  "/avatars/assistant-1.svg",
  "/avatars/assistant-2.svg",
  "/avatars/bot-minimal.svg",
];

export const useWizardStore = create<WizardState>((set) => ({
  currentStep: 0,
  companyName: '',
  welcomeMessage: '',
  primaryColor: '#2563eb',
  fontFamily: 'Inter',
  position: 'bottom-right',
  avatarUrl: defaultAvatars[0],
  bubbleStyle: 'rounded',
  backgroundColor: '#ffffff',
  buttonStyle: 'solid',
  qaItems: [],
  setStep: (step) => set({ currentStep: step }),
  updateConfig: (config) => set((state) => ({ ...state, ...config })),
  addQAItem: (item) => set((state) => ({ 
    qaItems: [...state.qaItems, item] 
  })),
  updateQAItem: (index, item) => set((state) => ({
    qaItems: state.qaItems.map((qa, i) => i === index ? item : qa)
  })),
  removeQAItem: (index) => set((state) => ({
    qaItems: state.qaItems.filter((_, i) => i !== index)
  })),
}));