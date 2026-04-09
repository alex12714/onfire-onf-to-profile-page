import type { Metadata } from "next"
import ServiceDetailClient from "./service-detail-client"

interface ServiceData {
  id: number
  uuid: string
  name: string
  description: string
  price: number
  currency: string
  cover_image: string | null
  images: { image_url: string; is_primary: boolean }[]
}

interface SellerData {
  username: string
  name: string
  avatar: string | null
}

interface ServiceDetailResponse {
  success: boolean
  service: ServiceData
  seller: SellerData
}

async function fetchService(uuid: string): Promise<ServiceDetailResponse | null> {
  try {
    const response = await fetch("https://api2.onfire.so/rpc/get_public_service_detail", {
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

    return data as ServiceDetailResponse
  } catch {
    return null
  }
}

function getPrimaryImage(service: ServiceData): string {
  const primary = service.images?.find((i) => i.is_primary)
  return primary?.image_url || service.images?.[0]?.image_url || service.cover_image || "/placeholder.svg"
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
  const data = await fetchService(params.uuid)

  if (!data) {
    return {
      title: "Service - OnFire",
      description: "View this service on OnFire",
      openGraph: {
        title: "Service - OnFire",
        description: "View this service on OnFire",
        url: `${baseUrl}/${params.handle}/service/${params.uuid}`,
        siteName: "OnFire",
        images: [{ url: `${baseUrl}/onfire-logo.png`, width: 1200, height: 630, alt: "OnFire" }],
        type: "website",
      },
    }
  }

  const { service, seller } = data
  const imageUrl = getPrimaryImage(service)
  const priceStr = formatPrice(service.price, service.currency)
  const title = `${service.name} - ${priceStr} | ${seller.name} on OnFire`
  const description = service.description
    ? service.description.slice(0, 200)
    : `${service.name} by ${seller.name} on OnFire`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${baseUrl}/${params.handle}/service/${params.uuid}`,
      siteName: "OnFire",
      images: [
        {
          url: imageUrl.startsWith("http") ? imageUrl : `${baseUrl}${imageUrl}`,
          width: 1200,
          height: 630,
          alt: service.name,
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
      canonical: `${baseUrl}/${params.handle}/service/${params.uuid}`,
    },
    other: {
      "theme-color": "#ea580c",
    },
  }
}

export default function ServicePage({ params }: { params: { handle: string; uuid: string } }) {
  return <ServiceDetailClient params={params} />
}
