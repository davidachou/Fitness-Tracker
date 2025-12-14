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
    console.log('Checking for existing profile for userId:', userId)
    const { data: existingProfiles, error: checkError } = await adminSupabase
      .from('profiles')
      .select('id')
      .eq('id', userId)

    if (checkError) {
      console.error('Error checking existing profile:', checkError)
    }

    console.log('Existing profiles found:', existingProfiles?.length || 0)

    if (existingProfiles && existingProfiles.length > 0) {
      console.log('Profile already exists, skipping creation')
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
    // TODO: Update this with your admin email address
    const ADMIN_ALLOW_LIST = ['admin@yourdomain.com']
    const isAdmin =
      ADMIN_ALLOW_LIST.includes(email!) ||
      user.user_metadata?.invite_is_admin === true

    const profileData = {
      id: userId,
      email: email!,
      full_name: fullName,
      role: isAdmin ? 'Administrator' : role,
      is_admin: isAdmin,
      avatar_url: userMetadata?.avatar_url,
      bio: invitedBio || bioFromMetadata || null,
    }

    console.log('Profile data to insert:', JSON.stringify(profileData, null, 2))
    console.log('Role extracted:', role, 'isAdmin:', isAdmin)
    console.log('hasInviteData:', hasInviteData, 'invite_role:', user.user_metadata?.invite_role)

    console.log('Attempting to create profile with data:', profileData)

    const { error: createError } = await adminSupabase
      .from('profiles')
      .insert(profileData)

    if (createError) {
      console.error('Profile creation error:', createError)
      return NextResponse.json({
        error: 'Failed to create profile',
        details: createError.message,
        code: createError.code
      }, { status: 500 })
    }

    console.log('Profile created via API for user:', userId)
    console.log('User metadata at creation:', user.user_metadata)
    console.log('Has invite data:', hasInviteData)

    return NextResponse.json({
      success: true,
      profile: { id: userId, email, full_name: fullName, role: isAdmin ? 'Administrator' : role }
    })

  } catch (error) {
    console.error('Create profile API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
