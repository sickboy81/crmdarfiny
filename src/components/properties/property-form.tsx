'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Property, PropertyFormData } from '@/lib/properties/types'
import { PROPERTY_TYPES, PROPERTY_STATUSES } from '@/lib/properties/types'
import { MediaUploader } from './media-uploader'
import { useAuth } from '@/hooks/use-auth'

interface PropertyFormProps {
  property: Property | null
  onSave: (data: PropertyFormData) => void
  onCancel: () => void
}

export function PropertyForm({ property, onSave, onCancel }: PropertyFormProps) {
  const t = useTranslations('properties')
  const tc = useTranslations('common')
  const { user } = useAuth()
  const [videoUrl, setVideoUrl] = useState<string | null>(property?.specs?.video_url || null)
  const [form, setForm] = useState<PropertyFormData>({
    code: property?.code || '',
    title: property?.title || '',
    description: property?.description || '',
    type: property?.type || 'apartment',
    status: property?.status || 'available',
    price: property?.price || 0,
    address: property?.address || '',
    neighborhood: property?.neighborhood || '',
    city: property?.city || '',
    specs: property?.specs || { bedrooms: '', bathrooms: '', area: '', parking: '' },
    features: property?.features || [],
    photos: property?.photos || [],
  })

  const [featureInput, setFeatureInput] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const dataWithVideo = { ...form, specs: { ...form.specs, video_url: videoUrl } }
    onSave(dataWithVideo)
  }

  const addFeature = () => {
    if (featureInput.trim()) {
      setForm((prev) => ({
        ...prev,
        features: [...prev.features, featureInput.trim()],
      }))
      setFeatureInput('')
    }
  }

  const removeFeature = (index: number) => {
    setForm((prev) => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index),
    }))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{property ? tc('edit') : t('newProperty')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-muted-foreground">{t('code')}</label>
              <Input
                value={form.code}
                onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
                placeholder={t('codePlaceholder')}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground">{t('title')} *</label>
              <Input
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                placeholder={t('titlePlaceholder')}
                required
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground">{t('type')}</label>
              <select
                value={form.type}
                onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
                className="w-full mt-1 px-3 py-2 text-sm border rounded-md bg-background"
              >
                {PROPERTY_TYPES.map((pt) => (
                  <option key={pt.value} value={pt.value}>{t(pt.labelKey)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground">{t('status')}</label>
              <select
                value={form.status}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                className="w-full mt-1 px-3 py-2 text-sm border rounded-md bg-background"
              >
                {PROPERTY_STATUSES.map((ps) => (
                  <option key={ps.value} value={ps.value}>{t(ps.labelKey)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground">{t('price')}</label>
              <Input
                type="number"
                value={form.price}
                onChange={(e) => setForm((p) => ({ ...p, price: Number(e.target.value) }))}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground">{t('city')}</label>
              <Input
                value={form.city}
                onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                placeholder={t('cityPlaceholder')}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground">{t('neighborhood')}</label>
              <Input
                value={form.neighborhood}
                onChange={(e) => setForm((p) => ({ ...p, neighborhood: e.target.value }))}
                placeholder={t('neighborhoodPlaceholder')}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground">{t('address')}</label>
              <Input
                value={form.address}
                onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                placeholder={t('addressPlaceholder')}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground">{t('description')}</label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder={t('descriptionPlaceholder')}
              rows={3}
              className="mt-1 resize-none"
            />
          </div>

          {/* Specs */}
          <div>
            <label className="text-xs font-bold text-muted-foreground">{t('specs')}</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-1">
              {[
                { key: 'bedrooms', label: t('bedrooms') },
                { key: 'bathrooms', label: t('bathrooms') },
                { key: 'area', label: t('area') },
                { key: 'parking', label: t('parking') },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="text-[10px] text-muted-foreground">{label}</label>
                  <Input
                    type="number"
                    value={form.specs[key] || ''}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        specs: { ...p.specs, [key]: Number(e.target.value) || '' },
                      }))
                    }
                    className="mt-1"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Mídia */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground">{t('photos')}</label>
            <MediaUploader
              photos={form.photos}
              onPhotosChange={(photos) => setForm((p) => ({ ...p, photos }))}
              videoUrl={videoUrl}
              onVideoUrlChange={setVideoUrl}
              userId={user?.id}
              propertyId={property?.id}
            />
          </div>

          {/* Features */}
          <div>
            <label className="text-xs font-bold text-muted-foreground">{t('features')}</label>
            <div className="flex gap-2 mt-1">
              <Input
                value={featureInput}
                onChange={(e) => setFeatureInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                placeholder={t('addFeaturePlaceholder')}
                className="flex-1"
              />
              <Button type="button" variant="outline" onClick={addFeature}>{tc('add')}</Button>
            </div>
            {form.features.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {form.features.map((f, i) => (
                  <span
                    key={i}
                    className="text-xs bg-secondary px-2 py-1 rounded-md flex items-center gap-1"
                  >
                    {f}
                    <button type="button" onClick={() => removeFeature(i)} className="text-muted-foreground hover:text-destructive">
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>{tc('cancel')}</Button>
            <Button type="submit">{property ? tc('save') : tc('create')}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
