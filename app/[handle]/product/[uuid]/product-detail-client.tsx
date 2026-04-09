"use client"

import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { useState, useEffect } from "react"

interface ProductImage {
  image_url: string
  is_primary: boolean
}

interface ProductData {
  name: string
  description: string
  price: number
  currency: string
  compare_at_price: number | null
  cover_image: string | null
  images: ProductImage[]
  uuid?: string
}

interface SellerData {
  username: string
  name: string
  avatar: string | null
}

interface ErrorState {
  message: string
  type: "not-found" | "api-unavailable" | "network-error"
  canRetry: boolean
}

function formatPrice(price: number, currency: string): string {
  return `${currency.toUpperCase()} ${price.toFixed(2)}`
}

function getPrimaryImage(product: ProductData): string {
  const primary = product.images?.find((i) => i.is_primary)
  return primary?.image_url || product.images?.[0]?.image_url || product.cover_image || "/placeholder.svg"
}

function getDiscountPercentage(price: number, compareAtPrice: number | null): number {
  if (!compareAtPrice || compareAtPrice <= price) return 0
  return Math.round((1 - price / compareAtPrice) * 100)
}

export default function ProductDetailClient({ params }: { params: { handle: string; uuid: string } }) {
  const [product, setProduct] = useState<ProductData | null>(null)
  const [seller, setSeller] = useState<SellerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<ErrorState | null>(null)
  const [selectedImage, setSelectedImage] = useState<string>("")
  const [quantity, setQuantity] = useState(1)
  const [checkoutLoading, setCheckoutLoading] = useState(false)

  const fetchProduct = async (isRetry = false) => {
    try {
      if (isRetry) {
        setLoading(true)
        setError(null)
      }

      const response = await fetch("https://api2.onfire.so/rpc/get_public_product_detail", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({ p_uuid: params.uuid }),
      })

      if (!response.ok) {
        if (response.status >= 500) {
          setError({
            message: "OnFire API is temporarily unavailable. Please try again in a few moments.",
            type: "api-unavailable",
            canRetry: true,
          })
          return
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (!data.success) {
        if (data.error === "Product not found" || !data.product) {
          setError({
            message: "This product could not be found or may have been removed.",
            type: "not-found",
            canRetry: false,
          })
          return
        }
        throw new Error(data.error || "Unknown error")
      }

      setProduct(data.product)
      setSeller(data.seller)
      setSelectedImage(getPrimaryImage(data.product))
      setError(null)
    } catch (err) {
      console.error("Error fetching product:", err)
      setError({
        message: "Unable to load product. Please check your internet connection and try again.",
        type: "network-error",
        canRetry: true,
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProduct()
  }, [params.uuid])

  const handleBuyNow = async () => {
    if (!product) return

    setCheckoutLoading(true)
    try {
      const amountInCents = Math.round(product.price * 100)

      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [
            {
              name: product.name,
              amount: amountInCents,
              currency: (product.currency || "gbp").toLowerCase(),
              quantity,
            },
          ],
          success_url: `https://onf.to/${params.handle}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `https://onf.to/${params.handle}/product/${params.uuid}`,
          metadata: {
            type: "product_purchase",
            product_uuid: params.uuid,
            seller_handle: params.handle,
          },
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to create checkout session")
      }

      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error("No checkout URL returned")
      }
    } catch (err) {
      console.error("Checkout error:", err)
      alert("Unable to start checkout. Please try again.")
    } finally {
      setCheckoutLoading(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading product...</p>
        </div>
      </div>
    )
  }

  // Error: not found
  if (error?.type === "not-found") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fillRule='evenodd'%3E%3Cg fill='%23ffffff' fillOpacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
        </div>

        <header className="flex items-center justify-between p-4 md:p-6">
          <Link href={`/${params.handle}`} className="flex items-center gap-3">
            <Image src="/onfire-logo.png" alt="OnFire" width={32} height={32} className="rounded-lg" />
            <span className="text-white font-semibold text-lg">OnFire</span>
          </Link>
        </header>

        <div className="flex items-center justify-center px-4 py-8">
          <Card className="w-full max-w-lg bg-gray-800/80 backdrop-blur-sm border-gray-700/50 shadow-2xl">
            <CardContent className="p-8 text-center">
              <div className="text-6xl mb-6">📦</div>
              <h1 className="text-white text-2xl font-bold mb-4">Product Not Found</h1>
              <p className="text-gray-300 mb-6 leading-relaxed">{error.message}</p>
              <Link
                href={`/${params.handle}`}
                className="text-orange-400 hover:text-orange-300 underline"
              >
                Back to Profile
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Error: retryable
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-6">
            {error.type === "api-unavailable" ? "🔧" : "📡"}
          </div>
          <h1 className="text-white text-2xl font-bold mb-4">
            {error.type === "api-unavailable" ? "Service Temporarily Unavailable" : "Connection Error"}
          </h1>
          <p className="text-gray-300 mb-6 leading-relaxed">{error.message}</p>
          <div className="space-y-4">
            {error.canRetry && (
              <Button
                onClick={() => fetchProduct(true)}
                className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-semibold py-3 px-6 rounded-full shadow-lg transform transition-all duration-200 hover:scale-105"
                disabled={loading}
              >
                Try Again
              </Button>
            )}
            <div>
              <Link href={`/${params.handle}`} className="text-orange-400 hover:text-orange-300 underline text-sm">
                Back to Profile
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!product || !seller) return null

  const discount = getDiscountPercentage(product.price, product.compare_at_price)
  const isOnSale = discount > 0
  const allImages = product.images?.length
    ? product.images.map((i) => i.image_url)
    : product.cover_image
      ? [product.cover_image]
      : ["/placeholder.svg"]

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
        <Link href={`/${params.handle}`} className="flex items-center gap-3">
          <Image src="/onfire-logo.png" alt="OnFire" width={32} height={32} className="rounded-lg" />
          <span className="text-white font-semibold text-lg">OnFire</span>
        </Link>
        <Link
          href={`/${params.handle}`}
          className="text-gray-300 hover:text-white text-sm flex items-center gap-1 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Profile
        </Link>
      </header>

      {/* Product Detail Card */}
      <div className="flex items-start justify-center px-4 py-4 md:py-8">
        <Card className="w-full max-w-4xl bg-gray-800/80 backdrop-blur-sm border-gray-700/50 shadow-2xl">
          <CardContent className="p-0">
            <div className="md:flex">
              {/* Image Gallery */}
              <div className="md:w-1/2 p-4 md:p-6">
                {/* Main Image */}
                <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-gray-700/50 mb-3">
                  {isOnSale && (
                    <div className="absolute top-3 right-3 bg-red-500 text-white text-xs font-bold rounded-full w-12 h-12 flex items-center justify-center z-10">
                      -{discount}%
                    </div>
                  )}
                  <Image
                    src={selectedImage || "/placeholder.svg"}
                    alt={product.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 50vw"
                    priority
                  />
                </div>

                {/* Thumbnails */}
                {allImages.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {allImages.map((img, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedImage(img)}
                        className={`relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all duration-200 ${
                          selectedImage === img
                            ? "border-orange-500 shadow-lg shadow-orange-500/20"
                            : "border-gray-600/50 hover:border-gray-500"
                        }`}
                      >
                        <Image
                          src={img}
                          alt={`${product.name} image ${index + 1}`}
                          fill
                          className="object-cover"
                          sizes="64px"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="md:w-1/2 p-4 md:p-6 md:pl-2">
                {/* Name */}
                <h1 className="text-white text-2xl md:text-3xl font-bold mb-4">{product.name}</h1>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-center gap-3">
                    <span className="text-orange-400 text-2xl font-bold">
                      {formatPrice(product.price, product.currency)}
                    </span>
                    {isOnSale && product.compare_at_price && (
                      <span className="text-gray-400 text-lg line-through">
                        {formatPrice(product.compare_at_price, product.currency)}
                      </span>
                    )}
                  </div>
                  {isOnSale && (
                    <span className="inline-block mt-1 text-xs font-medium text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">
                      Save {discount}%
                    </span>
                  )}
                </div>

                {/* Description */}
                {product.description && (
                  <div className="mb-6">
                    <h2 className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-2">Description</h2>
                    <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">
                      {product.description}
                    </p>
                  </div>
                )}

                {/* Seller Info */}
                <div className="mb-6 p-3 bg-gray-700/40 rounded-xl">
                  <Link href={`/${params.handle}`} className="flex items-center gap-3 group">
                    <Avatar className="w-10 h-10 border-2 border-gray-600/50">
                      <AvatarImage
                        src={seller.avatar || "/placeholder.svg"}
                        alt={seller.name}
                        className="object-cover"
                      />
                      <AvatarFallback className="text-sm bg-gradient-to-br from-orange-400 to-red-500 text-white">
                        {seller.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-white text-sm font-medium group-hover:text-orange-400 transition-colors">
                        {seller.name}
                      </p>
                      <p className="text-gray-400 text-xs">@{seller.username}</p>
                    </div>
                  </Link>
                </div>

                {/* Quantity Selector */}
                <div className="mb-6">
                  <h2 className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-2">Quantity</h2>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="w-10 h-10 rounded-lg bg-gray-700/60 text-white hover:bg-gray-600/80 transition-colors flex items-center justify-center text-lg font-medium border border-gray-600/50"
                      disabled={quantity <= 1}
                    >
                      -
                    </button>
                    <span className="w-14 h-10 flex items-center justify-center text-white font-medium bg-gray-700/30 rounded-lg border border-gray-600/50">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity((q) => q + 1)}
                      className="w-10 h-10 rounded-lg bg-gray-700/60 text-white hover:bg-gray-600/80 transition-colors flex items-center justify-center text-lg font-medium border border-gray-600/50"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Total (if quantity > 1) */}
                {quantity > 1 && (
                  <div className="mb-4 text-gray-300 text-sm">
                    Total: <span className="text-orange-400 font-semibold">{formatPrice(product.price * quantity, product.currency)}</span>
                  </div>
                )}

                {/* Buy Now Button */}
                <Button
                  onClick={handleBuyNow}
                  disabled={checkoutLoading}
                  className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-semibold py-3 px-8 rounded-full shadow-lg transform transition-all duration-200 hover:scale-105 h-12 text-base"
                >
                  {checkoutLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                      Processing...
                    </span>
                  ) : (
                    `Buy Now - ${formatPrice(product.price * quantity, product.currency)}`
                  )}
                </Button>

                {/* Back to Profile Link */}
                <div className="mt-4 text-center">
                  <Link
                    href={`/${params.handle}`}
                    className="text-gray-400 hover:text-orange-400 text-sm transition-colors"
                  >
                    View all products from @{seller.username}
                  </Link>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Download Section */}
      <div className="text-center px-4 pb-8 pt-4">
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
    </div>
  )
}
