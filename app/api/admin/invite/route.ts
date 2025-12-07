import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Hardcoded admin allow-list for initial access
const ADMIN_ALLOW_LIST = ['david@kkadvisory.org']

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    // Check if this is a bootstrap scenario (no authenticated user yet)
    const adminSupabase = createAdminClient()

    // Check if any users exist in the system
    const { count: userCount } = await adminSupabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })

    const isBootstrapMode = userCount === 0

    if (isBootstrapMode) {
      // Bootstrap mode: allow invite without authentication
      console.log('Bootstrap mode: allowing unauthenticated invite')
    } else {
      // Normal mode: require authentication and admin status
      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      // Check admin status
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()

      const isAdmin = ADMIN_ALLOW_LIST.includes(user.email!) || profile?.is_admin === true

      if (!isAdmin) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
      }
    }

    // Parse request body
    const { email, fullName, role, expertise, isAdmin: requestedAdmin } = await request.json()

    // Validate required fields
    if (!email || !fullName || !role) {
      return NextResponse.json({ error: 'Email, full name, and role are required' }, { status: 400 })
    }

    // Validate domain
    // TEMPORARY FOR TESTING: Allow Gmail domains to test invite flow
    // TODO: Revert after testing - uncomment the line below and comment out the current line
    // if (!email.endsWith('@kkadvisory.org')) {
    if (!email.endsWith('@kkadvisory.org') && !email.endsWith('@gmail.com')) {
      return NextResponse.json({ error: 'Only @kkadvisory.org and @gmail.com emails are allowed (Gmail for testing)' }, { status: 400 })
    }

    // Check if user already exists
    const { data: existingUser } = await adminSupabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single()

    if (existingUser) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 })
    }

    // Send invite using Supabase admin API
    const { data: inviteData, error: inviteError } = await adminSupabase.auth.admin.inviteUserByEmail(email, {
      data: {
        // Store invite data in separate fields to avoid OAuth override
        invite_full_name: fullName,
        invite_role: role,
        invite_expertise: Array.isArray(expertise) ? expertise : [],
        invite_is_admin: requestedAdmin === true,
        // Also set regular fields (may be overridden by OAuth)
        full_name: fullName,
        role: role,
        expertise: Array.isArray(expertise) ? expertise : [],
      }
    })

    if (inviteError) {
      console.error('Invite error:', inviteError)
      return NextResponse.json({ error: 'Failed to send invite' }, { status: 500 })
    }

    // Create the profile immediately using the invited user's ID
    const invitedUserId = inviteData.user?.id
    if (invitedUserId) {
      // Mirror admin logic used elsewhere: explicit allow-list or requested flag
      const isAdminAllowList = ADMIN_ALLOW_LIST.includes(email!)
      const isAdmin = isAdminAllowList || requestedAdmin === true

      const { error: profileInsertError } = await adminSupabase
        .from('profiles')
        .upsert(
          {
            id: invitedUserId,
            email,
            full_name: fullName,
            role: isAdmin ? 'Administrator' : role,
            expertise: Array.isArray(expertise) ? expertise : [],
            is_admin: isAdmin,
            avatar_url: null,
          },
          { onConflict: 'id' },
        )

      if (profileInsertError) {
        console.warn('Profile insert warning after invite (will rely on auth callback fallback):', profileInsertError)
      }
    } else {
      console.warn('Invite succeeded but no user id returned; profile will be created on auth callback.')
    }

    console.log('Invite sent successfully to:', email)

    return NextResponse.json({
      success: true,
      message: `Invite sent to ${email}`,
      user_id: inviteData.user?.id
    })

  } catch (error) {
    console.error('Invite API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
