export interface BioLink {
  id: string
  title: string
  url: string
  icon?: string
  active: boolean
}

export interface LinkBioConfig {
  profileName: string
  bio: string
  avatarUrl: string
  ogTitle: string
  ogDescription: string
  ogImageUrl: string
  theme: {
    backgroundColor: string
    buttonColor: string
    textColor: string
    buttonTextColor: string
    fontFamily: string
    cardStyle: 'flat' | 'rounded' | 'glass' | 'shadow'
  }
  links: BioLink[]
  socials: {
    instagram?: string
    facebook?: string
    twitter?: string
    linkedin?: string
  }
}

export const DEFAULT_BIO_CONFIG: LinkBioConfig = {
  profileName: 'Your Name or Business',
  bio: 'Customize your bio here. Add important links and social media.',
  avatarUrl: 'https://ui-avatars.com/api/?name=User&background=random',
  ogTitle: '',
  ogDescription: '',
  ogImageUrl: '',
  theme: {
    backgroundColor: '#0F172A',
    buttonColor: '#25D366',
    textColor: '#FFFFFF',
    buttonTextColor: '#000000',
    fontFamily: 'sans-serif',
    cardStyle: 'rounded',
  },
  links: [
    { id: '1', title: 'WhatsApp', url: 'https://wa.me/5511999999999', active: true },
    { id: '2', title: 'Website', url: 'https://google.com', active: true },
  ],
  socials: {},
}
