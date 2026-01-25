import { type NextRequest, NextResponse } from "next/server"

interface ProductImage {
  id: string
  product: string
  image: string
  is_primary: boolean
  alt_text: string
  created: string
  modified: string
}

interface Category {
  id: string
  name: string
  description: string
  image: string | null
  parent: string | null
  created: string
  modified: string
}

interface Seller {
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

interface ApiProduct {
  id: string
  name: string
  description: string
  sku: string
  brand: string
  price: string
  compare_at_price: string | null
  currency: string
  inventory: number
  category: Category
  seller: Seller
  type: "service" | "physical" | "digital" | "course" | "community"
  status: string
  tags: string[] | string
  rating: number | null
  review_count: number
  primary_image: ProductImage | null
  is_in_stock: boolean
  is_on_sale: boolean | null
  discount_percentage: number
  availability: string
  properties: string | null
  created: string
  modified: string
}

interface ApiProductsResponse {
  count: number
  next: string | null
  previous: string | null
  results: ApiProduct[]
}

async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  let lastError: Error

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Products API call attempt ${attempt} to: ${url}`)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000)

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      console.log(`Products API response status: ${response.status}`)

      return response
    } catch (error) {
      lastError = error as Error
      console.log(`Products API call attempt ${attempt} failed:`, error)

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
    console.log(`Fetching products for user ID: ${params.userId}`)
    console.log(`API Key available: ${process.env.ONFIRE_API_KEY ? "Yes" : "No"}`)

    if (!process.env.ONFIRE_API_KEY) {
      console.error("ONFIRE_API_KEY environment variable is not set!")
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    }

    const apiUrl = `https://api2.onfire.so/api/products/?seller=${params.userId}`
    console.log(`Products API URL: ${apiUrl}`)

    const response = await fetchWithRetry(apiUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Api-Key": process.env.ONFIRE_API_KEY!,
        Authorization: `Basic ${process.env.ONFIRE_BASIC_AUTH_PRODUCTS}`,
        "User-Agent": "OnFire-Profile-App/1.0",
        "Cache-Control": "no-cache",
      },
    })

    console.log(`Products API response status: ${response.status}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.log(`Products API error response: ${errorText}`)

      if (response.status === 404) {
        console.log("No products found for user, returning empty arrays")
        // Return empty results if no products found
        return NextResponse.json({
          products: [],
          services: [],
          courses: [],
          communities: [],
        })
      }
      if (response.status === 401 || response.status === 403) {
        console.error("Products API authentication failed")
        return NextResponse.json({ error: "Authentication failed" }, { status: 401 })
      }
      if (response.status >= 500) {
        return NextResponse.json({ error: "Products API temporarily unavailable" }, { status: 503 })
      }
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`)
    }

    const apiData: ApiProductsResponse = await response.json()
    console.log(`Successfully fetched ${apiData.results.length} products`)
    console.log(
      `Product types found:`,
      apiData.results.map((p) => p.type),
    )

    // Categorize products by type
    const categorizedProducts = {
      products: [] as any[],
      services: [] as any[],
      courses: [] as any[],
      communities: [] as any[],
    }

    apiData.results.forEach((product) => {
      const formattedProduct = {
        id: product.id,
        title: product.name,
        price: `${product.currency} ${product.price}`,
        compareAtPrice: product.compare_at_price ? `${product.currency} ${product.compare_at_price}` : undefined,
        image: product.primary_image?.image || "/placeholder.svg?height=60&width=60&text=Product",
        description: product.description,
        availability: product.availability,
        isOnSale: product.is_on_sale,
        discountPercentage: product.discount_percentage,
        inStock: product.is_in_stock,
        tags: Array.isArray(product.tags) ? product.tags : [],
      }

      console.log(`Processing product: ${product.name} (type: ${product.type})`)

      switch (product.type) {
        case "physical":
          categorizedProducts.products.push(formattedProduct)
          break
        case "service":
          categorizedProducts.services.push(formattedProduct)
          break
        case "course":
          categorizedProducts.courses.push(formattedProduct)
          break
        case "community":
          categorizedProducts.communities.push(formattedProduct)
          break
        default:
          console.log(`Unknown product type: ${product.type}, adding to products`)
          // Default to products for unknown types
          categorizedProducts.products.push(formattedProduct)
      }
    })

    console.log(`Categorized products:`, {
      products: categorizedProducts.products.length,
      services: categorizedProducts.services.length,
      courses: categorizedProducts.courses.length,
      communities: categorizedProducts.communities.length,
    })

    return NextResponse.json(categorizedProducts)
  } catch (error) {
    console.error("Error fetching products:", error)

    if (error instanceof Error) {
      if (error.name === "AbortError") {
        return NextResponse.json({ error: "Request timeout - Products API may be unavailable" }, { status: 408 })
      }
      if (error.message.includes("fetch")) {
        return NextResponse.json({ error: "Unable to connect to Products API" }, { status: 503 })
      }
    }

    return NextResponse.json({ error: "Products API temporarily unavailable" }, { status: 503 })
  }
}
