'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  Search,
  SlidersHorizontal,
  X,
  LayoutGrid,
  List,
  ArrowUpDown,
  ChevronDown,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { PROPERTY_TYPES, PROPERTY_STATUSES } from '@/lib/properties/types'

interface PropertyFiltersProps {
  search: string
  onSearchChange: (s: string) => void
  types: string[]
  onTypesChange: (t: string[]) => void
  statuses: string[]
  onStatusesChange: (s: string[]) => void
  priceMin: number | null
  onPriceMinChange: (p: number | null) => void
  priceMax: number | null
  onPriceMaxChange: (p: number | null) => void
  city: string
  onCityChange: (c: string) => void
  minBedrooms: number | null
  onMinBedroomsChange: (n: number | null) => void
  sortBy: string
  onSortByChange: (s: string) => void
  viewMode: 'grid' | 'list'
  onViewModeChange: (m: 'grid' | 'list') => void
  hasActiveFilters: boolean
  onClearFilters: () => void
  availableCities: string[]
  totalCount: number
  filteredCount: number
}

export function PropertyFilters({
  search,
  onSearchChange,
  types,
  onTypesChange,
  statuses,
  onStatusesChange,
  priceMin,
  onPriceMinChange,
  priceMax,
  onPriceMaxChange,
  city,
  onCityChange,
  minBedrooms,
  onMinBedroomsChange,
  sortBy,
  onSortByChange,
  viewMode,
  onViewModeChange,
  hasActiveFilters,
  onClearFilters,
  availableCities,
  totalCount,
  filteredCount,
}: PropertyFiltersProps) {
  const t = useTranslations('properties')
  const [filtersExpanded, setFiltersExpanded] = useState(false)

  const toggleType = (value: string) => {
    if (types.includes(value)) {
      onTypesChange(types.filter((v) => v !== value))
    } else {
      onTypesChange([...types, value])
    }
  }

  const toggleStatus = (value: string) => {
    if (statuses.includes(value)) {
      onStatusesChange(statuses.filter((v) => v !== value))
    } else {
      onStatusesChange([...statuses, value])
    }
  }

  const getStatusColor = (status: string, active: boolean) => {
    if (!active) return 'bg-muted text-muted-foreground'
    const s = PROPERTY_STATUSES.find((ps) => ps.value === status)
    switch (s?.color) {
      case 'green':
        return 'bg-green-500/15 text-green-600 border-green-500/30'
      case 'yellow':
        return 'bg-yellow-500/15 text-yellow-600 border-yellow-500/30'
      case 'red':
        return 'bg-red-500/15 text-red-600 border-red-500/30'
      case 'blue':
        return 'bg-blue-500/15 text-blue-600 border-blue-500/30'
      default:
        return 'bg-primary/15 text-primary border-primary/30'
    }
  }

  return (
    <div className="space-y-3">
      {/* Top row: Search + Sort + View toggle + Filter toggle */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 pr-9"
          />
          {search && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Sort dropdown */}
        <div className="relative">
          <div className="flex items-center">
            <ArrowUpDown className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <select
              value={sortBy}
              onChange={(e) => onSortByChange(e.target.value)}
              className="h-8 rounded-lg border border-input bg-transparent pl-8 pr-7 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 appearance-none cursor-pointer"
            >
              <option value="newest">{t('sortNewest')}</option>
              <option value="price_asc">{t('sortPriceAsc')}</option>
              <option value="price_desc">{t('sortPriceDesc')}</option>
              <option value="area_desc">{t('sortAreaDesc')}</option>
              <option value="area_asc">{t('sortAreaAsc')}</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        {/* Grid/List toggle */}
        <div className="flex items-center border border-input rounded-lg overflow-hidden">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8 rounded-none border-0"
            onClick={() => onViewModeChange('grid')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8 rounded-none border-0"
            onClick={() => onViewModeChange('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>

        {/* Filter toggle */}
        <Button
          variant={filtersExpanded ? 'secondary' : 'outline'}
          size="default"
          className="h-8"
          onClick={() => setFiltersExpanded(!filtersExpanded)}
        >
          <SlidersHorizontal className="h-4 w-4 mr-1.5" />
          {t('filters')}
          {hasActiveFilters && (
            <span className="ml-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
          )}
        </Button>
      </div>

      {/* Expandable filter panel */}
      <div
        className={`grid transition-all duration-300 ease-in-out ${
          filtersExpanded
            ? 'grid-rows-[1fr] opacity-100'
            : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <div className="rounded-xl border border-border bg-card p-4 space-y-4">
            {/* Type filter */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                {t('filterType')}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {PROPERTY_TYPES.map((pt) => {
                  const active = types.includes(pt.value)
                  return (
                    <button
                      key={pt.value}
                      onClick={() => toggleType(pt.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        active
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted text-muted-foreground border-transparent hover:bg-muted/80'
                      }`}
                    >
                      {t(pt.labelKey)}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Status filter */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                {t('filterStatus')}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {PROPERTY_STATUSES.map((ps) => {
                  const active = statuses.includes(ps.value)
                  return (
                    <button
                      key={ps.value}
                      onClick={() => toggleStatus(ps.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${getStatusColor(ps.value, active)}`}
                    >
                      {t(ps.labelKey)}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Price range + City + Bedrooms in a row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Price range */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">
                  {t('filterPrice')}
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      R$
                    </span>
                    <input
                      type="number"
                      placeholder={t('priceMin')}
                      value={priceMin ?? ''}
                      onChange={(e) =>
                        onPriceMinChange(
                          e.target.value ? Number(e.target.value) : null,
                        )
                      }
                      className="h-8 w-full rounded-lg border border-input bg-transparent pl-8 pr-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    />
                  </div>
                  <span className="text-muted-foreground text-xs">-</span>
                  <div className="relative flex-1">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      R$
                    </span>
                    <input
                      type="number"
                      placeholder={t('priceMax')}
                      value={priceMax ?? ''}
                      onChange={(e) =>
                        onPriceMaxChange(
                          e.target.value ? Number(e.target.value) : null,
                        )
                      }
                      className="h-8 w-full rounded-lg border border-input bg-transparent pl-8 pr-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    />
                  </div>
                </div>
              </div>

              {/* City */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">
                  {t('filterCity')}
                </label>
                <div className="relative">
                  <select
                    value={city}
                    onChange={(e) => onCityChange(e.target.value)}
                    className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 pr-7 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 appearance-none cursor-pointer"
                  >
                    <option value="">{t('allCities')}</option>
                    {availableCities.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              {/* Min bedrooms */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">
                  {t('filterBedrooms')}
                </label>
                <div className="relative">
                  <select
                    value={minBedrooms ?? ''}
                    onChange={(e) =>
                      onMinBedroomsChange(
                        e.target.value ? Number(e.target.value) : null,
                      )
                    }
                    className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 pr-7 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 appearance-none cursor-pointer"
                  >
                    <option value="">{t('anyBedrooms')}</option>
                    <option value="1">1+</option>
                    <option value="2">2+</option>
                    <option value="3">3+</option>
                    <option value="4">4+</option>
                    <option value="5">5+</option>
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Clear filters */}
            {hasActiveFilters && (
              <div className="pt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive h-7"
                  onClick={onClearFilters}
                >
                  <X className="h-3.5 w-3.5 mr-1" />
                  {t('clearFilters')}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Results count */}
      <p className="text-xs text-muted-foreground">
        {filteredCount === totalCount
          ? t('showingAll', { count: totalCount })
          : t('showingFiltered', { filtered: filteredCount, total: totalCount })}
      </p>
    </div>
  )
}
