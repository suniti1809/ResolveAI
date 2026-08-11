// complaintSlice.js – Redux Toolkit slice for complaint state management
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
const BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "https://resolveai-xnzt.onrender.com";
const api      = axios.create({ baseURL: BASE_URL });

// ─────────────────────────────────────────────
// Async Thunks
// ─────────────────────────────────────────────

export const fetchComplaints = createAsyncThunk(
  "complaints/fetchAll",
  async ({ page = 1, pageSize = 10, filters = {} } = {}, { rejectWithValue }) => {
    try {
      const params = { page, page_size: pageSize, ...filters };
      const { data } = await api.get("/api/complaints", { params });
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || err.message);
    }
  }
);

export const fetchComplaintById = createAsyncThunk(
  "complaints/fetchById",
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/api/complaints/${id}`);
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || err.message);
    }
  }
);

export const createComplaint = createAsyncThunk(
  "complaints/create",
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/api/complaints", payload);
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || err.message);
    }
  }
);

export const updateComplaint = createAsyncThunk(
  "complaints/update",
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const { data } = await api.patch(`/api/complaints/${id}`, payload);
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || err.message);
    }
  }
);

export const deleteComplaint = createAsyncThunk(
  "complaints/delete",
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/api/complaints/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || err.message);
    }
  }
);

export const fetchStats = createAsyncThunk(
  "complaints/fetchStats",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/api/stats");
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || err.message);
    }
  }
);

// ─────────────────────────────────────────────
// Initial State
// ─────────────────────────────────────────────

const initialState = {
  items:          [],
  selected:       null,
  total:          0,
  page:           1,
  pageSize:       10,
  stats:          { total_complaints: 0, open: 0, resolved: 0, critical: 0, in_progress: 0 },
  filters:        {},
  status:         "idle",   // idle | loading | succeeded | failed
  createStatus:   "idle",
  error:          null,
};

// ─────────────────────────────────────────────
// Slice
// ─────────────────────────────────────────────

const complaintSlice = createSlice({
  name: "complaints",
  initialState,

  reducers: {
    setPage(state, { payload }) {
      state.page = payload;
    },
    setFilters(state, { payload }) {
      state.filters = payload;
      state.page    = 1;
    },
    clearSelected(state) {
      state.selected = null;
    },
    resetCreateStatus(state) {
      state.createStatus = "idle";
      state.error        = null;
    },
  },

  extraReducers: (builder) => {
    // ── fetchComplaints ──────────────────────
    builder
      .addCase(fetchComplaints.pending,   (s) => { s.status = "loading"; })
      .addCase(fetchComplaints.fulfilled, (s, { payload }) => {
        s.status    = "succeeded";
        s.items     = payload.complaints;
        s.total     = payload.total;
        s.page      = payload.page;
        s.pageSize  = payload.page_size;
      })
      .addCase(fetchComplaints.rejected,  (s, { payload }) => {
        s.status = "failed";
        s.error  = payload;
      });

    // ── fetchComplaintById ───────────────────
    builder
      .addCase(fetchComplaintById.fulfilled, (s, { payload }) => {
        s.selected = payload;
      });

    // ── createComplaint ──────────────────────
    builder
      .addCase(createComplaint.pending,   (s) => { s.createStatus = "loading"; })
      .addCase(createComplaint.fulfilled, (s, { payload }) => {
        s.createStatus = "succeeded";
        s.items.unshift(payload);
        s.total += 1;
      })
      .addCase(createComplaint.rejected,  (s, { payload }) => {
        s.createStatus = "failed";
        s.error        = payload;
      });

    // ── updateComplaint ──────────────────────
    builder
      .addCase(updateComplaint.fulfilled, (s, { payload }) => {
        const idx = s.items.findIndex((c) => c.id === payload.id);
        if (idx !== -1) s.items[idx] = payload;
        if (s.selected?.id === payload.id) s.selected = payload;
      });

    // ── deleteComplaint ──────────────────────
    builder
      .addCase(deleteComplaint.fulfilled, (s, { payload: id }) => {
        s.items = s.items.filter((c) => c.id !== id);
        s.total = Math.max(0, s.total - 1);
        if (s.selected?.id === id) s.selected = null;
      });

    // ── fetchStats ───────────────────────────
    builder
      .addCase(fetchStats.fulfilled, (s, { payload }) => {
        s.stats = payload;
      });
  },
});

export const { setPage, setFilters, clearSelected, resetCreateStatus } = complaintSlice.actions;
export default complaintSlice.reducer;
