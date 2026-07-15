import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../api/api";

export const fetchInteractions = createAsyncThunk(
  "interaction/fetchInteractions",
  async ({ hcpId = null, skip = 0, limit = 100 } = {}) => {
    const params = { skip, limit };
    if (hcpId) params.hcp_id = hcpId;
    const response = await api.get("/api/interactions", { params });
    return response.data;
  },
);

export const fetchHCPInteractions = createAsyncThunk(
  "interaction/fetchHCPInteractions",
  async (hcpId, { skip = 0, limit = 100 } = {}) => {
    const response = await api.get(`/api/hcps/${hcpId}/interactions`, {
      params: { skip, limit },
    });
    return { hcpId, interactions: response.data };
  },
);

export const createInteraction = createAsyncThunk(
  "interaction/createInteraction",
  async (interactionData) => {
    const response = await api.post("/api/interactions", interactionData);
    return response.data;
  },
);

export const updateInteraction = createAsyncThunk(
  "interaction/updateInteraction",
  async ({ id, ...interactionData }) => {
    const response = await api.put(`/api/interactions/${id}`, interactionData);
    return response.data;
  },
);

export const deleteInteraction = createAsyncThunk(
  "interaction/deleteInteraction",
  async (id) => {
    await api.delete(`/api/interactions/${id}`);
    return id;
  },
);

export const sendChatMessage = createAsyncThunk(
  "interaction/sendChatMessage",
  async (message, thunkAPI) => {
    try {
      const response = await api.post("/api/ai/chat", { message });
      return response.data;
    } catch (err) {
      if (err && err.code === "ECONNABORTED") {
        return thunkAPI.rejectWithValue(
          "Request timed out while waiting for AI response.",
        );
      }
      const serverDetail = err?.response?.data?.detail;
      if (serverDetail) return thunkAPI.rejectWithValue(serverDetail);
      return thunkAPI.rejectWithValue(err.message || "Unknown error");
    }
  },
);

export const confirmAndSaveInteraction = createAsyncThunk(
  "interaction/confirmAndSaveInteraction",
  async (prefillData, thunkAPI) => {
    try {
      // Send the same data but with prefill_only=false to actually save
      const response = await api.post("/api/ai/chat", { 
        message: "Please save this interaction",
        prefill_data: prefillData 
      });
      return response.data;
    } catch (err) {
      const serverDetail = err?.response?.data?.detail;
      if (serverDetail) return thunkAPI.rejectWithValue(serverDetail);
      return thunkAPI.rejectWithValue(err.message || "Unknown error");
    }
  },
);

const initialState = {
  interactions: [],
  currentHCPInteractions: [],
  currentHCPId: null,
  messages: [],
  loading: false,
  historyLoading: false,
  error: null,
  chatLoading: false,
  editingId: null,
  formPrefill: null,
};

function shouldUpdateCurrentHCPList(state, hcpId) {
  return !state.currentHCPId || state.currentHCPId === hcpId;
}

function replaceInteraction(state, interaction) {
  const index = state.interactions.findIndex((i) => i.id === interaction.id);
  if (index !== -1) state.interactions[index] = interaction;
  else state.interactions.unshift(interaction);

  if (shouldUpdateCurrentHCPList(state, interaction.hcp_id)) {
    const currentIndex = state.currentHCPInteractions.findIndex(
      (i) => i.id === interaction.id,
    );
    if (currentIndex !== -1) {
      state.currentHCPInteractions[currentIndex] = interaction;
    } else {
      state.currentHCPInteractions.unshift(interaction);
    }
  }
}

const interactionSlice = createSlice({
  name: "interaction",
  initialState,
  reducers: {
    addMessage(state, action) {
      state.messages.push(action.payload);
    },
    clearMessages(state) {
      state.messages = [];
    },
    setError(state, action) {
      state.error = action.payload;
    },
    setEditingId(state, action) {
      state.editingId = action.payload;
    },
    setFormPrefill(state, action) {
      state.formPrefill = action.payload;
    },
    clearFormPrefill(state) {
      state.formPrefill = null;
    },
    addInteractionOptimistic(state, action) {
      const interaction = { ...action.payload, _optimistic: true };
      state.interactions.unshift(interaction);
      if (shouldUpdateCurrentHCPList(state, interaction.hcp_id)) {
        state.currentHCPInteractions.unshift(interaction);
      }
    },
    updateInteractionOptimistic(state, action) {
      const interaction = { ...action.payload, _optimistic: true };
      replaceInteraction(state, interaction);
    },
    removeInteractionOptimistic(state, action) {
      const id = action.payload;
      state.interactions = state.interactions.filter((i) => i.id !== id);
      state.currentHCPInteractions = state.currentHCPInteractions.filter(
        (i) => i.id !== id,
      );
    },
    confirmOptimisticInteraction(state, action) {
      const { tempId, interaction } = action.payload;
      state.interactions = state.interactions.filter((i) => i.id !== tempId);
      state.currentHCPInteractions = state.currentHCPInteractions.filter(
        (i) => i.id !== tempId,
      );
      replaceInteraction(state, interaction);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchInteractions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInteractions.fulfilled, (state, action) => {
        state.loading = false;
        state.interactions = action.payload;
      })
      .addCase(fetchInteractions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(fetchHCPInteractions.pending, (state) => {
        state.historyLoading = true;
        state.error = null;
      })
      .addCase(fetchHCPInteractions.fulfilled, (state, action) => {
        state.historyLoading = false;
        state.currentHCPId = action.payload.hcpId;
        state.currentHCPInteractions = action.payload.interactions;
      })
      .addCase(fetchHCPInteractions.rejected, (state, action) => {
        state.historyLoading = false;
        state.error = action.error.message;
      })
      .addCase(createInteraction.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createInteraction.fulfilled, (state, action) => {
        state.loading = false;
        state.interactions = state.interactions.filter(
          (i) => !(i._optimistic && i.hcp_id === action.payload.hcp_id),
        );
        state.currentHCPInteractions = state.currentHCPInteractions.filter(
          (i) => !(i._optimistic && i.hcp_id === action.payload.hcp_id),
        );
        replaceInteraction(state, action.payload);
      })
      .addCase(createInteraction.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(updateInteraction.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateInteraction.fulfilled, (state, action) => {
        state.loading = false;
        replaceInteraction(state, action.payload);
        state.editingId = null;
      })
      .addCase(updateInteraction.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(deleteInteraction.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteInteraction.fulfilled, (state, action) => {
        state.loading = false;
        state.interactions = state.interactions.filter(
          (i) => i.id !== action.payload,
        );
        state.currentHCPInteractions = state.currentHCPInteractions.filter(
          (i) => i.id !== action.payload,
        );
      })
      .addCase(deleteInteraction.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(sendChatMessage.pending, (state) => {
        state.chatLoading = true;
        state.error = null;
      })
      .addCase(sendChatMessage.fulfilled, (state, action) => {
        state.chatLoading = false;
        state.messages.push({
          role: "assistant",
          content: action.payload.response,
        });
        
        // Handle structured response with action and prefill
        if (action.payload.action && action.payload.prefill) {
          state.formPrefill = {
            action: action.payload.action,
            data: action.payload.prefill,
          };
        }
      })
      .addCase(sendChatMessage.rejected, (state, action) => {
        state.chatLoading = false;
        state.error = action.payload || action.error.message;
      })
      .addCase(confirmAndSaveInteraction.pending, (state) => {
        state.chatLoading = true;
        state.error = null;
      })
      .addCase(confirmAndSaveInteraction.fulfilled, (state, action) => {
        state.chatLoading = false;
        state.messages.push({
          role: "assistant",
          content: action.payload.response,
        });
        
        // Clear form prefill after successful save
        state.formPrefill = null;
      })
      .addCase(confirmAndSaveInteraction.rejected, (state, action) => {
        state.chatLoading = false;
        state.error = action.payload || action.error.message;
      });
  },
});

export const {
  addMessage,
  clearMessages,
  setError,
  setEditingId,
  setFormPrefill,
  clearFormPrefill,
  addInteractionOptimistic,
  updateInteractionOptimistic,
  removeInteractionOptimistic,
  confirmOptimisticInteraction,
} = interactionSlice.actions;

export default interactionSlice.reducer;
