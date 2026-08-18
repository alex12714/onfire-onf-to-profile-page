import type { Metadata } from "next"
import QRCode from "qrcode"
import ProfilePageClient from "./profile-page-client"

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

// Generate metadata for social sharing
export async function generateMetadata({ params }: { params: { handle: string } }): Promise<Metadata> {
  try {
    // Use the correct base URL
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'https://onf.to'
    
    // Fetch user data for metadata - use absolute URL
    const response = await fetch(`${baseUrl}/api/users/${params.handle}`, {
      headers: {
        'Cache-Control': 'no-cache',
      },
    })

    if (!response.ok) {
      return {
        title: `@${params.handle} on OnFire Messenger`,
        description: 'AI powered messenger marketplace',
        openGraph: {
          title: `@${params.handle} on OnFire Messenger`,
          description: 'AI powered messenger marketplace',
          url: `${baseUrl}/${params.handle}`,
          siteName: 'OnFire Messenger',
          images: [
            {
              url: `${baseUrl}/onfire-logo.png`,
              width: 1200,
              height: 630,
              alt: 'OnFire Logo',
            },
          ],
          type: 'website',
        },
        twitter: {
          card: 'summary_large_image',
          title: `@${params.handle} on OnFire Messenger`,
          description: 'AI powered messenger marketplace',
          images: [`${baseUrl}/onfire-logo.png`],
        },
      }
    }

    const userData: UserData = await response.json()
    
    // Use the actual user's handle from the API response, not the URL parameter
    const actualHandle = userData.handle.startsWith('@') ? userData.handle : `@${userData.handle}`
    const title = `${actualHandle} on OnFire Messenger`
    const description = `${userData.bio || userData.businessDescription || 'Welcome to my OnFire profile'}\n\nAI powered messenger marketplace`
    
    // Use the user's actual avatar image, ensure it's an absolute URL
    let imageUrl = `${baseUrl}/onfire-logo.png` // fallback
    if (userData.avatar) {
      if (userData.avatar.startsWith('http')) {
        imageUrl = userData.avatar
      } else if (userData.avatar.startsWith('/')) {
        imageUrl = `${baseUrl}${userData.avatar}`
      } else {
        imageUrl = userData.avatar // assume it's already absolute
      }
    }

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: `${baseUrl}/${params.handle}`,
        siteName: 'OnFire Messenger',
        images: [
          {
            url: imageUrl,
            width: 1200,
            height: 630,
            alt: `${userData.name}'s profile picture`,
          },
          {
            url: imageUrl,
            width: 400,
            height: 400,
            alt: `${userData.name}'s profile picture`,
          },
        ],
        locale: 'en_US',
        type: 'profile',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [imageUrl],
        creator: actualHandle,
      },
      robots: {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          'max-video-preview': -1,
          'max-image-preview': 'large',
          'max-snippet': -1,
        },
      },
      alternates: {
        canonical: `${baseUrl}/${params.handle}`,
      },
      other: {
        // Add the specific meta tags you mentioned
        'image': imageUrl,
        'og:image': imageUrl,
        'og:title': title,
        'profile:first_name': userData.name.split(' ')[0] || '',
        'profile:last_name': userData.name.split(' ').slice(1).join(' ') || '',
        'profile:username': userData.handle.replace('@', ''),
        'og:profile:username': userData.handle.replace('@', ''),
        'og:image:alt': `${userData.name}'s OnFire profile`,
        'theme-color': '#ea580c',
      },
    }
  } catch (error) {
    console.error('Error generating metadata:', error)
    const baseUrl = 'https://onf.to'
    
    return {
      title: `@${params.handle} on OnFire Messenger`,
      description: 'AI powered messenger marketplace',
      openGraph: {
        title: `@${params.handle} on OnFire Messenger`,
        description: 'AI powered messenger marketplace',
        url: `${baseUrl}/${params.handle}`,
        siteName: 'OnFire Messenger',
        images: [
          {
            url: `${baseUrl}/onfire-logo.png`,
            width: 1200,
            height: 630,
            alt: 'OnFire Logo',
          },
        ],
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: `@${params.handle} on OnFire Messenger`,
        description: 'AI powered messenger marketplace',
        images: [`${baseUrl}/onfire-logo.png`],
      },
      other: {
        'image': `${baseUrl}/onfire-logo.png`,
        'og:image': `${baseUrl}/onfire-logo.png`,
        'og:title': `@${params.handle} on OnFire Messenger`,
      },
    }
  }
}

/**
 * The QR shown in the "Save contact" fallback block.
 *
 * Rendered here rather than in the client component for two reasons: it depends
 * only on the handle, which the server already has, so it needs none of the
 * profile data the client fetches; and generating it server-side keeps the
 * `qrcode` library out of the client bundle entirely on a page that is
 * overwhelmingly loaded on phones.
 *
 * A QR that fails to encode must never take the profile down with it, so a
 * failure returns null and the fallback block simply renders without it.
 */
async function renderProfileQr(profileUrl: string): Promise<string | null> {
  try {
    return await QRCode.toString(profileUrl, {
      type: "svg",
      errorCorrectionLevel: "M",
      margin: 0,
      color: { dark: "#000000", light: "#ffffff" },
    })
  } catch {
    return null
  }
}

export default async function ProfilePage({ params }: { params: { handle: string } }) {
  const profileUrl = `https://onf.to/${encodeURIComponent(params.handle)}`
  const qrSvg = await renderProfileQr(profileUrl)

  /**
   * Kill switch for the vCard download, default OFF.
   *
   * The button points at `/card/:id.vcf`, which the card service owns and has
   * not shipped yet. Shipping a visible button that 404s on live public traffic
   * is worse than shipping no button, so the download stays hidden until
   * VCARD_ENABLED=1 is set. The fallback block does not depend on that endpoint
   * and is useful on its own, so it ships enabled.
   *
   * Deliberately NOT a NEXT_PUBLIC_ variable: those are inlined at build time,
   * so flipping one means rebuilding the image. This route is server-rendered
   * on demand, so a plain server-side variable is read per request — turning the
   * button on becomes an env change and a container restart, and turning it back
   * off during an incident does not wait on a build.
   */
  const vcardEnabled = process.env.VCARD_ENABLED === "1"

  return (
    <ProfilePageClient
      params={params}
      profileUrl={profileUrl}
      qrSvg={qrSvg}
      vcardEnabled={vcardEnabled}
    />
  )
}
