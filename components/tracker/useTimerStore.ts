"use client";

import { create } from "zustand";

export type RunningTimer = {
  id: string;
  user_id: string;
  project_id: string | null;
  client_id?: string | null;
  client_name?: string | null;
  task_id?: string | null;
  description: string | null;
  start_time: string;
  billable?: boolean | null;
  project_name?: string | null;
  task_name?: string | null;
};

type TimerState = {
  runningTimer: RunningTimer | null;
  isSyncing: boolean;
  setRunningTimer: (timer: RunningTimer | null) => void;
  setSyncing: (value: boolean) => void;
};

export const useTimerStore = create<TimerState>((set) => ({
  runningTimer: null,
  isSyncing: false,
  setRunningTimer: (timer) => set({ runningTimer: timer }),
  setSyncing: (value) => set({ isSyncing: value }),
}));


