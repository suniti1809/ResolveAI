// Redux store – central state management for AIVOA CCMS frontend
import { configureStore } from "@reduxjs/toolkit";
import complaintReducer from "./complaintSlice";

const store = configureStore({
  reducer: {
    complaints: complaintReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore date objects stored in complaint records
        ignoredPaths: ["complaints.items"],
      },
    }),
  devTools: import.meta.env.DEV,
});

export default store;
