import { NextRequest, NextResponse } from "next/server"

interface RawSlot {
  slot_time: string // "09:00"
  slot_end_time: string // "10:00"
  duration_minutes: number
  is_booked: boolean
}

interface AvailabilityResponse {
  success: boolean
  date: string
  service_uuid: string
  slots: RawSlot[]
}

interface ExpandedSlot {
  time: string // "09:00"
  endTime: string // "10:00"
  isBooked: boolean
}

/**
 * Map a raw slot from the DB to our client-facing format.
 */
function mapSlot(slot: RawSlot): ExpandedSlot {
  return {
    time: slot.slot_time,
    endTime: slot.slot_end_time,
    isBooked: slot.is_booked,
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const serviceId = searchParams.get("service_id")
  const date = searchParams.get("date")

  if (!serviceId || !date) {
    return NextResponse.json(
      { error: "Missing required query parameters: service_id, date" },
      { status: 400 },
    )
  }

  // Validate date format (YYYY-MM-DD)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { error: "Invalid date format. Expected YYYY-MM-DD." },
      { status: 400 },
    )
  }

  try {
    const response = await fetch("https://api2.onfire.so/rpc/get_public_service_availability", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        p_service_uuid: serviceId,
        p_date: date,
      }),
    })

    if (!response.ok) {
      console.error(`PostgREST error: HTTP ${response.status}`)
      return NextResponse.json(
        { error: "Failed to fetch availability from upstream" },
        { status: 502 },
      )
    }

    const data: AvailabilityResponse = await response.json()

    if (!data.success || !data.slots) {
      // No availability configured for this service/date
      return NextResponse.json([])
    }

    // Map DB slots to client format, deduplicate, sort
    const seen = new Set<string>()
    const allSlots: ExpandedSlot[] = []

    for (const raw of data.slots) {
      const slot = mapSlot(raw)
      if (!seen.has(slot.time)) {
        seen.add(slot.time)
        allSlots.push(slot)
      }
    }

    allSlots.sort((a, b) => a.time.localeCompare(b.time))

    return NextResponse.json(allSlots)
  } catch (err) {
    console.error("Booking slots error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}
