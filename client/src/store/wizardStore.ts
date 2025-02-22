import { create } from 'zustand';

interface WizardState {
  isEditing: boolean;
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
  reset: () => void;
  loadProject: (projectData: any) => void;
  setIsEditing: (isEditing: boolean) => void;
}

export const defaultAvatars = [
  "/avatars/robot-blue.svg",
  "/avatars/robot-purple.svg",
  "/avatars/assistant-1.svg",
  "/avatars/assistant-2.svg",
  "/avatars/bot-minimal.svg",
];

const initialState = {
  isEditing: false,
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
  reset: () => set(initialState),
  loadProject: (projectData) => set((state) => ({
    ...state,
    companyName: projectData.companyName || '',
    welcomeMessage: projectData.welcomeMessage || '',
    primaryColor: projectData.primaryColor || initialState.primaryColor,
    fontFamily: projectData.fontFamily || initialState.fontFamily,
    position: projectData.position || initialState.position,
    avatarUrl: projectData.avatarUrl || initialState.avatarUrl,
    bubbleStyle: projectData.bubbleStyle || initialState.bubbleStyle,
    backgroundColor: projectData.backgroundColor || initialState.backgroundColor,
    buttonStyle: projectData.buttonStyle || initialState.buttonStyle,
    qaItems: projectData.qaItems || [],
    currentDocumentId: projectData.documentId || null,
  })),
  setIsEditing: (isEditing) => set({ isEditing }),
}));