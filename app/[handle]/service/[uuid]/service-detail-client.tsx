"use client"

import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { useState, useEffect, useCallback, useMemo } from "react"
import { ChevronLeft, ChevronRight, Clock, Calendar, Loader2 } from "lucide-react"

// ---------- Types ----------

interface ServiceImage {
  image_url: string
  is_primary: boolean
}

interface ServiceData {
  id: number
  uuid: string
  name: string
  description: string
  price: number
  currency: string
  cover_image: string | null
  images: ServiceImage[]
}

interface SellerData {
  username: string
  name: string
  avatar: string | null
}

interface TimeSlot {
  time: string // "09:00"
  endTime: string // "10:00"
  isBooked: boolean
}

interface ErrorState {
  message: string
  type: "not-found" | "api-unavailable" | "network-error" | "unknown"
  canRetry: boolean
}

// ---------- Helpers ----------

function getPrimaryImage(service: ServiceData): string {
  const primary = service.images?.find((i) => i.is_primary)
  return primary?.image_url || service.images?.[0]?.image_url || service.cover_image || "/placeholder.svg"
}

function formatPrice(price: number, currency: string): string {
  return `${currency.toUpperCase()} ${price.toFixed(2)}`
}

function formatDateParam(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function isPastDay(date: Date, today: Date): boolean {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return d < t
}

// ---------- Calendar Component ----------

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

function MiniCalendar({
  selectedDate,
  onSelectDate,
}: {
  selectedDate: Date | null
  onSelectDate: (date: Date) => void
}) {
  const today = useMemo(() => new Date(), [])
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [viewYear, setViewYear] = useState(today.getFullYear())

  const canGoPrev = viewYear > today.getFullYear() || (viewYear === today.getFullYear() && viewMonth > today.getMonth())

  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()

  const goToPrev = () => {
    if (!canGoPrev) return
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear((y) => y - 1)
    } else {
      setViewMonth((m) => m - 1)
    }
  }

  const goToNext = () => {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear((y) => y + 1)
    } else {
      setViewMonth((m) => m + 1)
    }
  }

  const cells: (number | null)[] = []
  for (let i = 0; i < firstDayOfMonth; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div className="select-none">
      {/* Month header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={goToPrev}
          disabled={!canGoPrev}
          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-white font-semibold text-sm">
          {MONTHS[viewMonth]} {viewYear}
        </span>
        <button
          onClick={goToNext}
          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700/60 transition-colors"
          aria-label="Next month"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAYS.map((d) => (
          <div key={d} className="text-center text-gray-500 text-xs font-medium py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} className="h-9" />
          }

          const cellDate = new Date(viewYear, viewMonth, day)
          const isToday = isSameDay(cellDate, today)
          const isPast = isPastDay(cellDate, today)
          const isSelected = selectedDate !== null && isSameDay(cellDate, selectedDate)

          return (
            <button
              key={day}
              disabled={isPast}
              onClick={() => onSelectDate(cellDate)}
              className={`h-9 w-full rounded-lg text-sm font-medium transition-all duration-150
                ${isPast ? "text-gray-600 cursor-not-allowed" : "cursor-pointer hover:bg-gray-700/60"}
                ${isToday && !isSelected ? "ring-1 ring-orange-500/60 text-orange-400" : ""}
                ${isSelected ? "bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-md" : "text-gray-300"}
              `}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ---------- Main Component ----------

export default function ServiceDetailClient({ params }: { params: { handle: string; uuid: string } }) {
  const { handle, uuid } = params

  // Service data
  const [service, setService] = useState<ServiceData | null>(null)
  const [seller, setSeller] = useState<SellerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<ErrorState | null>(null)

  // Booking state
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [slotsError, setSlotsError] = useState<string | null>(null)
  const [bookingInProgress, setBookingInProgress] = useState(false)

  // ---------- Fetch service detail ----------

  const fetchService = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("https://api2.onfire.so/rpc/get_public_service_detail", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ p_uuid: uuid }),
      })

      if (!response.ok) {
        if (response.status >= 500) {
          setError({ message: "OnFire API is temporarily unavailable. Please try again in a few moments.", type: "api-unavailable", canRetry: true })
          return
        }
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()

      if (!data.success) {
        if (data.error === "Service not found" || data.error === "Product not found") {
          setError({ message: "Service not found", type: "not-found", canRetry: false })
          return
        }
        throw new Error(data.error || "Unknown error")
      }

      setService(data.service)
      setSeller(data.seller)
    } catch (err) {
      console.error("Error fetching service:", err)
      setError({ message: "Unable to load service. Please check your internet connection and try again.", type: "network-error", canRetry: true })
    } finally {
      setLoading(false)
    }
  }, [uuid])

  useEffect(() => {
    fetchService()
  }, [fetchService])

  // ---------- Fetch time slots ----------

  const fetchSlots = useCallback(async (date: Date, serviceUuid: string) => {
    try {
      setSlotsLoading(true)
      setSlotsError(null)
      setSlots([])
      setSelectedSlot(null)

      const dateStr = formatDateParam(date)
      const res = await fetch(`/api/booking/slots?service_id=${serviceUuid}&date=${dateStr}`)

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }

      const data: TimeSlot[] = await res.json()
      setSlots(data)
    } catch (err) {
      console.error("Error fetching slots:", err)
      setSlotsError("Could not load available time slots. Please try again.")
    } finally {
      setSlotsLoading(false)
    }
  }, [])

  const handleDateSelect = useCallback(
    (date: Date) => {
      setSelectedDate(date)
      if (service) {
        fetchSlots(date, service.uuid)
      }
    },
    [service, fetchSlots],
  )

  // ---------- Book now ----------

  const handleBookNow = async () => {
    if (!service || !seller || !selectedDate || !selectedSlot) return

    try {
      setBookingInProgress(true)

      const dateStr = formatDateParam(selectedDate)
      const priceInCents = Math.round(service.price * 100)

      const body = {
        items: [
          {
            name: `${service.name} - ${formatDisplayDate(selectedDate)} ${selectedSlot.time}`,
            amount: priceInCents,
            currency: (service.currency || "gbp").toLowerCase(),
            quantity: 1,
          },
        ],
        success_url: `https://onf.to/${handle}/checkout/success?session_id={CHECKOUT_SESSION_ID}&type=booking`,
        cancel_url: `https://onf.to/${handle}/service/${uuid}`,
        metadata: {
          type: "service_booking",
          service_uuid: service.uuid,
          seller_handle: handle,
          booking_date: dateStr,
          booking_time: selectedSlot.time,
        },
      }

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        throw new Error(`Checkout failed: HTTP ${res.status}`)
      }

      const data = await res.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error("No checkout URL received")
      }
    } catch (err) {
      console.error("Booking error:", err)
      alert("Something went wrong. Please try again.")
    } finally {
      setBookingInProgress(false)
    }
  }

  // ---------- Render states ----------

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4" />
          <p className="text-white text-lg">Loading service...</p>
        </div>
      </div>
    )
  }

  if (error) {
    if (error.type === "not-found") {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 relative overflow-hidden">
          <BackgroundPattern />
          <SiteHeader />
          <div className="flex items-center justify-center px-4 py-8">
            <Card className="w-full max-w-4xl bg-gray-800/80 backdrop-blur-sm border-gray-700/50 shadow-2xl">
              <CardContent className="p-8 text-center w-full">
                <div className="text-6xl mb-6">🔍</div>
                <h1 className="text-white text-2xl font-bold mb-4">Service Not Found</h1>
                <p className="text-gray-300 mb-6 leading-relaxed">
                  The service you are looking for does not exist or may have been removed.
                </p>
                <Link href={`/${handle}`} className="text-orange-400 hover:text-orange-300 underline">
                  Back to profile
                </Link>
              </CardContent>
            </Card>
          </div>
          <DownloadSection />
        </div>
      )
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-6">
            {error.type === "api-unavailable" ? "🔧" : error.type === "network-error" ? "📡" : "⚠️"}
          </div>
          <h1 className="text-white text-2xl font-bold mb-4">
            {error.type === "api-unavailable" ? "Service Temporarily Unavailable" : "Connection Error"}
          </h1>
          <p className="text-gray-300 mb-6 leading-relaxed">{error.message}</p>
          <div className="space-y-4">
            {error.canRetry && (
              <Button
                onClick={fetchService}
                className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-semibold py-3 px-6 rounded-full shadow-lg transform transition-all duration-200 hover:scale-105"
              >
                Try Again
              </Button>
            )}
            <div>
              <Link href={`/${handle}`} className="text-orange-400 hover:text-orange-300 underline text-sm">
                Back to profile
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!service || !seller) return null

  const imageUrl = getPrimaryImage(service)
  const priceStr = formatPrice(service.price, service.currency)
  const availableSlots = slots.filter((s) => !s.isBooked)
  const canBook = selectedDate !== null && selectedSlot !== null && !bookingInProgress

  // ---------- Main render ----------

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 relative overflow-hidden">
      <BackgroundPattern />

      {/* Header */}
      <header className="flex items-center justify-between p-4 md:p-6">
        <div className="flex items-center gap-3">
          <Image src="/onfire-logo.png" alt="OnFire" width={32} height={32} className="rounded-lg" />
          <span className="text-white font-semibold text-lg">OnFire</span>
        </div>
        <Link
          href={`/${handle}`}
          className="text-gray-400 hover:text-white text-sm flex items-center gap-1 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to profile
        </Link>
      </header>

      {/* Content */}
      <div className="flex items-start justify-center px-4 py-4 pb-8">
        <Card className="w-full max-w-4xl bg-gray-800/80 backdrop-blur-sm border-gray-700/50 shadow-2xl">
          <CardContent className="p-0 w-full">
            {/* Service image */}
            <div className="relative w-full h-64 md:h-80">
              <Image
                src={imageUrl}
                alt={service.name}
                fill
                className="object-cover rounded-t-xl"
                priority
              />
            </div>

            <div className="p-6 md:p-8 space-y-8">
              {/* Title + price */}
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">{service.name}</h1>
                <p className="text-orange-400 text-xl font-bold">{priceStr}</p>
              </div>

              {/* Description */}
              {service.description && (
                <div>
                  <h2 className="text-white font-semibold text-lg mb-2">About this service</h2>
                  <p className="text-gray-300 leading-relaxed whitespace-pre-line">{service.description}</p>
                </div>
              )}

              {/* Seller */}
              <div className="flex items-center gap-3 p-4 bg-gray-700/40 rounded-xl border border-gray-600/30">
                <Link href={`/${handle}`}>
                  <Avatar className="w-12 h-12 border-2 border-gray-600/50">
                    <AvatarImage src={seller.avatar || "/placeholder.svg"} alt={seller.name} className="object-cover" />
                    <AvatarFallback className="bg-gradient-to-br from-orange-400 to-red-500 text-white text-lg">
                      {seller.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                </Link>
                <div>
                  <Link href={`/${handle}`} className="text-white font-semibold hover:text-orange-400 transition-colors">
                    {seller.name}
                  </Link>
                  <p className="text-gray-400 text-sm">@{seller.username}</p>
                </div>
              </div>

              {/* Booking section */}
              <div className="border-t border-gray-600/50 pt-8">
                <h2 className="text-white font-semibold text-lg mb-6 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-orange-400" />
                  Book a Session
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Calendar */}
                  <div className="bg-gray-700/40 rounded-xl p-4 border border-gray-600/30">
                    <MiniCalendar selectedDate={selectedDate} onSelectDate={handleDateSelect} />
                  </div>

                  {/* Time slots */}
                  <div className="bg-gray-700/40 rounded-xl p-4 border border-gray-600/30">
                    <h3 className="text-white font-medium text-sm mb-3 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      {selectedDate ? formatDisplayDate(selectedDate) : "Select a date"}
                    </h3>

                    {!selectedDate && (
                      <p className="text-gray-500 text-sm py-8 text-center">
                        Choose a date to see available times
                      </p>
                    )}

                    {selectedDate && slotsLoading && (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
                      </div>
                    )}

                    {selectedDate && slotsError && (
                      <p className="text-red-400 text-sm py-4 text-center">{slotsError}</p>
                    )}

                    {selectedDate && !slotsLoading && !slotsError && availableSlots.length === 0 && (
                      <p className="text-gray-500 text-sm py-8 text-center">
                        No available slots for this date
                      </p>
                    )}

                    {selectedDate && !slotsLoading && !slotsError && availableSlots.length > 0 && (
                      <div className="grid grid-cols-3 gap-2">
                        {availableSlots.map((slot) => {
                          const isSelected = selectedSlot?.time === slot.time
                          return (
                            <button
                              key={slot.time}
                              onClick={() => setSelectedSlot(slot)}
                              className={`py-2.5 px-3 rounded-full text-sm font-medium transition-all duration-150
                                ${
                                  isSelected
                                    ? "bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-md"
                                    : "bg-gray-600/50 text-gray-300 hover:bg-gray-600 hover:text-white"
                                }
                              `}
                            >
                              {slot.time}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Selected summary + Book button */}
                <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-sm text-gray-400">
                    {selectedDate && selectedSlot ? (
                      <span>
                        {formatDisplayDate(selectedDate)} at{" "}
                        <span className="text-white font-medium">{selectedSlot.time}</span>
                        {" - "}
                        <span className="text-orange-400 font-semibold">{priceStr}</span>
                      </span>
                    ) : (
                      <span>Select a date and time to book</span>
                    )}
                  </div>

                  <Button
                    onClick={handleBookNow}
                    disabled={!canBook}
                    className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-semibold py-3 px-8 rounded-full shadow-lg transform transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed min-w-[160px]"
                  >
                    {bookingInProgress ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing...
                      </span>
                    ) : (
                      "Book Now"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <DownloadSection />
    </div>
  )
}

// ---------- Shared sub-components ----------

function BackgroundPattern() {
  return (
    <div className="absolute inset-0 opacity-5">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fillRule='evenodd'%3E%3Cg fill='%23ffffff' fillOpacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />
    </div>
  )
}

function SiteHeader() {
  return (
    <header className="flex items-center justify-between p-4 md:p-6">
      <div className="flex items-center gap-3">
        <Image src="/onfire-logo.png" alt="OnFire" width={32} height={32} className="rounded-lg" />
        <span className="text-white font-semibold text-lg">OnFire</span>
      </div>
    </header>
  )
}

function DownloadSection() {
  return (
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
  )
}
