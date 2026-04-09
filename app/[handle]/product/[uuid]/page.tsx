import type { Metadata } from "next"
import ProductDetailClient from "./product-detail-client"

interface ProductData {
  name: string
  description: string
  price: number
  currency: string
  compare_at_price: number | null
  cover_image: string | null
  images: { image_url: string; is_primary: boolean }[]
}

interface SellerData {
  username: string
  name: string
  avatar: string | null
}

interface ProductDetailResponse {
  success: boolean
  product: ProductData
  seller: SellerData
}

async function fetchProduct(uuid: string): Promise<ProductDetailResponse | null> {
  try {
    const response = await fetch("https://api2.onfire.so/rpc/get_public_product_detail", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({ p_uuid: uuid }),
      next: { revalidate: 60 },
    })

    if (!response.ok) return null

    const data = await response.json()
    if (!data.success) return null

    return data as ProductDetailResponse
  } catch {
    return null
  }
}

function getPrimaryImage(product: ProductData): string {
  const primary = product.images?.find((i) => i.is_primary)
  return primary?.image_url || product.images?.[0]?.image_url || product.cover_image || "/placeholder.svg"
}

function formatPrice(price: number, currency: string): string {
  return `${currency.toUpperCase()} ${price.toFixed(2)}`
}

export async function generateMetadata({
  params,
}: {
  params: { handle: string; uuid: string }
}): Promise<Metadata> {
  const baseUrl = "https://onf.to"
  const data = await fetchProduct(params.uuid)

  if (!data) {
    return {
      title: `Product - OnFire`,
      description: "View this product on OnFire",
      openGraph: {
        title: `Product - OnFire`,
        description: "View this product on OnFire",
        url: `${baseUrl}/${params.handle}/product/${params.uuid}`,
        siteName: "OnFire",
        images: [{ url: `${baseUrl}/onfire-logo.png`, width: 1200, height: 630, alt: "OnFire" }],
        type: "website",
      },
    }
  }

  const { product, seller } = data
  const imageUrl = getPrimaryImage(product)
  const priceStr = formatPrice(product.price, product.currency)
  const title = `${product.name} - ${priceStr} | ${seller.name} on OnFire`
  const description = product.description
    ? product.description.slice(0, 200)
    : `${product.name} by ${seller.name} on OnFire`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${baseUrl}/${params.handle}/product/${params.uuid}`,
      siteName: "OnFire",
      images: [
        {
          url: imageUrl.startsWith("http") ? imageUrl : `${baseUrl}${imageUrl}`,
          width: 1200,
          height: 630,
          alt: product.name,
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl.startsWith("http") ? imageUrl : `${baseUrl}${imageUrl}`],
    },
    robots: {
      index: true,
      follow: true,
    },
    alternates: {
      canonical: `${baseUrl}/${params.handle}/product/${params.uuid}`,
    },
    other: {
      "theme-color": "#ea580c",
    },
  }
}

export default function ProductPage({ params }: { params: { handle: string; uuid: string } }) {
  return <ProductDetailClient params={params} />
}
