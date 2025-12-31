'use client'

import { useState, FormEvent, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

const PLACE_TYPES = [
  { value: 'food', label: 'Restaurant', icon: '🍽️' },
  { value: 'bar', label: 'Bar', icon: '🍺' },
  { value: 'cafe', label: 'Café', icon: '☕' },
  { value: 'photo', label: 'Photo', icon: '📸' },
  { value: 'museum', label: 'Musée', icon: '🏛️' },
  { value: 'activity', label: 'Activité', icon: '🎯' },
  { value: 'other', label: 'Autre', icon: '📍' }
]

interface Place {
  id: string
  name: string
  address: string | null
  lat: number | null
  lng: number | null
  type: string
  dayIndex: number | null
  notes: string | null
}

export default function EditPlacePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const tripId = params.id as string
  const placeId = params.placeId as string

  const [place, setPlace] = useState<Place | null>(null)
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [type, setType] = useState<'food' | 'bar' | 'cafe' | 'photo' | 'museum' | 'activity' | 'other'>('other')
  const [dayIndex, setDayIndex] = useState<string>('')
  const [notes, setNotes] = useState('')
  const [lat, setLat] = useState<string>('')
  const [lng, setLng] = useState<string>('')
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)

  const fetchPlace = useCallback(async () => {
    try {
      setIsFetching(true)
      // We need to get the place from the trip's places
      const response = await fetch(`/api/trips/${tripId}/places`)
      
      if (!response.ok) {
        throw new Error('Erreur lors du chargement du lieu')
      }

      const placesByDay = await response.json()
      const allPlaces = Object.values(placesByDay).flat() as Place[]
      const foundPlace = allPlaces.find((p: Place) => p.id === placeId)

      if (!foundPlace) {
        throw new Error('Lieu non trouvé')
      }

      setPlace(foundPlace)
      setName(foundPlace.name)
      setAddress(foundPlace.address || '')
      setType(foundPlace.type as any)
      setDayIndex(foundPlace.dayIndex?.toString() || '')
      setNotes(foundPlace.notes || '')
      setLat(foundPlace.lat?.toString() || '')
      setLng(foundPlace.lng?.toString() || '')
    } catch (err: any) {
      console.error('Error fetching place:', err)
      setErrors({ general: err.message || 'Une erreur est survenue' })
    } finally {
      setIsFetching(false)
    }
  }, [tripId, placeId])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }

    if (status === 'authenticated') {
      fetchPlace()
    }
  }, [status, router, fetchPlace])

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {}

    if (!name.trim()) {
      newErrors.name = 'Le nom du lieu est requis'
    }

    if (!type) {
      newErrors.type = 'Le type de lieu est requis'
    }

    // Validate coordinates if provided
    if (lat && (isNaN(parseFloat(lat)) || parseFloat(lat) < -90 || parseFloat(lat) > 90)) {
      newErrors.lat = 'La latitude doit être entre -90 et 90'
    }

    if (lng && (isNaN(parseFloat(lng)) || parseFloat(lng) < -180 || parseFloat(lng) > 180)) {
      newErrors.lng = 'La longitude doit être entre -180 et 180'
    }

    // If one coordinate is provided, both should be
    if ((lat && !lng) || (!lat && lng)) {
      newErrors.coordinates = 'Les deux coordonnées (latitude et longitude) doivent être fournies ensemble'
    }

    if (dayIndex && (isNaN(parseInt(dayIndex)) || parseInt(dayIndex) < 1)) {
      newErrors.dayIndex = 'Le numéro de jour doit être un nombre positif'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return false
    }

    return true
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrors({})

    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(`/api/places/${placeId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          address: address.trim() || null,
          type,
          dayIndex: dayIndex ? parseInt(dayIndex) : null,
          notes: notes.trim() || null,
          lat: lat ? parseFloat(lat) : null,
          lng: lng ? parseFloat(lng) : null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.details) {
          const serverErrors: { [key: string]: string } = {}
          data.details.forEach((detail: { field: string; message: string }) => {
            serverErrors[detail.field] = detail.message
          })
          setErrors(serverErrors)
        } else {
          setErrors({ general: data.error || 'Une erreur est survenue' })
        }
        setIsLoading(false)
        return
      }

      // Success - redirect to trip detail page
      router.push(`/trips/${tripId}`)
    } catch (error) {
      console.error('Error updating place:', error)
      setErrors({ general: 'Une erreur est survenue. Veuillez réessayer.' })
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    router.push(`/trips/${tripId}`)
  }

  if (status === 'loading' || isFetching) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement du lieu...</p>
        </div>
      </div>
    )
  }

  if (errors.general && !place) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow-md rounded-lg p-6">
          <div className="rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-800">{errors.general}</div>
            <div className="mt-2">
              <Link
                href={`/trips/${tripId}`}
                className="text-sm text-red-800 underline hover:text-red-900"
              >
                Retour au voyage
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white shadow-md rounded-lg p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Modifier le lieu</h1>
          <p className="mt-2 text-sm text-gray-600">
            Modifiez les informations de ce lieu
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {errors.general && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-800">{errors.general}</div>
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Nom du lieu <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`mt-1 block w-full rounded-md border ${
                errors.name ? 'border-red-300' : 'border-gray-300'
              } shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2`}
              placeholder="Ex: Tour Eiffel"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700">
              Type de lieu <span className="text-red-500">*</span>
            </label>
            <select
              id="type"
              name="type"
              required
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className={`mt-1 block w-full rounded-md border ${
                errors.type ? 'border-red-300' : 'border-gray-300'
              } shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2`}
            >
              {PLACE_TYPES.map((pt) => (
                <option key={pt.value} value={pt.value}>
                  {pt.icon} {pt.label}
                </option>
              ))}
            </select>
            {errors.type && (
              <p className="mt-1 text-sm text-red-600">{errors.type}</p>
            )}
          </div>

          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-700">
              Adresse
            </label>
            <input
              type="text"
              id="address"
              name="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2"
              placeholder="Ex: 5 Avenue Anatole France, 75007 Paris"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="lat" className="block text-sm font-medium text-gray-700">
                Latitude
              </label>
              <input
                type="number"
                step="any"
                id="lat"
                name="lat"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                className={`mt-1 block w-full rounded-md border ${
                  errors.lat || errors.coordinates ? 'border-red-300' : 'border-gray-300'
                } shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2`}
                placeholder="Ex: 48.8584"
              />
              {errors.lat && (
                <p className="mt-1 text-sm text-red-600">{errors.lat}</p>
              )}
            </div>

            <div>
              <label htmlFor="lng" className="block text-sm font-medium text-gray-700">
                Longitude
              </label>
              <input
                type="number"
                step="any"
                id="lng"
                name="lng"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                className={`mt-1 block w-full rounded-md border ${
                  errors.lng || errors.coordinates ? 'border-red-300' : 'border-gray-300'
                } shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2`}
                placeholder="Ex: 2.2945"
              />
              {errors.lng && (
                <p className="mt-1 text-sm text-red-600">{errors.lng}</p>
              )}
            </div>
          </div>

          {errors.coordinates && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-800">{errors.coordinates}</div>
            </div>
          )}

          <div>
            <label htmlFor="dayIndex" className="block text-sm font-medium text-gray-700">
              Jour du voyage
            </label>
            <input
              type="number"
              min="1"
              id="dayIndex"
              name="dayIndex"
              value={dayIndex}
              onChange={(e) => setDayIndex(e.target.value)}
              className={`mt-1 block w-full rounded-md border ${
                errors.dayIndex ? 'border-red-300' : 'border-gray-300'
              } shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2`}
              placeholder="Ex: 1 (laissez vide si non assigné)"
            />
            {errors.dayIndex && (
              <p className="mt-1 text-sm text-red-600">{errors.dayIndex}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Laissez vide si le lieu n&apos;est pas encore assigné à un jour spécifique
            </p>
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2"
              placeholder="Ajoutez des notes sur ce lieu..."
            />
          </div>

          <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isLoading}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Mise à jour...' : 'Enregistrer les modifications'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

