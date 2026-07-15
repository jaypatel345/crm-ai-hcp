import { configureStore } from "@reduxjs/toolkit";
import interactionReducer from "../features/interactionSlice";
import hcpReducer from "../features/hcpSlice";

export const store = configureStore({
  reducer: {
    interaction: interactionReducer,
    hcp: hcpReducer,
  },
});
