import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { InviteForm } from '@/components/invite-form'

// Hardcoded admin allow-list for initial access
// TODO: Update this with your admin email address
const ADMIN_ALLOW_LIST = ['admin@yourdomain.com']

export default async function AdminInvitePage() {
  const supabase = await createClient()

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/auth/login?message=Admin access required')
  }

  // Check if user is in admin allow-list OR has admin role in profiles
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  const isAdmin = ADMIN_ALLOW_LIST.includes(user.email!) || profile?.is_admin === true

  if (!isAdmin) {
    redirect('/dashboard') // Redirect non-admins to dashboard
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Add New Client</h1>
        <p className="text-muted-foreground mb-6">
          Send invites to new fitness clients. Configure allowed email domains in the code.
        </p>

        <InviteForm />

        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Pending Invites</h2>
          <p className="text-muted-foreground">
            Invite management features will be implemented here.
          </p>
        </div>
      </div>
    </div>
  )
}
