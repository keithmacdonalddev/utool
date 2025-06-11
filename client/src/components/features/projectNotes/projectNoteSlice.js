// Mock project notes slice - basic implementation for compilation
// This should be moved to the proper Redux features directory structure later

export const createProjectNote = () => ({
  type: 'CREATE_PROJECT_NOTE',
  payload: {},
});

export const updateProjectNote = () => ({
  type: 'UPDATE_PROJECT_NOTE',
  payload: {},
});

export const deleteProjectNote = () => ({
  type: 'DELETE_PROJECT_NOTE',
  payload: {},
});

export const getProjectNotes = () => ({
  type: 'GET_PROJECT_NOTES',
  payload: {},
});

export const resetProjectNoteStatus = () => ({
  type: 'RESET_PROJECT_NOTE_STATUS',
  payload: {},
});

export const togglePinProjectNote = () => ({
  type: 'TOGGLE_PIN_PROJECT_NOTE',
  payload: {},
});

export const selectProjectNotes = (state) => state.projectNotes || [];
export const selectProjectNotesLoading = (state) => false;
export const selectProjectNotesError = (state) => null;
