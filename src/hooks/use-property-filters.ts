import { useState, useMemo } from 'react'
import type { Property } from '@/lib/properties/types'

interface PropertyFiltersState {
  search: string
  types: string[]
  statuses: string[]
  priceMin: number | null
  priceMax: number | null
  city: string
  minBedrooms: number | null
  sortBy: 'newest' | 'price_asc' | 'price_desc' | 'area_desc' | 'area_asc'
  viewMode: 'grid' | 'list'
}

interface UsePropertyFiltersReturn {
  filters: PropertyFiltersState
  setSearch: (s: string) => void
  setTypes: (t: string[]) => void
  setStatuses: (s: string[]) => void
  setPriceMin: (p: number | null) => void
  setPriceMax: (p: number | null) => void
  setCity: (c: string) => void
  setMinBedrooms: (n: number | null) => void
  setSortBy: (s: PropertyFiltersState['sortBy']) => void
  setViewMode: (m: 'grid' | 'list') => void
  clearFilters: () => void
  hasActiveFilters: boolean
  filteredProperties: Property[]
  availableCities: string[]
}

const DEFAULTFilters: PropertyFiltersState = {
  search: '',
  types: [],
  statuses: [],
  priceMin: null,
  priceMax: null,
  city: '',
  minBedrooms: null,
  sortBy: 'newest',
  viewMode: 'grid',
}

export function usePropertyFilters(properties: Property[]): UsePropertyFiltersReturn {
  const [filters, setFilters] = useState<PropertyFiltersState>(DEFAULTFilters)

  const setSearch = (search: string) => setFilters((prev) => ({ ...prev, search }))
  const setTypes = (types: string[]) => setFilters((prev) => ({ ...prev, types }))
  const setStatuses = (statuses: string[]) => setFilters((prev) => ({ ...prev, statuses }))
  const setPriceMin = (priceMin: number | null) => setFilters((prev) => ({ ...prev, priceMin }))
  const setPriceMax = (priceMax: number | null) => setFilters((prev) => ({ ...prev, priceMax }))
  const setCity = (city: string) => setFilters((prev) => ({ ...prev, city }))
  const setMinBedrooms = (minBedrooms: number | null) => setFilters((prev) => ({ ...prev, minBedrooms }))
  const setSortBy = (sortBy: PropertyFiltersState['sortBy']) => setFilters((prev) => ({ ...prev, sortBy }))
  const setViewMode = (viewMode: 'grid' | 'list') => setFilters((prev) => ({ ...prev, viewMode }))

  const clearFilters = () => setFilters(DEFAULTFilters)

  const hasActiveFilters = useMemo(() => {
    return (
      filters.search !== '' ||
      filters.types.length > 0 ||
      filters.statuses.length > 0 ||
      filters.priceMin !== null ||
      filters.priceMax !== null ||
      filters.city !== '' ||
      filters.minBedrooms !== null ||
      filters.sortBy !== 'newest'
    )
  }, [filters])

  const availableCities = useMemo(() => {
    const cities = properties
      .map((p) => p.city)
      .filter((c): c is string => c !== null && c !== undefined)
    return [...new Set(cities)].sort()
  }, [properties])

  const filteredProperties = useMemo(() => {
    let result = [...properties]

    // Busca por texto em título, endereço e bairro
    if (filters.search) {
      const query = filters.search.toLowerCase()
      result = result.filter((p) => {
        const title = p.title.toLowerCase()
        const address = p.address?.toLowerCase() ?? ''
        const neighborhood = p.neighborhood?.toLowerCase() ?? ''
        return title.includes(query) || address.includes(query) || neighborhood.includes(query)
      })
    }

    // Filtro por tipo
    if (filters.types.length > 0) {
      result = result.filter((p) => filters.types.includes(p.type))
    }

    // Filtro por status
    if (filters.statuses.length > 0) {
      result = result.filter((p) => filters.statuses.includes(p.status))
    }

    // Filtro por faixa de preço
    if (filters.priceMin !== null) {
      result = result.filter((p) => p.price >= filters.priceMin!)
    }
    if (filters.priceMax !== null) {
      result = result.filter((p) => p.price <= filters.priceMax!)
    }

    // Filtro por cidade (correspondência exata)
    if (filters.city) {
      result = result.filter((p) => p.city === filters.city)
    }

    // Filtro por mínimo de quartos
    if (filters.minBedrooms !== null) {
      result = result.filter((p) => {
        const bedrooms = p.specs?.bedrooms
        return typeof bedrooms === 'number' && bedrooms >= filters.minBedrooms!
      })
    }

    // Ordenação
    result.sort((a, b) => {
      switch (filters.sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'price_asc':
          return a.price - b.price
        case 'price_desc':
          return b.price - a.price
        case 'area_asc':
          return (a.specs?.area ?? 0) - (b.specs?.area ?? 0)
        case 'area_desc':
          return (b.specs?.area ?? 0) - (a.specs?.area ?? 0)
        default:
          return 0
      }
    })

    return result
  }, [properties, filters])

  return {
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
  }
}
