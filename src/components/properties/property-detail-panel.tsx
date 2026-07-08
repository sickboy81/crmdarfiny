'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  X,
  MapPin,
  Bed,
  Bath,
  Square,
  Car,
  Edit,
  Trash2,
  Share2,
  Copy,
  ExternalLink,
  MessageCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { MediaGallery } from './media-gallery'
import { PROPERTY_TYPES, PROPERTY_STATUSES } from '@/lib/properties/types'
import type { Property } from '@/lib/properties/types'

interface PropertyDetailPanelProps {
  property: Property | null
  open: boolean
  onClose: () => void
  onEdit: (property: Property) => void
  onDelete: (id: string) => void
  onShare: (property: Property) => void
  onDuplicate: (property: Property) => void
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(price)
}

function getStatusColor(status: string) {
  const s = PROPERTY_STATUSES.find((ps) => ps.value === status)
  switch (s?.color) {
    case 'green':
      return 'bg-green-500/10 text-green-600'
    case 'yellow':
      return 'bg-yellow-500/10 text-yellow-600'
    case 'red':
      return 'bg-red-500/10 text-red-600'
    case 'blue':
      return 'bg-blue-500/10 text-blue-600'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

function getStatusLabel(status: string) {
  return PROPERTY_STATUSES.find((ps) => ps.value === status)?.labelKey ?? status
}

function getTypeLabel(type: string) {
  return PROPERTY_TYPES.find((pt) => pt.value === type)?.labelKey ?? type
}

export function PropertyDetailPanel({
  property,
  open,
  onClose,
  onEdit,
  onDelete,
  onShare,
  onDuplicate,
}: PropertyDetailPanelProps) {
  const t = useTranslations('properties')

  if (!property) return null

  const videoUrl = property.specs?.video_url ?? property.specs?.video ?? null

  const fullAddress = [
    property.address,
    property.neighborhood,
    property.city,
  ]
    .filter(Boolean)
    .join(', ')

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/properties/${property.id}`
    try {
      await navigator.clipboard.writeText(url)
      toast.success(t('linkCopied') ?? 'Link copiado!')
    } catch {
      toast.error(t('linkCopyError') ?? 'Erro ao copiar link')
    }
  }

  const handleWhatsAppShare = () => {
    const url = `${window.location.origin}/properties/${property.id}`
    const message = `${property.title} - ${formatPrice(property.price)} ${url}`
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, '_blank')
  }

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Painel */}
      <div
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col bg-background shadow-xl transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Botão fechar */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full bg-background/80 p-2 text-muted-foreground backdrop-blur-sm transition-colors hover:bg-muted hover:text-foreground"
          aria-label={t('close') ?? 'Fechar'}
        >
          <X className="h-5 w-5" />
        </button>

        {/* Conteúdo scrollável */}
        <div className="flex-1 overflow-y-auto">
          {/* Galeria de mídia */}
          <MediaGallery
            photos={property.photos}
            videoUrl={videoUrl}
          />

          {/* Seção de conteúdo */}
          <div className="space-y-4 p-6">
            {/* Cabeçalho: título + badges */}
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-xl font-bold leading-tight">
                {property.title}
              </h2>
              <div className="flex shrink-0 items-center gap-2">
                {property.code && (
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-bold text-muted-foreground">
                    {property.code}
                  </span>
                )}
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${getStatusColor(property.status)}`}
                >
                  {t(getStatusLabel(property.status))}
                </span>
              </div>
            </div>

            {/* Preço */}
            <p className="text-2xl font-bold text-primary">
              {formatPrice(property.price)}
            </p>

            {/* Tipo */}
            <div>
              <span className="inline-block rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                {t(getTypeLabel(property.type))}
              </span>
            </div>

            {/* Localização */}
            {fullAddress && (
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{fullAddress}</span>
              </div>
            )}

            {/* Specs: grid 2x2 */}
            <div className="grid grid-cols-2 gap-3">
              {property.specs?.bedrooms != null && (
                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
                    <Bed className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-bold leading-tight">
                      {property.specs.bedrooms}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t('bedrooms') ?? 'Quartos'}
                    </p>
                  </div>
                </div>
              )}
              {property.specs?.bathrooms != null && (
                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
                    <Bath className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-bold leading-tight">
                      {property.specs.bathrooms}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t('bathrooms') ?? 'Banheiros'}
                    </p>
                  </div>
                </div>
              )}
              {property.specs?.area != null && (
                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
                    <Square className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-bold leading-tight">
                      {property.specs.area}m²
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t('area') ?? 'Área'}
                    </p>
                  </div>
                </div>
              )}
              {property.specs?.parking != null && (
                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
                    <Car className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-bold leading-tight">
                      {property.specs.parking}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t('parking') ?? 'Vagas'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Características */}
            {property.features.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {property.features.map((feature) => (
                  <span
                    key={feature}
                    className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"
                  >
                    {feature}
                  </span>
                ))}
              </div>
            )}

            {/* Descrição */}
            {property.description && (
              <div>
                <h3 className="mb-1 text-sm font-semibold">
                  {t('description') ?? 'Descrição'}
                </h3>
                <p className="whitespace-pre-line text-sm text-muted-foreground">
                  {property.description}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Barra de ações (fixa no fundo) */}
        <div className="sticky bottom-0 border-t bg-background p-4">
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              className="flex-1"
              onClick={() => onEdit(property)}
            >
              <Edit className="h-4 w-4" />
              {t('edit')}
            </Button>
            <Button
              variant="outline"
              onClick={handleCopyLink}
              title={t('share') ?? 'Compartilhar'}
            >
              <Share2 className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              onClick={handleWhatsAppShare}
              title="WhatsApp"
            >
              <MessageCircle className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => onDuplicate(property)}
              title={t('duplicate') ?? 'Duplicar'}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              variant="destructive"
              onClick={() => onDelete(property.id)}
              title={t('delete') ?? 'Excluir'}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
