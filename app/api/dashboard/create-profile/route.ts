import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    // Verify the user is authenticated
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId, email, userMetadata } = await request.json()

    // Verify the authenticated user matches the profile being created
    if (userId !== user.id) {
      return NextResponse.json({ error: 'User ID mismatch' }, { status: 403 })
    }

    // Check if this user was invited (has invite_ prefixed metadata or invited_at)
    const hasInviteData = user.user_metadata?.invite_full_name ||
                         user.user_metadata?.invite_role ||
                         user.invited_at

    const invitedBio = hasInviteData ? user.user_metadata?.invite_bio : null
    const bioFromMetadata = userMetadata?.bio

    // Check if profile already exists
    const adminSupabase = createAdminClient()
    const { data: existingProfile } = await adminSupabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single()

    if (existingProfile) {
      return NextResponse.json({ error: 'Profile already exists' }, { status: 400 })
    }

    // Extract name: prioritize invite data, then OAuth data, then fallback
    const fullName = (hasInviteData && user.user_metadata?.invite_full_name) ||
                    userMetadata?.full_name ||
                    userMetadata?.name ||
                    email?.split('@')[0] ||
                    'Team Member'

    // Extract role: prioritize invite data, then OAuth data, then default
    const role = (hasInviteData && user.user_metadata?.invite_role) ||
                userMetadata?.role ||
                'Team Member'

    // Check if user should be admin (explicit allow-list or invite flag)
    const ADMIN_ALLOW_LIST = ['david@kkadvisory.org']
    const isAdmin =
      ADMIN_ALLOW_LIST.includes(email!) ||
      user.user_metadata?.invite_is_admin === true

    // Extract expertise from invite data if available
    const expertise = (hasInviteData && user.user_metadata?.invite_expertise) ?
                     (Array.isArray(user.user_metadata.invite_expertise) ? user.user_metadata.invite_expertise : []) :
                     []

    const { data: newProfile, error: createError } = await adminSupabase
      .from('profiles')
      .insert({
        id: userId,
        email: email!,
        full_name: fullName,
        role: isAdmin ? 'Administrator' : role,
        expertise: expertise,
        is_admin: isAdmin,
        avatar_url: userMetadata?.avatar_url,
        bio: invitedBio || bioFromMetadata || null,
      })
      .select()
      .single()

    if (createError) {
      console.error('Profile creation error:', createError)
      return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 })
    }

    console.log('Profile created via API:', newProfile)

    return NextResponse.json({
      success: true,
      profile: newProfile
    })

  } catch (error) {
    console.error('Create profile API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
