'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Plus,
  Trash2,
  ExternalLink,
  Palette,
  Save,
  Copy,
  Check,
  Globe,
  ImageIcon,
  Camera,
  Users,
  MessageCircle,
  Briefcase,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import type { LinkBioConfig, BioLink } from '@/lib/link-bio/types'
import { DEFAULT_BIO_CONFIG } from '@/lib/link-bio/types'

type Tab = 'content' | 'appearance' | 'share'

export function getSocialUrl(platform: string, usernameOrUrl: string) {
  if (!usernameOrUrl) return ''
  const trimmed = usernameOrUrl.trim()
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed
  }
  switch (platform) {
    case 'instagram':
      return `https://instagram.com/${trimmed}`
    case 'facebook':
      return `https://facebook.com/${trimmed}`
    case 'twitter':
      return `https://twitter.com/${trimmed}`
    case 'linkedin':
      return `https://linkedin.com/in/${trimmed}`
    default:
      return trimmed
  }
}

export function LinkBioEditor() {
  const { user, accountId } = useAuth()
  const [config, setConfig] = useState<LinkBioConfig>(DEFAULT_BIO_CONFIG)
  const [activeTab, setActiveTab] = useState<Tab>('content')
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const ogImageInputRef = useRef<HTMLInputElement>(null)
  const db = createClient()

  // Load from Supabase
  useEffect(() => {
    if (!user || !accountId) return
    const loadBio = async () => {
      const { data } = await db
        .from('bio_configs')
        .select('*')
        .eq('account_id', accountId)
        .single()

      if (data) {
        setConfig({
          profileName: data.profile_name || '',
          bio: data.bio || '',
          avatarUrl: data.avatar_url || DEFAULT_BIO_CONFIG.avatarUrl,
          ogTitle: data.og_title || '',
          ogDescription: data.og_description || '',
          ogImageUrl: data.og_image_url || '',
          theme: data.theme || DEFAULT_BIO_CONFIG.theme,
          links: data.links || DEFAULT_BIO_CONFIG.links,
          socials: data.socials || {},
        })
      }
    }
    loadBio()
  }, [user, accountId, db])

  const handleSave = async () => {
    if (!accountId) {
      toast.error('Not authenticated')
      return
    }
    setSaving(true)
    try {
      const { error } = await db.from('bio_configs').upsert(
        {
          account_id: accountId,
          profile_name: config.profileName,
          bio: config.bio,
          avatar_url: config.avatarUrl,
          og_title: config.ogTitle,
          og_description: config.ogDescription,
          og_image_url: config.ogImageUrl,
          theme: config.theme,
          links: config.links,
          socials: config.socials,
          active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'account_id' },
      )
      if (error) throw error
      toast.success('Bio saved!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'avatarUrl' | 'ogImageUrl') => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be max 2MB')
      return
    }
    const reader = new FileReader()
    reader.onloadend = () => {
      setConfig((prev) => ({ ...prev, [field]: reader.result as string }))
      toast.success('Image loaded!')
    }
    reader.readAsDataURL(file)
  }

  const addLink = () => {
    const newLink: BioLink = {
      id: Date.now().toString(),
      title: 'New Link',
      url: 'https://',
      active: true,
    }
    setConfig((prev) => ({ ...prev, links: [...prev.links, newLink] }))
  }

  const removeLink = (id: string) => {
    setConfig((prev) => ({ ...prev, links: prev.links.filter((l) => l.id !== id) }))
  }

  const updateLink = (id: string, updates: Partial<BioLink>) => {
    setConfig((prev) => ({
      ...prev,
      links: prev.links.map((l) => (l.id === id ? { ...l, ...updates } : l)),
    }))
  }

  const copyBioLink = () => {
    const url = `${window.location.origin}/bio`
    navigator.clipboard.writeText(url)
    setCopied(true)
    toast.success('Bio link copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Editor Panel */}
      <div className="w-full lg:w-[450px] space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="font-bold flex items-center gap-2">
            <Globe size={20} className="text-primary" />
            Link Bio
          </h2>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex p-1 bg-muted rounded-lg">
          {(['content', 'appearance', 'share'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 text-xs font-bold rounded-md transition-all capitalize ${
                activeTab === tab
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content Tab */}
        {activeTab === 'content' && (
          <div className="space-y-6">
            {/* Profile */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Profile
              </h3>
              <div className="flex items-center gap-4">
                <div
                  className="relative group cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <img
                    src={config.avatarUrl}
                    alt="Avatar"
                    className="w-16 h-16 rounded-full border-2 border-muted object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <ImageIcon size={18} className="text-white" />
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => handleImageUpload(e, 'avatarUrl')}
                    accept="image/*"
                    className="hidden"
                  />
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">
                      Name
                    </label>
                    <Input
                      value={config.profileName}
                      onChange={(e) => setConfig({ ...config, profileName: e.target.value })}
                      placeholder="Profile name"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">
                      Bio
                    </label>
                    <Textarea
                      value={config.bio}
                      onChange={(e) => setConfig({ ...config, bio: e.target.value })}
                      placeholder="Short description..."
                      rows={2}
                      className="resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Links */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Links
                </h3>
                <Button variant="ghost" size="sm" onClick={addLink}>
                  <Plus size={14} className="mr-1" /> Add
                </Button>
              </div>
              <div className="space-y-3">
                {config.links.map((link) => (
                  <div key={link.id} className="p-4 bg-muted/50 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <Input
                        value={link.title}
                        onChange={(e) => updateLink(link.id, { title: e.target.value })}
                        placeholder="Button title"
                        className="font-bold border-none bg-transparent p-0 h-auto focus-visible:ring-0"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateLink(link.id, { active: !link.active })}
                          className={`w-8 h-4 rounded-full transition-all relative ${
                            link.active ? 'bg-primary' : 'bg-muted-foreground/30'
                          }`}
                        >
                          <div
                            className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${
                              link.active ? 'right-0.5' : 'left-0.5'
                            }`}
                          />
                        </button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeLink(link.id)}>
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 bg-background p-2 rounded-lg border">
                      <ExternalLink size={12} className="text-muted-foreground shrink-0" />
                      <Input
                        value={link.url}
                        onChange={(e) => updateLink(link.id, { url: e.target.value })}
                        placeholder="URL"
                        className="border-none bg-transparent p-0 h-auto text-xs focus-visible:ring-0"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Socials */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Social Media (Username)
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 bg-muted/50 p-2 rounded-lg">
                  <Camera size={14} className="text-pink-500" />
                  <Input
                    value={config.socials.instagram || ''}
                    onChange={(e) =>
                      setConfig({ ...config, socials: { ...config.socials, instagram: e.target.value } })
                    }
                    placeholder="Instagram"
                    className="border-none bg-transparent p-0 h-auto text-xs focus-visible:ring-0"
                  />
                </div>
                <div className="flex items-center gap-2 bg-muted/50 p-2 rounded-lg">
                  <Briefcase size={14} className="text-blue-600" />
                  <Input
                    value={config.socials.linkedin || ''}
                    onChange={(e) =>
                      setConfig({ ...config, socials: { ...config.socials, linkedin: e.target.value } })
                    }
                    placeholder="LinkedIn"
                    className="border-none bg-transparent p-0 h-auto text-xs focus-visible:ring-0"
                  />
                </div>
                <div className="flex items-center gap-2 bg-muted/50 p-2 rounded-lg">
                  <Users size={14} className="text-blue-500" />
                  <Input
                    value={config.socials.facebook || ''}
                    onChange={(e) =>
                      setConfig({ ...config, socials: { ...config.socials, facebook: e.target.value } })
                    }
                    placeholder="Facebook"
                    className="border-none bg-transparent p-0 h-auto text-xs focus-visible:ring-0"
                  />
                </div>
                <div className="flex items-center gap-2 bg-muted/50 p-2 rounded-lg">
                  <MessageCircle size={14} className="text-sky-500" />
                  <Input
                    value={config.socials.twitter || ''}
                    onChange={(e) =>
                      setConfig({ ...config, socials: { ...config.socials, twitter: e.target.value } })
                    }
                    placeholder="Twitter"
                    className="border-none bg-transparent p-0 h-auto text-xs focus-visible:ring-0"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Appearance Tab */}
        {activeTab === 'appearance' && (
          <div className="space-y-6">
            {/* Colors */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Color Scheme
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { key: 'backgroundColor' as const, label: 'Background' },
                  { key: 'buttonColor' as const, label: 'Buttons' },
                  { key: 'textColor' as const, label: 'Text' },
                  { key: 'buttonTextColor' as const, label: 'Button Text' },
                ].map(({ key, label }) => (
                  <div key={key} className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground">{label}</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={config.theme[key]}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            theme: { ...config.theme, [key]: e.target.value },
                          })
                        }
                        className="w-8 h-8 rounded-lg overflow-hidden border-none cursor-pointer"
                      />
                      <span className="text-[10px] font-mono uppercase">
                        {config.theme[key]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Card Style */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Card Style
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {(['flat', 'rounded', 'glass', 'shadow'] as const).map((style) => (
                  <button
                    key={style}
                    onClick={() => setConfig({ ...config, theme: { ...config.theme, cardStyle: style } })}
                    className={`p-3 rounded-xl border text-xs font-bold capitalize transition-all ${
                      config.theme.cardStyle === style
                        ? 'bg-primary text-primary-foreground border-primary shadow-lg'
                        : 'bg-background border-muted hover:border-primary/50'
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>

            {/* Font */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Font Family
              </h3>
              <select
                value={config.theme.fontFamily}
                onChange={(e) => setConfig({ ...config, theme: { ...config.theme, fontFamily: e.target.value } })}
                className="w-full px-3 py-2 text-sm border rounded-md bg-background"
              >
                <option value="sans-serif">Sans-serif</option>
                <option value="serif">Serif</option>
                <option value="monospace">Monospace</option>
                <option value="cursive">Cursive</option>
                <option value="system-ui, -apple-system, sans-serif">System UI</option>
              </select>
            </div>
          </div>
        )}

        {/* Share Tab */}
        {activeTab === 'share' && (
          <div className="space-y-6">
            {/* Copy Link */}
            <div className="bg-primary/10 p-6 rounded-xl border border-primary/20 text-center space-y-4">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto">
                <ExternalLink size={32} className="text-primary" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold">Your link is ready!</h4>
                <p className="text-xs text-muted-foreground">
                  Copy and use in your Instagram, TikTok, or WhatsApp bio.
                </p>
              </div>
              <div className="flex bg-background p-2 rounded-xl border items-center gap-3">
                <span className="flex-1 text-xs text-muted-foreground font-mono truncate px-2">
                  {typeof window !== 'undefined' ? `${window.location.origin}/bio` : '/bio'}
                </span>
                <Button size="sm" onClick={copyBioLink}>
                  {copied ? <Check size={14} /> : 'Copy'}
                </Button>
              </div>
            </div>

            {/* OG Settings */}
            <div className="p-4 bg-card rounded-xl border space-y-4">
              <h4 className="font-bold text-sm flex items-center gap-2">
                <ImageIcon size={16} className="text-blue-500" />
                Open Graph / SEO Preview
              </h4>
              <p className="text-xs text-muted-foreground">
                Configure how your link appears when shared on social media.
              </p>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">OG Title</label>
                  <Input
                    value={config.ogTitle}
                    onChange={(e) => setConfig({ ...config, ogTitle: e.target.value })}
                    placeholder={config.profileName}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">OG Description</label>
                  <Textarea
                    value={config.ogDescription}
                    onChange={(e) => setConfig({ ...config, ogDescription: e.target.value })}
                    placeholder={config.bio}
                    rows={2}
                    className="mt-1 resize-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">OG Image</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Button variant="outline" size="sm" onClick={() => ogImageInputRef.current?.click()}>
                      <ImageIcon className="h-3 w-3 mr-1" /> Upload
                    </Button>
                    <input
                      type="file"
                      ref={ogImageInputRef}
                      onChange={(e) => handleImageUpload(e, 'ogImageUrl')}
                      accept="image/*"
                      className="hidden"
                    />
                    {config.ogImageUrl && (
                      <img src={config.ogImageUrl} alt="" className="w-10 h-10 rounded object-cover" />
                    )}
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="border rounded-lg overflow-hidden mt-4">
                <div className="bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground truncate">{config.ogTitle || config.profileName}</p>
                  <p className="text-[10px] text-muted-foreground/60 truncate">{config.ogDescription || config.bio}</p>
                </div>
                {config.ogImageUrl && (
                  <img src={config.ogImageUrl} alt="" className="w-full h-32 object-cover" />
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Live Preview */}
      <div className="flex-1 hidden lg:flex justify-center items-start">
        <div className="sticky top-4 flex flex-col items-center">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">
            Live Preview
          </h3>
          {/* Smartphone Bezel */}
          <div className="relative mx-auto w-[320px] h-[640px] rounded-[40px] border-[12px] border-zinc-950 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col bg-black">
            {/* Notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-4 bg-zinc-955 dark:bg-zinc-850 rounded-b-2xl z-20" />
            
            {/* Screen Content */}
            <div
              className="flex-1 overflow-y-auto px-4 py-8 flex flex-col items-center w-full select-none [&::-webkit-scrollbar]:w-0"
              style={{ background: config.theme.backgroundColor, fontFamily: config.theme.fontFamily }}
            >
              <img
                src={config.avatarUrl}
                alt=""
                className="w-20 h-20 rounded-full border-2 border-white/20 object-cover mb-4 mt-4"
              />
              <h2
                className="text-lg font-bold text-center"
                style={{ color: config.theme.textColor }}
              >
                {config.profileName}
              </h2>
              {config.bio && (
                <p
                  className="text-xs text-center mt-2 opacity-80"
                  style={{ color: config.theme.textColor }}
                >
                  {config.bio}
                </p>
              )}
              <div className="w-full space-y-3 mt-6">
                {config.links
                  .filter((l) => l.active)
                  .map((link) => {
                    const bg =
                      config.theme.cardStyle === 'glass'
                        ? 'transparent'
                        : config.theme.buttonColor
                    const borderRadius =
                      config.theme.cardStyle === 'flat' ? '0' : '16px'
                    const extraStyle: React.CSSProperties =
                      config.theme.cardStyle === 'glass'
                        ? { backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.2)' }
                        : config.theme.cardStyle === 'shadow'
                          ? { boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)' }
                          : {}
                    return (
                      <a
                        key={link.id}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-center py-3 px-4 text-sm font-bold transition-transform hover:scale-[1.02]"
                        style={{
                          background: bg,
                          color: config.theme.buttonTextColor,
                          borderRadius,
                          textDecoration: 'none',
                          ...extraStyle
                        }}
                      >
                        {link.title}
                      </a>
                    )
                  })}
              </div>

              {/* Social Media Preview Icons */}
              {Object.values(config.socials).some(Boolean) && (
                <div className="flex gap-4 mt-8 justify-center items-center">
                  {config.socials.instagram && (
                    <a
                      href={getSocialUrl('instagram', config.socials.instagram)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: config.theme.textColor }}
                      className="opacity-80 hover:opacity-100 transition-opacity"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
                        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                        <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
                      </svg>
                    </a>
                  )}
                  {config.socials.linkedin && (
                    <a
                      href={getSocialUrl('linkedin', config.socials.linkedin)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: config.theme.textColor }}
                      className="opacity-80 hover:opacity-100 transition-opacity"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
                        <rect width="4" height="12" x="2" y="9"/>
                        <circle cx="4" cy="4" r="2"/>
                      </svg>
                    </a>
                  )}
                  {config.socials.facebook && (
                    <a
                      href={getSocialUrl('facebook', config.socials.facebook)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: config.theme.textColor }}
                      className="opacity-80 hover:opacity-100 transition-opacity"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
                      </svg>
                    </a>
                  )}
                  {config.socials.twitter && (
                    <a
                      href={getSocialUrl('twitter', config.socials.twitter)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: config.theme.textColor }}
                      className="opacity-80 hover:opacity-100 transition-opacity"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/>
                      </svg>
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
