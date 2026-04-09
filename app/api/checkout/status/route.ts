import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("session_id")

  if (!sessionId) {
    return NextResponse.json(
      { error: "session_id is required" },
      { status: 400 }
    )
  }

  try {
    const response = await fetch("https://api2.onfire.so/rpc/get_stripe_checkout_status", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({ p_session_id: sessionId }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("PostgREST error:", response.status, errorText)
      return NextResponse.json(
        { error: "Failed to verify checkout status" },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Checkout status check failed:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
