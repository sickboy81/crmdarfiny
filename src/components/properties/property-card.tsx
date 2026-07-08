'use client'

import { useTranslations } from 'next-intl'
import {
  MapPin,
  Bed,
  Bath,
  Square,
  Car,
  Edit,
  Trash2,
  Share2,
  Copy,
  MoreVertical,
  Play,
  Home,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { PROPERTY_STATUSES } from '@/lib/properties/types'
import type { Property } from '@/lib/properties/types'

interface PropertyCardProps {
  property: Property
  onEdit: (property: Property) => void
  onDelete: (id: string) => void
  onShare: (property: Property) => void
  onDuplicate: (property: Property) => void
  onClick: (property: Property) => void
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

function formatPrice(price: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(price)
}

export function PropertyCard({
  property,
  onEdit,
  onDelete,
  onShare,
  onDuplicate,
  onClick,
}: PropertyCardProps) {
  const t = useTranslations('properties')

  const hasVideo = property.specs?.video_url || property.specs?.video

  return (
    <Card
      className="overflow-hidden cursor-pointer transition-shadow hover:shadow-md"
      onClick={() => onClick(property)}
    >
      <div className="aspect-[16/9] bg-muted relative">
        {property.photos.length > 0 ? (
          <img
            src={property.photos[0]}
            alt={property.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Home className="h-12 w-12 text-muted-foreground/30" />
          </div>
        )}

        {/* Status badge */}
        <div className="absolute top-2 right-2">
          <span
            className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${getStatusColor(property.status)}`}
          >
            {(() => {
              const found = PROPERTY_STATUSES.find(
                (ps) => ps.value === property.status,
              )
              return found ? t(found.labelKey) : property.status
            })()}
          </span>
        </div>

        {/* Code badge */}
        {property.code && (
          <div className="absolute top-2 left-2">
            <span className="text-[10px] font-bold bg-black/60 text-white px-2 py-1 rounded-full">
              {property.code}
            </span>
          </div>
        )}

        {/* Photo count */}
        {property.photos.length > 1 && (
          <div className="absolute bottom-2 left-2">
            <span className="text-[10px] font-bold bg-black/60 text-white px-2 py-1 rounded-full">
              📷 {property.photos.length}
            </span>
          </div>
        )}

        {/* Video indicator */}
        {hasVideo && (
          <div className="absolute bottom-2 right-2">
            <span className="flex items-center gap-1 text-[10px] font-bold bg-black/60 text-white px-2 py-1 rounded-full">
              <Play className="h-3 w-3" />
            </span>
          </div>
        )}
      </div>

      <CardContent className="p-4 space-y-3">
        <div>
          <h3 className="font-bold text-sm truncate">{property.title}</h3>
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">
              {property.neighborhood || property.address || t('noAddress')}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {property.specs?.bedrooms && (
            <div className="flex items-center gap-1">
              <Bed className="h-3 w-3" />
              <span>{property.specs.bedrooms}</span>
            </div>
          )}
          {property.specs?.bathrooms && (
            <div className="flex items-center gap-1">
              <Bath className="h-3 w-3" />
              <span>{property.specs.bathrooms}</span>
            </div>
          )}
          {property.specs?.area && (
            <div className="flex items-center gap-1">
              <Square className="h-3 w-3" />
              <span>{property.specs.area}m²</span>
            </div>
          )}
          {property.specs?.parking && (
            <div className="flex items-center gap-1">
              <Car className="h-3 w-3" />
              <span>{property.specs.parking}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <span className="font-bold text-primary">
            {formatPrice(property.price)}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger onClick={(e) => e.stopPropagation()}>
              <MoreVertical className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit(property)
                }}
              >
                <Edit className="h-4 w-4 mr-2" />
                {t('edit')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  onShare(property)
                }}
              >
                <Share2 className="h-4 w-4 mr-2" />
                {t('share')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  onDuplicate(property)
                }}
              >
                <Copy className="h-4 w-4 mr-2" />
                {t('duplicate')}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(property.id)
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t('delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  )
}
