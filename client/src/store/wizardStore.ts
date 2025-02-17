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
  currentDocumentId: number | null;
  qaItems: Array<{ question: string; answer: string }>;
  setStep: (step: number) => void;
  updateConfig: (config: Partial<WizardState>) => void;
  setCurrentDocument: (documentId: number) => void;
  addQAItem: (item: { question: string; answer: string }) => void;
  updateQAItem: (index: number, item: { question: string; answer: string }) => void;
  removeQAItem: (index: number) => void;
  setQAItems: (items: Array<{ question: string; answer: string }>) => void;
  reset: () => void;  // Added reset function
}

export const defaultAvatars = [
  "/avatars/robot-blue.svg",
  "/avatars/robot-purple.svg",
  "/avatars/assistant-1.svg",
  "/avatars/assistant-2.svg",
  "/avatars/bot-minimal.svg",
];

// Define initial state as a constant to reuse in reset
const initialState = {
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
  currentDocumentId: null,
  qaItems: [],
};

export const useWizardStore = create<WizardState>((set) => ({
  ...initialState,
  setStep: (step) => set({ currentStep: step }),
  updateConfig: (config) => set((state) => ({ ...state, ...config })),
  setCurrentDocument: (documentId) => set({ currentDocumentId: documentId }),
  addQAItem: (item) => set((state) => ({ 
    qaItems: [...state.qaItems, item] 
  })),
  updateQAItem: (index, item) => set((state) => ({
    qaItems: state.qaItems.map((qa, i) => i === index ? item : qa)
  })),
  removeQAItem: (index) => set((state) => ({
    qaItems: state.qaItems.filter((_, i) => i !== index)
  })),
  setQAItems: (items) => set({ qaItems: items }),
  reset: () => set(initialState),  // Added reset function that restores initial state
}));