import { redirect } from 'next/navigation'

export default function Page() {
  // Sign-ups are completely disabled - only admins can invite users
  redirect('/auth/login?message=Sign-ups are disabled. Please contact an administrator to get invited.')
}
