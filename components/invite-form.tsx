'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2 } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'

interface InviteFormData {
  email: string
  fullName: string
  bio: string
  isAdmin: boolean
}

export function InviteForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [formData, setFormData] = useState<InviteFormData>({
    email: '',
    fullName: '',
    bio: '',
    isAdmin: false
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    // Domain validation disabled - allow any email domain
    // const allowedDomains = ['@gmail.com', '@yourdomain.com'] // Update with your domains
    // const isValidDomain = allowedDomains.some(domain => formData.email.endsWith(domain))
    // if (!isValidDomain) {
    //   setError(`Only emails from allowed domains are permitted. Allowed: ${allowedDomains.join(', ')}`)
    //   setIsLoading(false)
    //   return
    // }

    try {
      const response = await fetch('/api/admin/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          fullName: formData.fullName,
          bio: formData.bio,
          isAdmin: formData.isAdmin
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send invite')
      }

      setSuccess(`Invite sent successfully to ${formData.email}`)

      // Reset form
      setFormData({
        email: '',
        fullName: '',
        bio: '',
        isAdmin: false
      })

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: keyof InviteFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Send Invite</CardTitle>
        <CardDescription>
          Create a new client profile and send them an invite link.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@yourdomain.com"
                value={formData.email}
                onChange={handleInputChange('email')}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                placeholder="John Doe"
                value={formData.fullName}
                onChange={handleInputChange('fullName')}
                required
              />
            </div>
          </div>


          <div className="space-y-2">
            <Label htmlFor="bio">Bio (optional)</Label>
            <Textarea
              id="bio"
              placeholder="Tell us about the client's fitness goals and background."
              value={formData.bio}
              onChange={handleInputChange('bio')}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">Optional information about the client.</p>
          </div>




          <div className="flex items-center space-x-2 rounded-lg border border-border/60 bg-muted/40 p-3">
            <Checkbox
              id="isAdmin"
              checked={formData.isAdmin}
              onCheckedChange={(val) =>
                setFormData((prev) => ({
                  ...prev,
                  isAdmin: Boolean(val),
                }))
              }
            />
            <div className="space-y-0.5">
              <Label htmlFor="isAdmin">Make administrator</Label>
              <p className="text-xs text-muted-foreground">
                Leave unchecked to invite as a client.
              </p>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send Invite
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
