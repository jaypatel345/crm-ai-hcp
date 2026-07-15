import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../api/api";

// Async thunks
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
    return response.data;
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
      // Axios timeout errors set code === 'ECONNABORTED'
      if (err && err.code === "ECONNABORTED") {
        return thunkAPI.rejectWithValue(
          "Request timed out while waiting for AI response.",
        );
      }
      // Forward server-provided detail if available
      const serverDetail = err?.response?.data?.detail;
      if (serverDetail) return thunkAPI.rejectWithValue(serverDetail);
      return thunkAPI.rejectWithValue(err.message || "Unknown error");
    }
  },
);

const initialState = {
  interactions: [],
  currentHCPInteractions: [],
  messages: [],
  loading: false,
  error: null,
  chatLoading: false,
};

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
    setLoading(state, action) {
      state.loading = action.payload;
    },
    setError(state, action) {
      state.error = action.payload;
    },
    // Optimistic updates
    addInteractionOptimistic(state, action) {
      state.interactions.unshift(action.payload);
      state.currentHCPInteractions.unshift(action.payload);
    },
    updateInteractionOptimistic(state, action) {
      const index = state.interactions.findIndex(
        (i) => i.id === action.payload.id,
      );
      if (index !== -1) {
        state.interactions[index] = action.payload;
      }
      const currentIndex = state.currentHCPInteractions.findIndex(
        (i) => i.id === action.payload.id,
      );
      if (currentIndex !== -1) {
        state.currentHCPInteractions[currentIndex] = action.payload;
      }
    },
    removeInteractionOptimistic(state, action) {
      state.interactions = state.interactions.filter(
        (i) => i.id !== action.payload,
      );
      state.currentHCPInteractions = state.currentHCPInteractions.filter(
        (i) => i.id !== action.payload,
      );
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch interactions
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
      // Fetch HCP interactions
      .addCase(fetchHCPInteractions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchHCPInteractions.fulfilled, (state, action) => {
        state.loading = false;
        state.currentHCPInteractions = action.payload;
      })
      .addCase(fetchHCPInteractions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      // Create interaction
      .addCase(createInteraction.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createInteraction.fulfilled, (state, action) => {
        state.loading = false;
        state.interactions.unshift(action.payload);
        state.currentHCPInteractions.unshift(action.payload);
      })
      .addCase(createInteraction.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      // Update interaction
      .addCase(updateInteraction.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateInteraction.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.interactions.findIndex(
          (i) => i.id === action.payload.id,
        );
        if (index !== -1) {
          state.interactions[index] = action.payload;
        }
        const currentIndex = state.currentHCPInteractions.findIndex(
          (i) => i.id === action.payload.id,
        );
        if (currentIndex !== -1) {
          state.currentHCPInteractions[currentIndex] = action.payload;
        }
      })
      .addCase(updateInteraction.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      // Delete interaction
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
      // Chat message
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
      })
      .addCase(sendChatMessage.rejected, (state, action) => {
        state.chatLoading = false;
        // Prefer the payload from rejectWithValue, fallback to action.error.message
        state.error = action.payload || action.error.message;
      });
  },
});

export const {
  addMessage,
  clearMessages,
  setLoading,
  setError,
  addInteractionOptimistic,
  updateInteractionOptimistic,
  removeInteractionOptimistic,
} = interactionSlice.actions;
export default interactionSlice.reducer;
