import type { Metadata } from "next"
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

export default function ProfilePage({ params }: { params: { handle: string } }) {
  return <ProfilePageClient params={params} />
}
