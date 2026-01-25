import { type NextRequest, NextResponse } from "next/server"

interface ApiCourse {
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

async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  let lastError: Error

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Courses API call attempt ${attempt} to: ${url}`)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000)

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      console.log(`Courses API response status: ${response.status}`)

      return response
    } catch (error) {
      lastError = error as Error
      console.log(`Courses API call attempt ${attempt} failed:`, error)

      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError!
}

export async function GET(request: NextRequest, { params }: { params: { userId: string } }) {
  try {
    console.log(`Fetching courses for user ID: ${params.userId}`)
    console.log(`API Key available: ${process.env.ONFIRE_API_KEY ? "Yes" : "No"}`)

    if (!process.env.ONFIRE_API_KEY) {
      console.error("ONFIRE_API_KEY environment variable is not set!")
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    }

    const apiUrl = `https://api.dev.onfire.so/api/users/${params.userId}/courses/`
    console.log(`Courses API URL: ${apiUrl}`)

    const response = await fetchWithRetry(apiUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Api-Key": process.env.ONFIRE_API_KEY!,
        Authorization: "Basic Ym90QG9uZmlyZS5zbzprdmhAeXZ6OXFnbi5QTkEuY3V5",
        "User-Agent": "OnFire-Profile-App/1.0",
        "Cache-Control": "no-cache",
      },
    })

    console.log(`Courses API response status: ${response.status}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.log(`Courses API error response: ${errorText}`)

      if (response.status === 404) {
        console.log("No courses found for user, returning empty array")
        return NextResponse.json([])
      }
      if (response.status === 401 || response.status === 403) {
        console.error("Courses API authentication failed")
        return NextResponse.json({ error: "Authentication failed" }, { status: 401 })
      }
      if (response.status >= 500) {
        return NextResponse.json({ error: "Courses API temporarily unavailable" }, { status: 503 })
      }
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`)
    }

    const apiData: ApiCourse[] = await response.json()
    console.log(`Successfully fetched ${apiData.length} courses`)

    return NextResponse.json(apiData)
  } catch (error) {
    console.error("Error fetching courses:", error)

    if (error instanceof Error) {
      if (error.name === "AbortError") {
        return NextResponse.json({ error: "Request timeout - Courses API may be unavailable" }, { status: 408 })
      }
      if (error.message.includes("fetch")) {
        return NextResponse.json({ error: "Unable to connect to Courses API" }, { status: 503 })
      }
    }

    return NextResponse.json({ error: "Courses API temporarily unavailable" }, { status: 503 })
  }
}
