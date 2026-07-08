'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Plus, Home, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import type { Property } from '@/lib/properties/types'
import { PropertyFilters } from './property-filters'
import { PropertyCard } from './property-card'
import { PropertyListItem } from './property-list-item'
import { PropertyDetailPanel } from './property-detail-panel'
import { PropertyForm } from './property-form'
import { usePropertyFilters } from '@/hooks/use-property-filters'

export function PropertyCatalog() {
  const t = useTranslations('properties')
  const { user } = useAuth()
  const db = createClient()

  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingProperty, setEditingProperty] = useState<Property | null>(null)
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)

  const {
    filters,
    setSearch,
    setTypes,
    setStatuses,
    setPriceMin,
    setPriceMax,
    setCity,
    setMinBedrooms,
    setSortBy,
    setViewMode,
    clearFilters,
    hasActiveFilters,
    filteredProperties,
    availableCities,
  } = usePropertyFilters(properties)

  useEffect(() => {
    if (!user) return
    loadProperties()
  }, [user])

  const loadProperties = async () => {
    setLoading(true)
    const { data } = await db
      .from('user_properties')
      .select('*')
      .order('created_at', { ascending: false })

    if (data) setProperties(data)
    setLoading(false)
  }

  const handleSave = async (data: any) => {
    if (editingProperty) {
      const { error } = await db
        .from('user_properties')
        .update(data)
        .eq('id', editingProperty.id)
      if (error) {
        toast.error(t('updateFailed'))
        return
      }
    } else {
      const { error } = await db.from('user_properties').insert({
        ...data,
        user_id: user?.id,
      })
      if (error) {
        toast.error(t('createFailed'))
        return
      }
    }

    await loadProperties()
    setShowForm(false)
    setEditingProperty(null)
    toast.success(editingProperty ? t('updateSuccess') : t('createSuccess'))
  }

  const handleDelete = async (id: string) => {
    const { error } = await db.from('user_properties').delete().eq('id', id)
    if (error) {
      toast.error(t('deleteFailed'))
      return
    }
    await loadProperties()
    if (selectedProperty?.id === id) {
      setSelectedProperty(null)
    }
    toast.success(t('deleteSuccess'))
  }

  const handleShare = (property: Property) => {
    const url = `${window.location.origin}/properties/${property.id}`
    navigator.clipboard.writeText(url)
    toast.success(t('linkCopied'))
  }

  const handleDuplicate = async (property: Property) => {
    const { id: _id, created_at: _created, user_id: _uid, ...rest } = property
    const { error } = await db.from('user_properties').insert({
      ...rest,
      title: `Cópia de ${property.title}`,
      user_id: user?.id,
    })
    if (error) {
      toast.error(t('duplicateFailed'))
      return
    }
    await loadProperties()
    toast.success(t('duplicateSuccess'))
  }

  const handleEdit = (property: Property) => {
    setEditingProperty(property)
  }

  const handleClick = (property: Property) => {
    setSelectedProperty(property)
  }

  const handleCancelForm = () => {
    setShowForm(false)
    setEditingProperty(null)
  }

  // Tela de formulário
  if (showForm || editingProperty) {
    return (
      <PropertyForm
        property={editingProperty}
        onSave={handleSave}
        onCancel={handleCancelForm}
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* Barra de filtros */}
      <PropertyFilters
        search={filters.search}
        onSearchChange={setSearch}
        types={filters.types}
        onTypesChange={setTypes}
        statuses={filters.statuses}
        onStatusesChange={setStatuses}
        priceMin={filters.priceMin}
        onPriceMinChange={setPriceMin}
        priceMax={filters.priceMax}
        onPriceMaxChange={setPriceMax}
        city={filters.city}
        onCityChange={setCity}
        minBedrooms={filters.minBedrooms}
        onMinBedroomsChange={setMinBedrooms}
        sortBy={filters.sortBy}
        onSortByChange={setSortBy as (s: string) => void}
        viewMode={filters.viewMode}
        onViewModeChange={setViewMode}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearFilters}
        availableCities={availableCities}
        totalCount={properties.length}
        filteredCount={filteredProperties.length}
      />

      {/* Estado de carregamento */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : properties.length === 0 && !hasActiveFilters ? (
        /* Estado vazio: nenhum imóvel cadastrado */
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Home className="h-16 w-16 mb-3 opacity-30" />
          <p className="text-sm mb-4">{t('noProperties')}</p>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t('newProperty')}
          </Button>
        </div>
      ) : filteredProperties.length === 0 && hasActiveFilters ? (
        /* Estado vazio com filtros ativos */
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Home className="h-16 w-16 mb-3 opacity-30" />
          <p className="text-sm mb-4">{t('noResults')}</p>
          <Button variant="outline" onClick={clearFilters}>
            {t('clearFilters')}
          </Button>
        </div>
      ) : filters.viewMode === 'grid' ? (
        /* Visualização em grade */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProperties.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onShare={handleShare}
              onDuplicate={handleDuplicate}
              onClick={handleClick}
            />
          ))}
        </div>
      ) : (
        /* Visualização em lista */
        <div className="rounded-lg border bg-card">
          {filteredProperties.map((property) => (
            <PropertyListItem
              key={property.id}
              property={property}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onShare={handleShare}
              onDuplicate={handleDuplicate}
              onClick={handleClick}
            />
          ))}
        </div>
      )}

      {/* Painel de detalhes (slide-over) */}
      <PropertyDetailPanel
        property={selectedProperty}
        open={selectedProperty !== null}
        onClose={() => setSelectedProperty(null)}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onShare={handleShare}
        onDuplicate={handleDuplicate}
      />
    </div>
  )
}
