/* eslint-disable */
'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { createAdminClient } from '@/lib/supabase/admin'
import { LogoutButton } from '@/components/logout-button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAdminUIMode } from '@/hooks/use-admin-ui-mode'
import { shouldShowAdminFeatures } from '@/lib/utils'

interface Profile {
  id: string
  email: string
  full_name: string
  role: string
  is_admin: boolean
  avatar_url?: string
}

export function DashboardContent() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { adminUIMode } = useAdminUIMode()

  const loadDashboardData = async () => {
    try {
      const supabase = createClient()
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      let user = session?.user

      if (sessionError || !session) {
        const { data: { user: userFromGetUser }, error: userError } = await supabase.auth.getUser()

        if (userError || !userFromGetUser) {
          router.push('/auth/login')
          return
        }
        user = userFromGetUser
      }

      if (!user) {
        router.push('/auth/login')
        return
      }

      // Check if user has a profile
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (userProfile) {
        setProfile(userProfile)
      } else {
        // Create profile
        const response = await fetch('/api/dashboard/create-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            email: user.email,
            userMetadata: user.user_metadata
          })
        })

        if (response.ok) {
          const result = await response.json()
          setProfile(result.profile)
        } else {
          const errorData = await response.json()
          setError('Failed to create profile')
        }
      }

    } catch (err) {
      console.error('Dashboard error:', err)
      setError('Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }


  React.useEffect(() => {
    loadDashboardData()
  }, [])

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground mb-4">Loading your dashboard...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Dashboard</h1>
            <p className="text-muted-foreground mb-6">{error || 'Profile not found'}</p>


            <button
              onClick={() => router.push('/auth/login')}
              className="bg-primary text-primary-foreground px-4 py-2 rounded hover:bg-primary/90"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold">Welcome to Fitness Tracker</h1>
            <p className="text-muted-foreground mt-2">Your Personal Dashboard</p>
          </div>
          <div className="flex gap-4">
            <Link
              href="/"
              className="inline-flex items-center px-4 py-2 border border-border rounded-md shadow-sm text-sm font-medium text-foreground bg-background hover:bg-muted focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring"
            >
              ← Back to Home
            </Link>
            <LogoutButton />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Profile Card */}
          <Card>
            <CardHeader>
              <CardTitle>Your Profile</CardTitle>
              <CardDescription>Your profile information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Name</label>
                <p className="text-lg font-semibold">{profile.full_name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <p>{profile.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Role</label>
                <p>{profile.role}</p>
              </div>
              {shouldShowAdminFeatures(profile.is_admin, adminUIMode) && (
                <div className="pt-2">
                  <Badge variant="default">Administrator</Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks and links</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {shouldShowAdminFeatures(profile.is_admin, adminUIMode) && (
                <a
                  href="/admin/invite"
                  className="block w-full p-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                >
                  Add Clients
                </a>
              )}
              <div className="text-sm text-muted-foreground">
                More features coming soon...
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-muted-foreground">
          <p>© 2024 Fitness Tracker</p>
        </div>
      </div>
    </div>
  )
}

