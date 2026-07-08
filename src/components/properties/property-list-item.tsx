'use client'

import { MapPin, Bed, Bath, Square, Car, Edit, Trash2, Share2, Copy, Play, MoreVertical, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { useTranslations } from 'next-intl'
import { PROPERTY_TYPES, PROPERTY_STATUSES } from '@/lib/properties/types'
import type { Property } from '@/lib/properties/types'

interface PropertyListItemProps {
  property: Property
  onEdit: (property: Property) => void
  onDelete: (id: string) => void
  onShare: (property: Property) => void
  onDuplicate: (property: Property) => void
  onClick: (property: Property) => void
}

const getStatusColor = (status: string) => {
  const s = PROPERTY_STATUSES.find((ps) => ps.value === status)
  switch (s?.color) {
    case 'green': return 'bg-green-500/10 text-green-600'
    case 'yellow': return 'bg-yellow-500/10 text-yellow-600'
    case 'red': return 'bg-red-500/10 text-red-600'
    case 'blue': return 'bg-blue-500/10 text-blue-600'
    default: return 'bg-muted text-muted-foreground'
  }
}

const formatPrice = (price: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price)

export function PropertyListItem({
  property,
  onEdit,
  onDelete,
  onShare,
  onDuplicate,
  onClick,
}: PropertyListItemProps) {
  const t = useTranslations('properties')

  const hasVideo = property.specs?.video_url

  return (
    <div
      className="flex items-center gap-4 p-3 border-b last:border-b-0 cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => onClick(property)}
    >
      {/* Thumbnail */}
      <div className="relative w-32 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
        {property.photos.length > 0 ? (
          <img
            src={property.photos[0]}
            alt={property.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Home className="h-8 w-8 text-muted-foreground/30" />
          </div>
        )}
        {hasVideo && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <Play className="h-6 w-6 text-white fill-white" />
          </div>
        )}
      </div>

      {/* Right side */}
      <div className="flex-1 min-w-0 space-y-1">
        {/* Top row: title + badges */}
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-sm truncate">{property.title}</h3>
          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full flex-shrink-0 ${getStatusColor(property.status)}`}>
            {(() => {
              const found = PROPERTY_STATUSES.find((ps) => ps.value === property.status)
              return found ? t(found.labelKey) : property.status
            })()}
          </span>
          {property.code && (
            <span className="text-[10px] font-bold bg-black/60 text-white px-2 py-0.5 rounded-full flex-shrink-0">
              {property.code}
            </span>
          )}
        </div>

        {/* Middle row: location + specs */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1 min-w-0">
            <MapPin className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{property.neighborhood || property.address || t('noAddress')}</span>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {property.specs?.bedrooms != null && (
              <div className="flex items-center gap-1">
                <Bed className="h-3 w-3" />
                <span>{property.specs.bedrooms}</span>
              </div>
            )}
            {property.specs?.bathrooms != null && (
              <div className="flex items-center gap-1">
                <Bath className="h-3 w-3" />
                <span>{property.specs.bathrooms}</span>
              </div>
            )}
            {property.specs?.area != null && (
              <div className="flex items-center gap-1">
                <Square className="h-3 w-3" />
                <span>{property.specs.area}m²</span>
              </div>
            )}
            {property.specs?.parking != null && (
              <div className="flex items-center gap-1">
                <Car className="h-3 w-3" />
                <span>{property.specs.parking}</span>
              </div>
            )}
          </div>
        </div>

        {/* Bottom row: price + actions */}
        <div className="flex items-center justify-between pt-1">
          <span className="font-bold text-sm text-primary">{formatPrice(property.price)}</span>
          <DropdownMenu>
            <DropdownMenuTrigger onClick={(e) => e.stopPropagation()}>
              <MoreVertical className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(property) }}>
                <Edit className="h-4 w-4 mr-2" />
                {t('edit')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDuplicate(property) }}>
                <Copy className="h-4 w-4 mr-2" />
                {t('duplicate')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onShare(property) }}>
                <Share2 className="h-4 w-4 mr-2" />
                {t('share')}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={(e) => { e.stopPropagation(); onDelete(property.id) }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t('delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}
