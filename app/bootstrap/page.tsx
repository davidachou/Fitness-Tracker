import { InviteForm } from '@/components/invite-form'
import { redirect } from 'next/navigation'

export default function BootstrapPage() {
  console.log('BootstrapPage: Rendering bootstrap page - NO REDIRECTS HERE')

  // Force a redirect to ensure we're not being cached
  // This is a temporary debug measure
  const shouldRedirect = false
  if (shouldRedirect) {
    redirect('/bootstrap?nocache=' + Date.now())
  }
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">🚀 Initial Admin Setup</h1>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-yellow-800 mb-2">Welcome to Fitness Tracker</h2>
          <p className="text-yellow-700 mb-4">
            This is an invite-only system. To get started, you need to create the first admin account by inviting yourself.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
            <p className="text-blue-800 text-sm">
              <strong>Step 1:</strong> Fill out the form below with your details<br/>
              <strong>Step 2:</strong> Check your email for the invite link<br/>
              <strong>Step 3:</strong> Click the invite link to complete setup<br/>
              <strong>Step 4:</strong> You can then access the admin panel normally
            </p>
          </div>
          <p className="text-yellow-700 text-sm">
            <strong>Authorized admin:</strong> admin@yourdomain.com<br/>
            <strong>Domain restriction:</strong> Configure your allowed email domains in the code
          </p>
        </div>

        <div className="mb-6">
          <a
            href="/auth/login"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            ← Back to Login
          </a>
        </div>

        <InviteForm />

        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-2">🔒 Security Note</h3>
          <p className="text-sm text-gray-600">
            This bootstrap page is temporary and will be removed once the first admin account is created.
            The invite system ensures only authorized personnel can access the intranet.
          </p>
        </div>
      </div>
    </div>
  )
}
