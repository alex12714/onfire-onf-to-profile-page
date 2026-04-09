"use client"

import Image from "next/image"
import Link from "next/link"
import { useParams, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"

interface CheckoutStatus {
  success: boolean
  status: string
  payment_status: string
  amount_total: number
  currency: string
  customer_email: string
}

export default function CheckoutSuccessPage() {
  const params = useParams<{ handle: string }>()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get("session_id")
  const type = searchParams.get("type")

  const [loading, setLoading] = useState(true)
  const [checkoutData, setCheckoutData] = useState<CheckoutStatus | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!sessionId) {
      setLoading(false)
      setError(true)
      return
    }

    const verifyPayment = async () => {
      try {
        const res = await fetch(`/api/checkout/status?session_id=${encodeURIComponent(sessionId)}`)
        if (!res.ok) throw new Error("Failed to verify payment")
        const data = await res.json()
        setCheckoutData(data)
      } catch (err) {
        console.error("Payment verification failed:", err)
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    verifyPayment()
  }, [sessionId])

  const formatAmount = (amountCents: number, currency: string) => {
    const amount = amountCents / 100
    const sym = currency?.toUpperCase() || "USD"
    return `${sym} ${amount.toFixed(2)}`
  }

  const isPaid = checkoutData?.payment_status === "paid"

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
        <div className="w-full max-w-lg text-center">
          {loading ? (
            <div>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-6"></div>
              <p className="text-white text-lg">Verifying payment...</p>
            </div>
          ) : isPaid && checkoutData ? (
            <div className="space-y-6">
              {/* Green checkmark */}
              <div className="mx-auto w-20 h-20 rounded-full bg-green-500 flex items-center justify-center animate-[scale-in_0.3s_ease-out]">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <h1 className="text-3xl font-bold text-white">Payment Successful!</h1>

              <p className="text-2xl font-semibold text-green-400">
                {formatAmount(checkoutData.amount_total, checkoutData.currency)}
              </p>

              <p className="text-gray-300 text-lg">
                {type === "booking"
                  ? "Your booking has been confirmed!"
                  : "Your order has been placed!"}
              </p>

              {checkoutData.customer_email && (
                <p className="text-gray-400 text-sm">
                  A confirmation has been sent to {checkoutData.customer_email}
                </p>
              )}

              <Link
                href={`/${params.handle}`}
                className="inline-block mt-4 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-semibold py-3 px-8 rounded-full shadow-lg transform transition-all duration-200 hover:scale-105"
              >
                Back to Profile
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Warning icon */}
              <div className="mx-auto w-20 h-20 rounded-full bg-yellow-500 flex items-center justify-center">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01M12 2l10 18H2L12 2z" />
                </svg>
              </div>

              <h1 className="text-3xl font-bold text-white">
                {error ? "Payment Verification Failed" : "Payment Pending"}
              </h1>

              <p className="text-gray-300 text-lg">
                {error
                  ? "We couldn't verify your payment. Please contact support if you were charged."
                  : "Your payment is still being processed. Please check back shortly."}
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center mt-4">
                {sessionId && (
                  <button
                    onClick={() => window.location.reload()}
                    className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-semibold py-3 px-8 rounded-full shadow-lg transform transition-all duration-200 hover:scale-105"
                  >
                    Try Again
                  </button>
                )}
                <Link
                  href={`/${params.handle}`}
                  className="inline-block border border-gray-500 text-gray-300 hover:text-white hover:border-gray-400 font-semibold py-3 px-8 rounded-full transition-all duration-200"
                >
                  Back to Profile
                </Link>
              </div>
            </div>
          )}

          {/* Download App Section */}
          {isPaid && (
            <div className="mt-12 pt-8 border-t border-gray-700/50">
              <p className="text-gray-300 mb-6 text-lg">Get the OnFire app</p>
              <div className="flex justify-center gap-4 flex-wrap">
                <Link href="https://apps.apple.com/app/onfire" target="_blank">
                  <Image
                    src="/app-store-button.png"
                    alt="Download on the App Store"
                    width={180}
                    height={53}
                    className="hover:opacity-90 transition-all duration-200 drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] hover:drop-shadow-[0_0_12px_rgba(255,255,255,0.5)]"
                  />
                </Link>
                <Link href="https://play.google.com/store/apps/details?id=com.onfire" target="_blank">
                  <Image
                    src="/google-play-button.png"
                    alt="Get it on Google Play"
                    width={180}
                    height={53}
                    className="hover:opacity-90 transition-all duration-200 drop-shadow-[0_0_12px_rgba(255,255,255,0.5)]"
                  />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
