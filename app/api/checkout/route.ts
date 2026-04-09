import { NextRequest, NextResponse } from "next/server"

interface LineItem {
  name: string
  amount: number
  currency: string
  quantity: number
  images?: string[]
}

interface CheckoutRequestBody {
  items: LineItem[]
  success_url: string
  cancel_url: string
  customer_email?: string
  metadata?: Record<string, string>
}

export async function POST(request: NextRequest) {
  try {
    const body: CheckoutRequestBody = await request.json()

    // Validate required fields
    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: "items is required and must be a non-empty array" },
        { status: 400 }
      )
    }

    if (!body.success_url || !body.cancel_url) {
      return NextResponse.json(
        { error: "success_url and cancel_url are required" },
        { status: 400 }
      )
    }

    // Validate each line item
    for (const item of body.items) {
      if (!item.name || typeof item.amount !== "number" || !item.currency || typeof item.quantity !== "number") {
        return NextResponse.json(
          { error: "Each item must have name (string), amount (number), currency (string), and quantity (number)" },
          { status: 400 }
        )
      }
      if (item.amount <= 0 || item.quantity <= 0) {
        return NextResponse.json(
          { error: "amount and quantity must be positive numbers" },
          { status: 400 }
        )
      }
    }

    // Call PostgREST RPC to create Stripe Checkout Session
    const rpcResponse = await fetch("https://api2.onfire.so/rpc/create_stripe_checkout_session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        p_line_items: body.items,
        p_success_url: body.success_url,
        p_cancel_url: body.cancel_url,
        p_customer_email: body.customer_email || null,
        p_metadata: body.metadata || {},
      }),
    })

    if (!rpcResponse.ok) {
      const errorText = await rpcResponse.text()
      console.error("PostgREST checkout error:", rpcResponse.status, errorText)
      return NextResponse.json(
        { error: "Failed to create checkout session" },
        { status: 502 }
      )
    }

    const data = await rpcResponse.json()

    if (!data.success || !data.url) {
      console.error("Checkout RPC returned unexpected data:", data)
      return NextResponse.json(
        { error: "Checkout session creation failed" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      url: data.url,
      session_id: data.session_id,
    })
  } catch (err) {
    console.error("Checkout API error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
