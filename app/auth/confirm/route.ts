import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  if (token_hash && type) {
    const supabase = await createClient();

    const { data: authData, error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });

    if (!error && authData.user) {
      const user = authData.user;

      // Check if this is an invited user who needs profile creation
      if (user.user_metadata && user.user_metadata.invited_at) {
        // This is an invited user - create their profile
        const adminSupabase = createAdminClient();

        // Check if profile already exists
        const { data: existingProfile } = await adminSupabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .single();

        if (!existingProfile) {
          // Create profile with data from invite
          const { error: profileError } = await adminSupabase
            .from('profiles')
            .insert({
              id: user.id,
              email: user.email!,
              full_name: user.user_metadata.full_name || user.user_metadata.name || 'Unknown',
              role: user.user_metadata.role || 'Team Member',
              expertise: user.user_metadata.expertise || [],
              is_admin: false
            });

          if (profileError) {
            console.error('Profile creation error:', profileError);
            redirect(`/auth/error?error=Failed to create profile`);
          }
        }
      }

      // Redirect to dashboard for authenticated users
      redirect('/dashboard');
    } else {
      // redirect the user to an error page with some instructions
      redirect(`/auth/error?error=${error?.message}`);
    }
  }

  // redirect the user to an error page with some instructions
  redirect(`/auth/error?error=No token hash or type`);
}
