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

/**
 * Gets avatar URL for a user, prioritizing database avatar_url, then file-based avatars
 * @param name - The user's full name
 * @param avatarUrl - The avatar URL from the database (optional)
 * @returns string - The avatar URL to use
 */
export function getAvatarUrl(name: string | null | undefined, avatarUrl?: string | null): string {
  // Use database avatar if available
  const dbAvatar = (avatarUrl ?? "").trim();
  if (dbAvatar) {
    return dbAvatar;
  }

  // Try to find file-based avatar if name is provided
  const cleanName = (name ?? "").trim();
  if (cleanName) {
    // Replace spaces with spaces (normalize) and try .png extension
    const normalizedName = cleanName.replace(/\s+/g, ' ');
    return `/team/${normalizedName}.png`;
  }

  // No avatar available
  return "";
}