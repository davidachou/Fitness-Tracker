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

interface Profile {
  id: string
  email: string
  full_name: string
  role: string
  expertise: string[]
  is_admin: boolean
  avatar_url?: string
}

export function DashboardContent() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingExpertise, setEditingExpertise] = useState(false)
  const [newExpertise, setNewExpertise] = useState('')
  const router = useRouter()

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

  const updateExpertise = async (newExpertise: string[]) => {
    if (!profile) return

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('profiles')
        .update({ expertise: newExpertise })
        .eq('id', profile.id)

      if (error) throw error

      setProfile({ ...profile, expertise: newExpertise })
    } catch (err) {
      console.error('Failed to update expertise:', err)
      setError('Failed to update expertise')
    }
  }

  const addExpertise = async () => {
    if (!newExpertise.trim()) return
    const updated = [...(profile?.expertise || []), newExpertise.trim()]
    await updateExpertise(updated)
    setNewExpertise('')
  }

  const removeExpertise = async (index: number) => {
    if (!profile?.expertise) return
    const updated = profile.expertise.filter((_, i) => i !== index)
    await updateExpertise(updated)
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
            <h1 className="text-3xl font-bold">Welcome to KK Advisory Services</h1>
            <p className="text-muted-foreground mt-2">Team Intranet Dashboard</p>
          </div>
          <div className="flex gap-4">
            <Link
              href="/"
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
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
              <CardDescription>Your team member information</CardDescription>
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
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-muted-foreground">Expertise</label>
                  <button
                    onClick={() => setEditingExpertise(!editingExpertise)}
                    className="text-xs text-primary hover:underline"
                  >
                    {editingExpertise ? 'Done' : 'Edit'}
                  </button>
                </div>
                {profile.expertise && profile.expertise.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-1">
                    {profile.expertise.map((skill: string, index: number) => (
                      <Badge key={index} variant="secondary" className="relative">
                        {skill}
                        {editingExpertise && (
                          <button
                            onClick={() => removeExpertise(index)}
                            className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-xs hover:bg-red-600"
                          >
                            ×
                          </button>
                        )}
                      </Badge>
                    ))}
                  </div>
                )}
                {editingExpertise && (
                  <div className="mt-2 flex gap-2">
                    <input
                      type="text"
                      value={newExpertise}
                      onChange={(e) => setNewExpertise(e.target.value)}
                      placeholder="Add new expertise..."
                      className="flex-1 px-2 py-1 text-sm border rounded"
                      onKeyPress={(e) => e.key === 'Enter' && addExpertise()}
                    />
                    <button
                      onClick={addExpertise}
                      className="px-3 py-1 bg-primary text-primary-foreground text-sm rounded hover:bg-primary/90"
                    >
                      Add
                    </button>
                  </div>
                )}
                {(!profile.expertise || profile.expertise.length === 0) && !editingExpertise && (
                  <p className="text-sm text-muted-foreground mt-1">No expertise added yet.</p>
                )}
              </div>
              {profile.is_admin && (
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
              {profile.is_admin && (
                <a
                  href="/admin/invite"
                  className="block w-full p-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                >
                  Invite Team Members
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
          <p>© 2024 KK Advisory Services - Internal Team Portal</p>
        </div>
      </div>
    </div>
  )
}

