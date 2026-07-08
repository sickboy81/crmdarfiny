'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  ArrowLeft,
  MapPin,
  Bed,
  Bath,
  Square,
  Car,
  Edit,
  Share2,
  Copy,
  Trash2,
  MessageCircle,
  ExternalLink,
  Home,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { MediaGallery } from '@/components/properties/media-gallery'
import {
  PROPERTY_TYPES,
  PROPERTY_STATUSES,
  type Property,
} from '@/lib/properties/types'

function formatPrice(price: number): string {
  return price.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

export default function PropertyDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const t = useTranslations('properties')

  const [property, setProperty] = useState<Property | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!id) return

    async function fetchProperty() {
      const supabase = createClient()
      const { data, error: fetchError } = await supabase
        .from('user_properties')
        .select('*')
        .eq('id', id)
        .single()

      if (fetchError || !data) {
        setError(true)
        setLoading(false)
        return
      }

      setProperty(data)
      document.title = data.title || t('detail')
      setLoading(false)
    }

    fetchProperty()
  }, [id, t])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !property) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Home className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">{t('notFound')}</h2>
        <Button variant="outline" onClick={() => router.push('/properties')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('backToCatalog')}
        </Button>
      </div>
    )
  }

  const {
    title,
    price,
    status,
    type,
    address,
    city,
    features,
    description,
    photos,
  } = property

  const bedrooms = property.specs?.bedrooms
  const bathrooms = property.specs?.bathrooms
  const area = property.specs?.area
  const parking = property.specs?.parking
  const video_url = property.specs?.video_url

  const statusLabel = PROPERTY_STATUSES.find((s) => s.value === status)
  const typeLabel = PROPERTY_TYPES.find((t) => t.value === type)

  const fullAddress = [address, city].filter(Boolean).join(', ')

  function handleShare() {
    const url = `${window.location.origin}/properties/${id}`
    navigator.clipboard.writeText(url)
    toast.success('Link copiado!')
  }

  function handleWhatsApp() {
    const url = `${window.location.origin}/properties/${id}`
    const message = `${title} - ${formatPrice(price)} ${url}`
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank')
  }

  function handleDuplicate() {
    toast.info(t('duplicatePlaceholder') || 'Funcionalidade em breve')
  }

  function handleDelete() {
    toast.info(t('deletePlaceholder') || 'Funcionalidade em breve')
  }

  return (
    <div className="max-w-5xl mx-auto pb-24">
      {/* Botão voltar */}
      <Button
        variant="ghost"
        className="mb-4"
        onClick={() => router.push('/properties')}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        {t('backToCatalog')}
      </Button>

      {/* Galeria de mídia */}
      {(photos?.length > 0 || video_url) && (
        <div className="mb-6">
          <MediaGallery photos={photos || []} videoUrl={video_url} />
        </div>
      )}

      {/* Conteúdo */}
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold">{title}</h1>
            {statusLabel && (
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                {t(statusLabel.labelKey)}
              </span>
            )}
            {property.code && (
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                #{property.code}
              </span>
            )}
          </div>

          {/* Preço */}
          <p className="mt-3 text-3xl font-bold text-primary">
            {formatPrice(price)}
          </p>

          {/* Tipo */}
          {typeLabel && (
            <span className="mt-2 inline-block rounded-full bg-secondary px-3 py-1 text-xs font-medium">
              {t(typeLabel.labelKey)}
            </span>
          )}
        </div>

        {/* Localização */}
        {fullAddress && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0" />
            <span>{fullAddress}</span>
          </div>
        )}

        {/* Especificações */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {bedrooms != null && (
            <div className="rounded-lg border p-4 text-center">
              <Bed className="mx-auto mb-1 h-5 w-5 text-muted-foreground" />
              <p className="text-lg font-semibold">{bedrooms}</p>
              <p className="text-xs text-muted-foreground">
                {t('bedrooms') || 'Quartos'}
              </p>
            </div>
          )}
          {bathrooms != null && (
            <div className="rounded-lg border p-4 text-center">
              <Bath className="mx-auto mb-1 h-5 w-5 text-muted-foreground" />
              <p className="text-lg font-semibold">{bathrooms}</p>
              <p className="text-xs text-muted-foreground">
                {t('bathrooms') || 'Banheiros'}
              </p>
            </div>
          )}
          {area != null && (
            <div className="rounded-lg border p-4 text-center">
              <Square className="mx-auto mb-1 h-5 w-5 text-muted-foreground" />
              <p className="text-lg font-semibold">{area}</p>
              <p className="text-xs text-muted-foreground">
                {t('area') || 'Área (m²)'}
              </p>
            </div>
          )}
          {parking != null && (
            <div className="rounded-lg border p-4 text-center">
              <Car className="mx-auto mb-1 h-5 w-5 text-muted-foreground" />
              <p className="text-lg font-semibold">{parking}</p>
              <p className="text-xs text-muted-foreground">
                {t('parking') || 'Vagas'}
              </p>
            </div>
          )}
        </div>

        {/* Características */}
        {features?.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase text-muted-foreground">
              {t('features') || 'Características'}
            </h3>
            <div className="flex flex-wrap gap-2">
              {features.map((feature) => (
                <span
                  key={feature}
                  className="rounded-full bg-muted px-3 py-1 text-xs font-medium"
                >
                  {feature}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Descrição */}
        {description && (
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase text-muted-foreground">
              {t('description') || 'Descrição'}
            </h3>
            <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
              {description}
            </p>
          </div>
        )}
      </div>

      {/* Barra de ações (sticky) */}
      <div className="fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-5xl items-center gap-2 p-4">
          <Button onClick={() => router.push(`/properties/${id}/edit`)}>
            <Edit className="mr-2 h-4 w-4" />
            {t('edit')}
          </Button>
          <Button variant="outline" onClick={handleShare}>
            <Share2 className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">{t('share')}</span>
          </Button>
          <Button variant="outline" onClick={handleWhatsApp}>
            <MessageCircle className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">WhatsApp</span>
          </Button>
          <Button variant="outline" onClick={handleDuplicate}>
            <Copy className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">{t('duplicate')}</span>
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">{t('delete')}</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
