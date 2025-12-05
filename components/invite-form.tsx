'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2 } from 'lucide-react'

interface InviteFormData {
  email: string
  fullName: string
  role: string
  expertise: string
}

export function InviteForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [formData, setFormData] = useState<InviteFormData>({
    email: '',
    fullName: '',
    role: '',
    expertise: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    // Validate domain
    // TEMPORARY FOR TESTING: Allow Gmail domains to test invite flow
    // TODO: Revert after testing - uncomment the line below and comment out the current line
    // if (!formData.email.endsWith('@kkadvisory.org')) {
    if (!formData.email.endsWith('@kkadvisory.org') && !formData.email.endsWith('@gmail.com')) {
      setError('Only @kkadvisory.org and @gmail.com emails are allowed (Gmail for testing)')
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch('/api/admin/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          fullName: formData.fullName,
          role: formData.role,
          expertise: formData.expertise.split(',').map(tag => tag.trim()).filter(Boolean)
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
        role: '',
        expertise: ''
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
          Create a new team member profile and send them an invite link.
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
                placeholder="user@kkadvisory.org (or gmail.com for testing)"
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
            <Label htmlFor="role">Role *</Label>
            <Input
              id="role"
              placeholder="Healthcare Consultant"
              value={formData.role}
              onChange={handleInputChange('role')}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expertise">Expertise (comma-separated)</Label>
            <Textarea
              id="expertise"
              placeholder="Healthcare Strategy, Data Analytics, Compliance"
              value={formData.expertise}
              onChange={handleInputChange('expertise')}
              rows={3}
            />
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
