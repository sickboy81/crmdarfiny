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
      <div className="flex-1 hidden lg:block">
        <div className="sticky top-4">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
            Live Preview
          </h3>
          <div
            className="rounded-xl border overflow-hidden shadow-2xl"
            style={{ background: config.theme.backgroundColor }}
          >
            <div className="max-w-[320px] mx-auto p-6 flex flex-col items-center">
              <img
                src={config.avatarUrl}
                alt=""
                className="w-20 h-20 rounded-full border-2 border-white/20 object-cover mb-4"
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
                      <div
                        key={link.id}
                        className="text-center py-3 px-4 text-sm font-bold"
                        style={{
                          background: bg,
                          color: config.theme.buttonTextColor,
                          borderRadius,
                          ...extraStyle
                        }}
                      >
                        {link.title}
                      </div>
                    )
                  })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
