import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// This check can be removed, it is just for tutorial purposes
export const hasEnvVars =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/**
 * Determines if admin features should be shown to the user
 * @param isAdmin - Whether the user has admin privileges
 * @param adminUIMode - Whether admin UI mode is enabled
 * @returns boolean indicating if admin features should be displayed
 */
export function shouldShowAdminFeatures(isAdmin: boolean, adminUIMode: boolean): boolean {
  return isAdmin && adminUIMode;
}