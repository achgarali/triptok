'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useToast } from '@/components/ToastProvider'

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
  createdAt: string
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

export default function TripDetailPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const tripId = params.id as string
  const { showToast } = useToast()

  const [trip, setTrip] = useState<Trip | null>(null)
  const [placesByDay, setPlacesByDay] = useState<PlacesByDay>({})
  const [activeTab, setActiveTab] = useState<'planning' | 'map'>('planning')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [placesPerPage] = useState(20)
  const [totalPlaces, setTotalPlaces] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  
  // Itinerary suggestions
  const [itinerarySuggestions, setItinerarySuggestions] = useState<any[]>([])
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)

  const fetchTrip = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/trips/${tripId}`)
      
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login')
          return
        }
        if (response.status === 404) {
          setError('Voyage non trouvé')
          return
        }
        throw new Error('Erreur lors du chargement du voyage')
      }

      const data = await response.json()
      setTrip(data)
    } catch (err: any) {
      console.error('Error fetching trip:', err)
      setError(err.message || 'Une erreur est survenue')
    } finally {
      setIsLoading(false)
    }
  }, [tripId, router])

  const fetchPlaces = useCallback(async (page: number = currentPage) => {
    try {
      const response = await fetch(`/api/trips/${tripId}/places?page=${page}&limit=${placesPerPage}`)
      
      if (!response.ok) {
        return
      }

      const data = await response.json()
      
      // Check if response has pagination metadata
      if (data.places && typeof data.total === 'number') {
        setPlacesByDay(data.places)
        setTotalPlaces(data.total)
        setTotalPages(data.totalPages)
        setCurrentPage(data.page)
      } else {
        // Backward compatibility: if no pagination metadata, treat as all places
        setPlacesByDay(data)
        const allPlacesCount = Object.values(data).flat().length
        setTotalPlaces(allPlacesCount)
        setTotalPages(1)
      }
    } catch (err) {
      console.error('Error fetching places:', err)
    }
  }, [tripId, placesPerPage, currentPage])

  const fetchItinerarySuggestions = useCallback(async () => {
    try {
      setIsLoadingSuggestions(true)
      console.log('Fetching suggestions for trip:', tripId)
      const response = await fetch(`/api/trips/${tripId}/suggest-itinerary`)
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Erreur inconnue' }))
        console.error('Error fetching suggestions:', error)
        showToast('Erreur lors de la récupération des suggestions', 'error')
        return
      }

      const suggestions = await response.json()
      console.log('Suggestions received:', suggestions)
      setItinerarySuggestions(suggestions)
      setShowSuggestions(true)
      
      if (suggestions.length === 0) {
        showToast('Aucune suggestion disponible. Tous vos lieux sont déjà assignés ou vous n\'avez pas de lieux avec coordonnées.', 'info')
      }
    } catch (err) {
      console.error('Error fetching suggestions:', err)
      showToast('Erreur lors de la récupération des suggestions', 'error')
    } finally {
      setIsLoadingSuggestions(false)
    }
  }, [tripId, showToast])

  const applySuggestion = async (suggestion: any) => {
    try {
      // Update each place with the suggested day
      for (const place of suggestion.places) {
        await fetch(`/api/places/${place.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            dayIndex: suggestion.day,
          }),
        })
      }

      showToast(`Itinéraire du jour ${suggestion.day} appliqué avec succès`, 'success')
      fetchPlaces(currentPage)
      fetchItinerarySuggestions() // Refresh suggestions
    } catch (err: any) {
      console.error('Error applying suggestion:', err)
      showToast('Erreur lors de l\'application de la suggestion', 'error')
    }
  }

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }

    if (status === 'authenticated') {
      fetchTrip()
      fetchPlaces()
    }
  }, [status, router, fetchTrip, fetchPlaces])

  const handleDeleteTrip = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce voyage ? Cette action est irréversible.')) {
      return
    }

    try {
      setIsDeleting(true)
      const response = await fetch(`/api/trips/${tripId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression')
      }

      showToast('Voyage supprimé avec succès', 'success')
      router.push('/trips')
    } catch (err: any) {
      console.error('Error deleting trip:', err)
      showToast('Erreur lors de la suppression du voyage', 'error')
      setIsDeleting(false)
    }
  }

  const handleTogglePublic = async () => {
    if (!trip) return

    try {
      const response = await fetch(`/api/trips/${tripId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isPublic: !trip.isPublic
        }),
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour')
      }

      const updatedTrip = await response.json()
      setTrip(updatedTrip)
      showToast(
        updatedTrip.isPublic ? 'Voyage rendu public' : 'Voyage rendu privé',
        'success'
      )
    } catch (err: any) {
      console.error('Error updating trip:', err)
      showToast('Erreur lors de la mise à jour du voyage', 'error')
    }
  }

  const handleCopyLink = async () => {
    if (!trip) return

    const publicUrl = `${window.location.origin}/public/${trip.slug}`
    
    try {
      await navigator.clipboard.writeText(publicUrl)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 3000)
    } catch (err) {
      console.error('Error copying link:', err)
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = publicUrl
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 3000)
    }
  }

  const handleDeletePlace = async (placeId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce lieu ?')) {
      return
    }

    try {
      const response = await fetch(`/api/places/${placeId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression')
      }

      // Refresh places (stay on current page)
      fetchPlaces(currentPage)
      showToast('Lieu supprimé avec succès', 'success')
    } catch (err: any) {
      console.error('Error deleting place:', err)
      showToast('Erreur lors de la suppression du lieu', 'error')
    }
  }

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

  if (status === 'loading' || isLoading) {
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
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-800">{error || 'Voyage non trouvé'}</div>
          <div className="mt-2">
            <Link
              href="/trips"
              className="text-sm text-red-800 underline hover:text-red-900"
            >
              Retour à la liste des voyages
            </Link>
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
            <h1 className="text-3xl font-bold text-gray-900">{trip.name}</h1>
            <p className="mt-2 text-lg text-gray-600">{trip.destination}</p>
            <p className="mt-2 text-sm text-gray-500">
              {formatDateRange(trip.startDate, trip.endDate)}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={trip.isPublic}
                  onChange={handleTogglePublic}
                  className="sr-only"
                />
                <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  trip.isPublic ? 'bg-green-500' : 'bg-gray-300'
                }`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    trip.isPublic ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </div>
                <span className="ml-3 text-sm text-gray-700">
                  {trip.isPublic ? 'Public' : 'Privé'}
                </span>
              </label>
            </div>
            {trip.isPublic && (
              <div className="flex items-center space-x-2">
                <div className="flex items-center bg-gray-50 border border-gray-300 rounded-md px-3 py-2">
                  <input
                    type="text"
                    readOnly
                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}/public/${trip.slug}`}
                    className="text-sm text-gray-700 bg-transparent border-none outline-none min-w-0 flex-1"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <button
                    onClick={handleCopyLink}
                    className="ml-2 text-blue-600 hover:text-blue-800 focus:outline-none"
                    title="Copier le lien"
                  >
                    {linkCopied ? (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                </div>
                {linkCopied && (
                  <span className="text-sm text-green-600">Lien copié !</span>
                )}
              </div>
            )}
            <button
              onClick={handleDeleteTrip}
              disabled={isDeleting}
              className="px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
            >
              {isDeleting ? 'Suppression...' : 'Supprimer'}
            </button>
          </div>
        </div>
      </div>

      {/* Itinerary Suggestions */}
      {hasPlaces && (
        <div className="mb-6">
          {!showSuggestions ? (
            <button
              onClick={fetchItinerarySuggestions}
              disabled={isLoadingSuggestions}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
            >
              {isLoadingSuggestions ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Chargement...
                </>
              ) : (
                <>
                  <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Obtenir des suggestions d&apos;itinéraire
                </>
              )}
            </button>
          ) : (
            <>
              {itinerarySuggestions.length > 0 ? (
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-6 border border-purple-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  💡 Suggestions d&apos;itinéraire
                </h3>
                <button
                  onClick={() => setShowSuggestions(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Basé sur vos lieux non assignés, voici des suggestions d&apos;itinéraires optimisés par proximité.
              </p>
              <div className="space-y-3">
                {itinerarySuggestions.map((suggestion) => (
                  <div
                    key={suggestion.day}
                    className="bg-white rounded-lg p-4 border border-purple-200 shadow-sm"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg font-semibold text-purple-600">
                            Jour {suggestion.day}
                          </span>
                          <span className="text-sm text-gray-500">
                            ~{suggestion.estimatedDuration}h
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{suggestion.description}</p>
                        <div className="flex flex-wrap gap-2">
                          {suggestion.places.map((place: Place) => (
                            <span
                              key={place.id}
                              className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-purple-100 text-purple-800"
                            >
                              {PLACE_TYPE_ICONS[place.type] || '📍'} {place.name}
                            </span>
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={() => applySuggestion(suggestion)}
                        className="ml-4 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                      >
                        Appliquer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
              ) : (
                <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-yellow-800 mb-1">
                        Aucune suggestion disponible
                      </h3>
                      <p className="text-sm text-yellow-700">
                        Tous vos lieux sont déjà assignés à des jours, ou vous n&apos;avez pas de lieux avec des coordonnées géographiques.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowSuggestions(false)}
                      className="ml-4 text-yellow-400 hover:text-yellow-600"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

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
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Lieux</h2>
            <Link
              href={`/trips/${tripId}/places/new`}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Ajouter un lieu
            </Link>
          </div>

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
                Commencez par ajouter des lieux à votre voyage.
              </p>
              <div className="mt-6">
                <Link
                  href={`/trips/${tripId}/places/new`}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  Ajouter un lieu
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Pagination Info */}
              {totalPlaces > 0 && (
                <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600">
                    Affichage de {Object.values(placesByDay).flat().length} lieu(x) sur {totalPlaces} total
                  </div>
                  {totalPages > 1 && (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          const newPage = currentPage - 1
                          if (newPage >= 1) {
                            fetchPlaces(newPage)
                          }
                        }}
                        disabled={currentPage === 1}
                        className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Précédent
                      </button>
                      <span className="text-sm text-gray-700">
                        Page {currentPage} sur {totalPages}
                      </span>
                      <button
                        onClick={() => {
                          const newPage = currentPage + 1
                          if (newPage <= totalPages) {
                            fetchPlaces(newPage)
                          }
                        }}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Suivant
                      </button>
                    </div>
                  )}
                </div>
              )}
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
                        <div key={place.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between">
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
                            </div>
                            <div className="flex space-x-2 ml-4">
                              <Link
                                href={`/trips/${tripId}/places/${place.id}/edit`}
                                className="text-blue-600 hover:text-blue-800"
                                title="Modifier"
                              >
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </Link>
                              <button
                                onClick={() => handleDeletePlace(place.id)}
                                className="text-red-600 hover:text-red-800"
                                title="Supprimer"
                              >
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
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

