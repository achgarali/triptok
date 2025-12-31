'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'

// Dynamically import MapView to avoid SSR issues
const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => (
    <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Chargement de la carte...</p>
      </div>
    </div>
  )
})

interface Trip {
  id: string
  name: string
  destination: string
  startDate: string | null
  endDate: string | null
  isPublic: boolean
  slug: string
  createdAt: string
}

interface Place {
  id: string
  name: string
  address: string | null
  lat: number | null
  lng: number | null
  type: string
  dayIndex: number | null
  notes: string | null
  sources: Array<{
    id: string
    platform: string
    url: string
    caption: string | null
    thumbnailUrl: string | null
  }>
}

interface PlacesByDay {
  [key: string]: Place[]
}

const PLACE_TYPE_ICONS: { [key: string]: string } = {
  food: '🍽️',
  bar: '🍺',
  cafe: '☕',
  photo: '📸',
  museum: '🏛️',
  activity: '🎯',
  other: '📍'
}

const PLACE_TYPE_LABELS: { [key: string]: string } = {
  food: 'Restaurant',
  bar: 'Bar',
  cafe: 'Café',
  photo: 'Photo',
  museum: 'Musée',
  activity: 'Activité',
  other: 'Autre'
}

const PLATFORM_ICONS: { [key: string]: string } = {
  tiktok: '🎵',
  instagram: '📷',
  other: '🔗'
}

export default function PublicTripPage() {
  const params = useParams()
  const slug = params.slug as string

  const [trip, setTrip] = useState<Trip | null>(null)
  const [placesByDay, setPlacesByDay] = useState<PlacesByDay>({})
  const [activeTab, setActiveTab] = useState<'planning' | 'map'>('planning')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPublicTrip = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/public/trips/${slug}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Voyage non trouvé ou non accessible publiquement')
        } else {
          throw new Error('Erreur lors du chargement du voyage')
        }
        return
      }

      const data = await response.json()
      setTrip({
        id: data.id,
        name: data.name,
        destination: data.destination,
        startDate: data.startDate,
        endDate: data.endDate,
        isPublic: data.isPublic,
        slug: data.slug,
        createdAt: data.createdAt
      })

      // Group places by day
      const grouped: PlacesByDay = {}
      data.places.forEach((place: Place) => {
        const dayKey = place.dayIndex !== null ? place.dayIndex.toString() : 'unassigned'
        if (!grouped[dayKey]) {
          grouped[dayKey] = []
        }
        grouped[dayKey].push(place)
      })
      setPlacesByDay(grouped)
    } catch (err: any) {
      console.error('Error fetching public trip:', err)
      setError(err.message || 'Une erreur est survenue')
    } finally {
      setIsLoading(false)
    }
  }, [slug])

  useEffect(() => {
    fetchPublicTrip()
  }, [fetchPublicTrip])

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'Non défini'
    const date = new Date(dateString)
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const formatDateRange = (startDate: string | null, endDate: string | null): string => {
    if (!startDate && !endDate) return 'Dates non définies'
    if (!startDate) return `Jusqu'au ${formatDate(endDate)}`
    if (!endDate) return `À partir du ${formatDate(startDate)}`
    return `${formatDate(startDate)} - ${formatDate(endDate)}`
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement du voyage...</p>
        </div>
      </div>
    )
  }

  if (error || !trip) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">{error || 'Voyage non trouvé'}</h3>
                <div className="mt-2">
                  <p className="text-sm text-red-700">
                    Ce voyage n&apos;existe pas ou n&apos;est pas accessible publiquement.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const allPlaces = Object.values(placesByDay).flat()
  const hasPlaces = allPlaces.length > 0

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Trip Header */}
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Public
              </span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">{trip.name}</h1>
            <p className="mt-2 text-lg text-gray-600">{trip.destination}</p>
            <p className="mt-2 text-sm text-gray-500">
              {formatDateRange(trip.startDate, trip.endDate)}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('planning')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'planning'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Planning
          </button>
          <button
            onClick={() => setActiveTab('map')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'map'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Carte
          </button>
        </nav>
      </div>

      {/* Planning Tab */}
      {activeTab === 'planning' && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Lieux</h2>

          {!hasPlaces ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun lieu</h3>
              <p className="mt-1 text-sm text-gray-500">
                Ce voyage ne contient pas encore de lieux.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(placesByDay)
                .sort((a, b) => {
                  if (a[0] === 'unassigned') return 1
                  if (b[0] === 'unassigned') return -1
                  return parseInt(a[0]) - parseInt(b[0])
                })
                .map(([dayKey, places]) => (
                  <div key={dayKey} className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      {dayKey === 'unassigned' ? 'Non assignés' : `Jour ${dayKey}`}
                    </h3>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {places.map((place) => (
                        <div key={place.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start">
                            <div className="flex-1">
                              <div className="flex items-center">
                                <span className="text-2xl mr-2">{PLACE_TYPE_ICONS[place.type] || '📍'}</span>
                                <div>
                                  <h4 className="text-sm font-medium text-gray-900">{place.name}</h4>
                                  <p className="text-xs text-gray-500">{PLACE_TYPE_LABELS[place.type] || place.type}</p>
                                </div>
                              </div>
                              {place.address && (
                                <p className="mt-2 text-sm text-gray-600">{place.address}</p>
                              )}
                              {place.notes && (
                                <p className="mt-2 text-sm text-gray-500 italic">{place.notes}</p>
                              )}
                              {place.sources && place.sources.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-gray-200">
                                  <p className="text-xs font-medium text-gray-700 mb-2">Vidéos :</p>
                                  <div className="space-y-1">
                                    {place.sources.map((source) => (
                                      <a
                                        key={source.id}
                                        href={source.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center text-xs text-blue-600 hover:text-blue-800"
                                      >
                                        <span className="mr-1">{PLATFORM_ICONS[source.platform] || '🔗'}</span>
                                        <span className="truncate">{source.caption || source.url}</span>
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Map Tab */}
      {activeTab === 'map' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Carte des lieux</h2>
          <MapView places={allPlaces} />
        </div>
      )}
    </div>
  )
}

