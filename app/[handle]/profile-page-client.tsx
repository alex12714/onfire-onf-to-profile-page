"use client"

import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { useState, useEffect } from "react"

interface UserData {
  id: number
  name: string
  handle: string
  avatar: string
  coverImage: string
  followers: string
  businessDescription: string
  bio: string
  website: string
  isVerified: boolean
  role: string
  location: string
}

interface ProductsData {
  products: ProductItem[]
  services: ProductItem[]
  courses: CourseItem[]
  communities: ProductItem[]
}

interface ProductItem {
  id: string
  title: string
  price: string
  compareAtPrice?: string
  image: string
  description: string
  availability: string
  isOnSale: boolean
  discountPercentage: number
  inStock: boolean
  tags: string[]
}

interface CourseItem {
  id: number
  title: string
  description: string
  cover_image: string
  instructor: {
    id: number
    username: string
    email: string
    phone_number: string
    first_name: string
    last_name: string
    date_joined: string
    role: string
    is_email_verified: boolean
  }
  category: string
  tags: string
  level: "beginner" | "intermediate" | "advanced"
  duration: string
  enrollment_count: number
  max_enrollment: number
  price_amount: string
  price_currency: string
  status: "draft" | "published" | "archived"
  average_rating: number
  review_count: number
  created: string
}

interface ErrorState {
  message: string
  type: "not-found" | "api-unavailable" | "network-error" | "unknown"
  canRetry: boolean
}

export default function ProfilePageClient({ params }: { params: { handle: string } }) {
  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<ErrorState | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [productsData, setProductsData] = useState<ProductsData>({
    products: [],
    services: [],
    courses: [],
    communities: [],
  })
  const [productsLoading, setProductsLoading] = useState(false)
  const [visibleProductsCount, setVisibleProductsCount] = useState(6)

  const fetchProductsData = async (userId: number) => {
    try {
      console.log(`Fetching products for user ID: ${userId}`)
      setProductsLoading(true)
      
      // Fetch products
      const productsResponse = await fetch(`/api/products/${userId}`)
      let productsData = {
        products: [],
        services: [],
        courses: [],
        communities: [],
      }

      if (productsResponse.ok) {
        const data = await productsResponse.json()
        productsData = { ...productsData, ...data }
      }

      // Fetch courses
      try {
        const coursesResponse = await fetch(`/api/courses/${userId}`)
        if (coursesResponse.ok) {
          const coursesData = await coursesResponse.json()
          productsData.courses = coursesData
        }
      } catch (courseError) {
        console.error("Error fetching courses:", courseError)
      }

      console.log(`Products data received:`, productsData)
      setProductsData(productsData)
    } catch (error) {
      console.error("Error fetching products:", error)
    } finally {
      setProductsLoading(false)
    }
  }

  const fetchUserData = async (isRetry = false) => {
    try {
      if (isRetry) {
        setLoading(true)
        setError(null)
      }

      const response = await fetch(`/api/users/${params.handle}`)

      if (!response.ok) {
        if (response.status === 404) {
          setError({
            message: "User not found",
            type: "not-found",
            canRetry: false,
          })
          return
        }
        if (response.status === 503 || response.status === 408) {
          setError({
            message: "OnFire API is temporarily unavailable. Please try again in a few moments.",
            type: "api-unavailable",
            canRetry: true,
          })
          return
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const userData: UserData = await response.json()
      setUser(userData)
      setError(null)
      setRetryCount(0)

      // Fetch products data after user data is loaded
      if (userData.id) {
        await fetchProductsData(userData.id)
      }
    } catch (err) {
      console.error("Error fetching user data:", err)
      setError({
        message: "Unable to load profile. Please check your internet connection and try again.",
        type: "network-error",
        canRetry: true,
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUserData()
  }, [params.handle])

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1)
    fetchUserData(true)
  }

  const [activeTab, setActiveTab] = useState<"products" | "services" | "courses" | "communities">("products")

  useEffect(() => {
    setVisibleProductsCount(6)
  }, [activeTab])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">
            {retryCount > 0 ? `Retrying... (${retryCount}/3)` : "Loading profile..."}
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    // For "not-found" errors, show the full layout with header and app store links
    if (error.type === "not-found") {
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

          {/* Error Card */}
          <div className="flex items-center justify-center px-4 py-8">
            <Card className="w-full max-w-4xl bg-gray-800/80 backdrop-blur-sm border-gray-700/50 shadow-2xl">
              <CardContent className="p-8 text-center w-full">
                <div className="text-6xl mb-6">👤</div>
                <h1 className="text-white text-2xl font-bold mb-4">Profile Not Found</h1>
                <p className="text-gray-300 mb-6 leading-relaxed">
                  The user profile you're looking for doesn't exist or may have been removed.
                </p>
                <div className="space-y-4">
                  <Link href="https://onfire.so" className="text-orange-400 hover:text-orange-300 underline">
                    Go to OnFire.so
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Download Section */}
          <div className="text-center px-4 pb-8">
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

    // For other errors (API unavailable, network errors), show the centered error page
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-6">
            {error.type === "api-unavailable" ? "🔧" : error.type === "network-error" ? "📡" : "⚠️"}
          </div>
          <h1 className="text-white text-2xl font-bold mb-4">
            {error.type === "api-unavailable"
              ? "Service Temporarily Unavailable"
              : error.type === "network-error"
                ? "Connection Error"
                : "Something Went Wrong"}
          </h1>
          <p className="text-gray-300 mb-6 leading-relaxed">{error.message}</p>
          <div className="space-y-4">
            {error.canRetry && (
              <Button
                onClick={handleRetry}
                className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-semibold py-3 px-6 rounded-full shadow-lg transform transition-all duration-200 hover:scale-105"
                disabled={loading}
              >
                {loading ? "Retrying..." : "Try Again"}
              </Button>
            )}
            <div>
              <Link href="https://onfire.so" className="text-orange-400 hover:text-orange-300 underline text-sm">
                Go to OnFire.so
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-6xl mb-4">⚠️</div>
          <h1 className="text-white text-2xl font-bold mb-2">Something went wrong</h1>
          <p className="text-gray-300 mb-6">Unable to load profile data.</p>
          <Button
            onClick={handleRetry}
            className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-semibold py-3 px-6 rounded-full shadow-lg transform transition-all duration-200 hover:scale-105"
          >
            Try Again
          </Button>
        </div>
      </div>
    )
  }

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

      {/* Profile Card */}
      <div className="flex items-center justify-center px-4 py-8">
        <Card className="w-full max-w-4xl bg-gray-800/80 backdrop-blur-sm border-gray-700/50 shadow-2xl">
          
          <CardContent className="p-0 text-center w-full">
            {/* Cover Image */}
            {user.coverImage && (
              <div className="relative w-full h-60 mb-6">
                <Image
                  src={user.coverImage || "/placeholder.svg"}
                  alt={`${user.name} cover`}
                  fill
                  className="object-cover rounded-t-xl"
                />
              </div>
            )}
            
            <div className="p-8">
              {/* Avatar */}
              <div className="-mt-16 mb-6">
                <Avatar className="w-32 h-32 mx-auto border-4 border-gray-600/50 shadow-lg shadow-white/20">
                  <AvatarImage
                    src={user.avatar || "/placeholder.svg"}
                    alt={user.name}
                    className="object-cover object-center w-full h-full"
                  />
                  <AvatarFallback className="text-2xl bg-gradient-to-br from-orange-400 to-red-500 text-white">
                    {user.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                {user.isVerified && (
                  <div className="inline-flex items-center justify-center w-8 h-8 bg-blue-500 rounded-full -mt-11 border-gray-800 ml-[81px] mb-0 border-2">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                )}
              </div>

              {/* User Info */}
              <div className="mb-6 space-y-2">
                <h1 className="text-2xl font-bold text-white">{user.name}</h1>
                <p className="text-gray-400 text-lg">{user.handle}</p>
                {user.location && <p className="text-gray-300 text-sm">📍 {user.location}</p>}
                <p className="text-gray-300 text-sm">
                  <span className="font-semibold">{user.followers}</span> followers
                </p>
              </div>

              {/* Business Description */}
              <div className="mb-6 space-y-3">
                <p className="text-white font-medium whitespace-pre-line">{user.bio}</p>
                
                {user.website && (
                  <Link
                    href={user.website.startsWith("http") ? user.website : `https://${user.website}`}
                    target="_blank"
                    className="text-blue-400 hover:text-blue-300 text-sm underline block"
                  >
                    {user.website}
                  </Link>
                )}
              </div>

              {/* Send Message Button */}
              <Button
                className="mx-auto bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-semibold py-3 rounded-full shadow-lg transform transition-all duration-200 hover:scale-105 w-[22%]"
                size="sm"
              >
                SEND MESSAGE
              </Button>

              {/* Tabs Section */}
              <div className="mt-8 pt-6 border-t border-gray-600/50">
                {/* Tab Navigation */}
                <div className="flex justify-center mb-6">
                  <div className="bg-gray-700/80 rounded-full p-1 flex gap-1">
                    {(["products", "services", "courses", "communities"] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 capitalize ${
                          activeTab === tab
                            ? "bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg"
                            : "text-gray-300 hover:text-white hover:bg-gray-600/70"
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tab Content */}
                <div className="min-h-[300px]">
                  {productsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                    </div>
                  ) : productsData[activeTab].length > 0 ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {activeTab === 'courses' ? (
                          // Render courses with course-specific layout
                          productsData.courses.slice(0, visibleProductsCount).map((course) => (
                            <div
                              key={course.id}
                              className="bg-gray-700/50 rounded-xl hover:bg-gray-700/70 transition-all duration-200 cursor-pointer border border-gray-600/30 p-4 relative min-h-[400px]"
                            >
                              <div className="flex flex-col gap-3">
                                <Image
                                  src={course.cover_image || "/placeholder.svg"}
                                  alt={course.title}
                                  width={120}
                                  height={180}
                                  className="rounded-lg bg-gray-600 object-cover w-full h-48"
                                />
                                <div className="flex-1">
                                  <h4 className="text-white text-base font-semibold mb-2 line-clamp-2">{course.title}</h4>
                                  <p className="text-gray-300 text-sm mb-3 line-clamp-3">{course.description}</p>
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded-full">
                                      {course.level}
                                    </span>
                                    <span className="text-gray-400 text-xs">{course.duration}</span>
                                  </div>
                                  <div className="flex items-center justify-between mb-3">
                                    <div>
                                      <p className="text-orange-400 text-sm font-bold">
                                        {course.price_currency} {course.price_amount}
                                      </p>
                                      <p className="text-gray-400 text-xs">
                                        {course.enrollment_count} enrolled
                                      </p>
                                    </div>
                                  </div>
                                  <Button
                                    className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm py-2 transition-all duration-200 rounded-3xl"
                                    size="sm"
                                  >
                                    See details
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          // Render other tabs (products, services, communities) with existing layout
                          productsData[activeTab].slice(0, visibleProductsCount).map((item) => (
                            <div
                              key={item.id}
                              className="bg-gray-700/50 rounded-xl hover:bg-gray-700/70 transition-all duration-200 cursor-pointer border border-gray-600/30 p-4 relative"
                            >
                              {item.isOnSale && item.discountPercentage > 0 && (
                                <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold rounded-full w-12 h-12 flex items-center justify-center z-10">
                                  -{item.discountPercentage}%
                                </div>
                              )}
                              <div className="flex flex-col gap-3">
                                <Image
                                  src={item.image || "/placeholder.svg"}
                                  alt={item.title}
                                  width={120}
                                  height={180}
                                  className="rounded-lg bg-gray-600 object-cover w-full h-48"
                                />
                                <div className="flex-1">
                                  <h4 className="text-white text-base font-semibold mb-2 line-clamp-2">{item.title}</h4>
                                  <p className="text-gray-300 text-sm mb-3 line-clamp-3">{item.description}</p>
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <p className="text-orange-400 text-sm font-bold">{item.price}</p>
                                        {item.compareAtPrice && 
                                         parseFloat(item.compareAtPrice.replace(/[^\d.]/g, '')) > 0 && 
                                         parseFloat(item.compareAtPrice.replace(/[^\d.]/g, '')) !== parseFloat(item.price.replace(/[^\d.]/g, '')) && (
                                          <p className="text-gray-400 text-xs line-through">{item.compareAtPrice}</p>
                                        )}
                                      </div>
                                    </div>
                                    <div className="text-gray-400 hover:text-orange-400 transition-colors">
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                      </svg>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                      {productsData[activeTab].length > visibleProductsCount && (
                        <div className="text-center mt-6">
                          <button
                            onClick={() => setVisibleProductsCount(prev => prev + 6)}
                            className="text-orange-400 hover:text-orange-300 font-medium transition-colors duration-200"
                          >
                            Load more
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <p>No {activeTab} available</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Download Section */}
      <div className="text-center px-4 pb-8">
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
