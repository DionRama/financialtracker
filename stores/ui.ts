import { create } from "zustand";

import { isoMonthFromDate } from "@/lib/format";

interface UiState {
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  shiftMonth: (delta: number) => void;

  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export const useUi = create<UiState>((set, get) => ({
  selectedMonth: isoMonthFromDate(new Date()),
  setSelectedMonth: (selectedMonth) => set({ selectedMonth }),
  shiftMonth: (delta) => {
    const [y, m] = get().selectedMonth.split("-").map(Number);
    const d = new Date(Date.UTC(y, (m ?? 1) - 1 + delta, 1));
    set({ selectedMonth: isoMonthFromDate(d) });
  },

  sidebarOpen: false,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
}));
