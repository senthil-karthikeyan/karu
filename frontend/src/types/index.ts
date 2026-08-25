export interface UIState {
  sidebarOpen: boolean;
  activeModal: string | null;
  editorPreferences: {
    spellCheck: boolean;
    fontSize: number;
    wordWrap: boolean;
  };
}

export interface UIActions {
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setActiveModal: (modalId: string | null) => void;
  updateEditorPreferences: (preferences: Partial<UIState["editorPreferences"]>) => void;
  resetUIState: () => void;
}
