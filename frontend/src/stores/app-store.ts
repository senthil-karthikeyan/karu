import { create } from "zustand";
import type { UIActions, UIState } from "@/types";

interface AppStore extends UIState, UIActions {}

const initialUIState: UIState = {
  sidebarOpen: false,
  activeModal: null,
  editorPreferences: {
    spellCheck: true,
    fontSize: 16,
    wordWrap: true,
  },
};

export const useAppStore = create<AppStore>((set) => ({
  ...initialUIState,

  setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  setActiveModal: (modalId: string | null) => set({ activeModal: modalId }),

  updateEditorPreferences: (preferences) =>
    set((state) => ({
      editorPreferences: {
        ...state.editorPreferences,
        ...preferences,
      },
    })),

  resetUIState: () => set(initialUIState),
}));
