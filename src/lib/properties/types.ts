export interface Property {
  id: string
  user_id: string
  code: string | null
  title: string
  description: string | null
  type: string
  status: string
  price: number
  address: string | null
  neighborhood: string | null
  city: string | null
  specs: Record<string, any>
  features: string[]
  photos: string[]
  created_at: string
}

export interface PropertyFormData {
  code: string
  title: string
  description: string
  type: string
  status: string
  price: number
  address: string
  neighborhood: string
  city: string
  specs: Record<string, any>
  features: string[]
  photos: string[]
}

export const PROPERTY_TYPES = [
  { value: 'apartment', labelKey: 'typeApartment' },
  { value: 'house', labelKey: 'typeHouse' },
  { value: 'condo', labelKey: 'typeCondo' },
  { value: 'land', labelKey: 'typeLand' },
  { value: 'commercial', labelKey: 'typeCommercial' },
  { value: 'farm', labelKey: 'typeFarm' },
]

export const PROPERTY_STATUSES = [
  { value: 'available', labelKey: 'statusAvailable', color: 'green' },
  { value: 'reserved', labelKey: 'statusReserved', color: 'yellow' },
  { value: 'sold', labelKey: 'statusSold', color: 'red' },
  { value: 'rented', labelKey: 'statusRented', color: 'blue' },
]
