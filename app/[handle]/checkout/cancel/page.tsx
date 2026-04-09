"use client"

import Image from "next/image"
import Link from "next/link"
import { useParams } from "next/navigation"

export default function CheckoutCancelPage() {
  const params = useParams<{ handle: string }>()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fillRule='evenodd'%3E%3Cg fill='%23ffffff' fillOpacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      {/* Header */}
      <header className="flex items-center justify-between p-4 md:p-6">
        <div className="flex items-center gap-3">
          <Image src="/onfire-logo.png" alt="OnFire" width={32} height={32} className="rounded-lg" />
          <span className="text-white font-semibold text-lg">OnFire</span>
        </div>
      </header>

      {/* Content */}
      <div className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg text-center space-y-6">
          {/* Orange/red X icon */}
          <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>

          <h1 className="text-3xl font-bold text-white">Checkout Cancelled</h1>

          <p className="text-gray-300 text-lg">
            Your payment was not processed. No charges were made.
          </p>

          <Link
            href={`/${params.handle}`}
            className="inline-block mt-4 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-semibold py-3 px-8 rounded-full shadow-lg transform transition-all duration-200 hover:scale-105"
          >
            Back to Profile
          </Link>
        </div>
      </div>
    </div>
  )
}
