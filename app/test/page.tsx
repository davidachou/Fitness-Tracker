import Link from "next/link";

export default function TestPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold text-green-600">✅ STATIC TEST PAGE</h1>
      <p className="text-lg mt-4">If you can see this, routing works perfectly!</p>
      <div className="bg-green-100 p-4 rounded mt-4 border border-green-300">
        <h2 className="font-semibold text-green-800">🎉 Success!</h2>
        <p className="text-green-700">No Supabase calls, no redirects, no authentication.</p>
        <p className="text-green-700">This proves the Next.js app is working correctly.</p>
      </div>
      <p className="mt-4">Current time: {new Date().toISOString()}</p>

      <div className="mt-6 space-x-4">
        <Link href="/" className="bg-blue-500 text-white px-4 py-2 rounded inline-block">
          Home
        </Link>
        <Link href="/bootstrap" className="bg-purple-500 text-white px-4 py-2 rounded inline-block">
          Bootstrap
        </Link>
        <Link href="/auth/login" className="bg-gray-500 text-white px-4 py-2 rounded inline-block">
          Login
        </Link>
      </div>

      <div className="mt-6 p-4 bg-yellow-100 border border-yellow-300 rounded">
        <p className="text-yellow-800">
          <strong>If you see this page:</strong> The issue is with Supabase authentication, not routing.
        </p>
        <p className="text-yellow-800">
          <strong>If you get redirected:</strong> There&apos;s a global redirect at the application level.
        </p>
      </div>
    </div>
  )
}
