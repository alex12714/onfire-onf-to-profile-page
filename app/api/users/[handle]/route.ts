import { type NextRequest, NextResponse } from "next/server"

interface ApiUserResponse {
  id: number
  username: string
  first_name: string
  last_name: string
  middle_name: string
  email: string
  phone_number: string
  bio: string
  location: string
  avatar: string
  cover_image: string
  website: string
  is_verified: boolean
  role: {
    id: number
    title: string
  }
  created_at: string
  updated_at: string
  last_activity: string
  points: number
  level: number
  badges: Record<string, any>
  customer_id: string
}

interface ApiProfileResponse {
  id: number
  display_name: string
  pronouns: string
  occupation: string
  educations: any[]
  experiences: any[]
  skills: Record<string, any>
  interests: Record<string, any>
  social_links: {
    bio: string
  }
  business_profile: {
    id: number
    business_name: string
    business_type: string
    business_description: string
    services: Record<string, any>
    portfolios: any[]
  }
}

async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  let lastError: Error

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`API call attempt ${attempt} to: ${url}`)
      console.log("Headers:", JSON.stringify(options.headers, null, 2))

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000) // Increased to 15 seconds

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      console.log(`API response status: ${response.status}`)
      console.log(`API response headers:`, Object.fromEntries(response.headers.entries()))

      return response
    } catch (error) {
      lastError = error as Error
      console.log(`API call attempt ${attempt} failed:`, error)

      if (attempt < maxRetries) {
        // Wait before retrying (exponential backoff)
        const delay = Math.pow(2, attempt) * 1000
        console.log(`Waiting ${delay}ms before retry...`)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError!
}

export async function GET(request: NextRequest, { params }: { params: { handle: string } }) {
  try {
    console.log(`Fetching user data for handle: ${params.handle}`)
    console.log(`API Key available: ${process.env.ONFIRE_API_KEY ? "Yes" : "No"}`)
    console.log(`API Key length: ${process.env.ONFIRE_API_KEY?.length || 0}`)

    if (!process.env.ONFIRE_API_KEY) {
      console.error("ONFIRE_API_KEY environment variable is not set!")
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    }

    const apiUrl = `https://api.dev.onfire.so/api/users/by-handle/${params.handle}/`

    const response = await fetchWithRetry(apiUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Api-Key": process.env.ONFIRE_API_KEY!,
        "User-Agent": "OnFire-Profile-App/1.0",
        "Cache-Control": "no-cache",
      },
    })

    console.log(`Final response status: ${response.status}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.log(`API error response: ${errorText}`)

      if (response.status === 404) {
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }
      if (response.status === 401 || response.status === 403) {
        console.error(
          "Authentication failed - API Key:",
          process.env.ONFIRE_API_KEY ? "Present but invalid" : "Missing",
        )
        return NextResponse.json({ error: "Authentication failed" }, { status: 401 })
      }
      if (response.status >= 500) {
        return NextResponse.json({ error: "API temporarily unavailable" }, { status: 503 })
      }
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`)
    }

    const apiData: ApiUserResponse = await response.json()
    console.log("Successfully fetched user data:", { username: apiData.username, id: apiData.id })

    // Fetch profile data for bio information
    let profileBio = "Welcome to my OnFire profile!"
    try {
      const profileUrl = `https://api.dev.onfire.so/api/users/${apiData.id}/profile/`
      
      const profileResponse = await fetchWithRetry(profileUrl, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: "Basic Ym90QG9uZmlyZS5zbzprdmhAeXZ6OXFnbi5QTkEuY3V5",
          "User-Agent": "OnFire-Profile-App/1.0",
          "Cache-Control": "no-cache",
        },
      })

      if (profileResponse.ok) {
        const profileData: ApiProfileResponse = await profileResponse.json()
        console.log("Successfully fetched profile data:", { display_name: profileData.display_name, id: profileData.id })
        profileBio = profileData?.social_links?.bio || "Welcome to my OnFire profile!"
      } else {
        console.log(`Profile API returned ${profileResponse.status}, using fallback bio`)
      }
    } catch (profileError) {
      console.log("Failed to fetch profile data, using fallback bio:", profileError)
    }

    // Map API response to our format
    const userData = {
      id: apiData.id,
      name: `${apiData.first_name} ${apiData.last_name}`.trim() || apiData.username,
      handle: `@${apiData.username}`,
      avatar: apiData.avatar || "/placeholder.svg?height=120&width=120",
      coverImage: apiData.cover_image || "",
      followers: `${apiData.points || 0}`,
      businessDescription: apiData.role?.title ? `Level ${apiData.level} ${apiData.role.title}` : `Level ${apiData.level} user`,
      bio: profileBio,
      website: apiData.website || "",
      isVerified: apiData.is_verified,
      role: apiData.role?.title || "user",
      location: apiData.location || "",
    }

    return NextResponse.json(userData)
  } catch (error) {
    console.error("Error fetching user data:", error)

    // Check if it's a network/connectivity error
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        console.error("Request timeout - API may be unavailable")
        return NextResponse.json({ error: "Request timeout - API may be unavailable" }, { status: 408 })
      }
      if (error.message.includes("fetch")) {
        console.error("Unable to connect to API")
        return NextResponse.json({ error: "Unable to connect to API" }, { status: 503 })
      }
    }

    return NextResponse.json({ error: "API temporarily unavailable" }, { status: 503 })
  }
}
