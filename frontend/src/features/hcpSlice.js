import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../api/api";

// Async thunks
export const fetchHCPs = createAsyncThunk(
  "hcp/fetchHCPs",
  async ({ search = "", skip = 0, limit = 100 } = {}) => {
    const response = await api.get("/api/hcps", {
      params: { search, skip, limit },
    });
    return response.data;
  }
);

export const createHCP = createAsyncThunk(
  "hcp/createHCP",
  async (hcpData) => {
    const response = await api.post("/api/hcps", hcpData);
    return response.data;
  }
);

export const updateHCP = createAsyncThunk(
  "hcp/updateHCP",
  async ({ id, ...hcpData }) => {
    const response = await api.put(`/api/hcps/${id}`, hcpData);
    return response.data;
  }
);

export const deleteHCP = createAsyncThunk(
  "hcp/deleteHCP",
  async (id) => {
    await api.delete(`/api/hcps/${id}`);
    return id;
  }
);

const initialState = {
  hcps: [],
  selectedHCP: null,
  loading: false,
  error: null,
};

const hcpSlice = createSlice({
  name: "hcp",
  initialState,
  reducers: {
    selectHCP(state, action) {
      state.selectedHCP = action.payload;
    },
    clearSelectedHCP(state) {
      state.selectedHCP = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch HCPs
      .addCase(fetchHCPs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchHCPs.fulfilled, (state, action) => {
        state.loading = false;
        state.hcps = action.payload;
      })
      .addCase(fetchHCPs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      // Create HCP
      .addCase(createHCP.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createHCP.fulfilled, (state, action) => {
        state.loading = false;
        state.hcps.push(action.payload);
      })
      .addCase(createHCP.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      // Update HCP
      .addCase(updateHCP.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateHCP.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.hcps.findIndex((hcp) => hcp.id === action.payload.id);
        if (index !== -1) {
          state.hcps[index] = action.payload;
        }
        if (state.selectedHCP?.id === action.payload.id) {
          state.selectedHCP = action.payload;
        }
      })
      .addCase(updateHCP.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      // Delete HCP
      .addCase(deleteHCP.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteHCP.fulfilled, (state, action) => {
        state.loading = false;
        state.hcps = state.hcps.filter((hcp) => hcp.id !== action.payload);
        if (state.selectedHCP?.id === action.payload) {
          state.selectedHCP = null;
        }
      })
      .addCase(deleteHCP.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  },
});

export const { selectHCP, clearSelectedHCP } = hcpSlice.actions;
export default hcpSlice.reducer;
