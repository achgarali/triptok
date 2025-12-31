'use client'

import { useState, FormEvent } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function NewTripPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [name, setName] = useState('')
  const [destination, setDestination] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [errors, setErrors] = useState<{ name?: string; destination?: string; dates?: string; general?: string }>({})
  const [isLoading, setIsLoading] = useState(false)

  // Redirect to login if not authenticated
  if (status === 'unauthenticated') {
    router.push('/login')
    return null
  }

  const validateForm = (): boolean => {
    const newErrors: { name?: string; destination?: string; dates?: string } = {}

    if (!name.trim()) {
      newErrors.name = 'Le nom du voyage est requis'
    }

    if (!destination.trim()) {
      newErrors.destination = 'La destination est requise'
    }

    // Validate date range if both dates are provided
    if (startDate && endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)
      if (start > end) {
        newErrors.dates = 'La date de fin doit être après la date de début'
      }
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
      const response = await fetch('/api/trips', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          destination: destination.trim(),
          startDate: startDate || null,
          endDate: endDate || null,
          isPublic: false
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.details) {
          // Handle validation errors from server
          const serverErrors: { name?: string; destination?: string; general?: string } = {}
          data.details.forEach((detail: { field: string; message: string }) => {
            if (detail.field === 'name') {
              serverErrors.name = detail.message
            } else if (detail.field === 'destination') {
              serverErrors.destination = detail.message
            }
          })
          setErrors(serverErrors)
        } else {
          setErrors({ general: data.error || 'Une erreur est survenue' })
        }
        setIsLoading(false)
        return
      }

      // Success - redirect to trip detail page
      router.push(`/trips/${data.id}`)
    } catch (error) {
      console.error('Error creating trip:', error)
      setErrors({ general: 'Une erreur est survenue. Veuillez réessayer.' })
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    router.push('/trips')
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white shadow-md rounded-lg p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Créer un nouveau voyage</h1>
          <p className="mt-2 text-sm text-gray-600">
            Remplissez les informations ci-dessous pour créer votre voyage
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
              Nom du voyage <span className="text-red-500">*</span>
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
              placeholder="Ex: Voyage à Paris"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          <div>
            <label htmlFor="destination" className="block text-sm font-medium text-gray-700">
              Destination <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="destination"
              name="destination"
              required
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className={`mt-1 block w-full rounded-md border ${
                errors.destination ? 'border-red-300' : 'border-gray-300'
              } shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2`}
              placeholder="Ex: Paris, France"
            />
            {errors.destination && (
              <p className="mt-1 text-sm text-red-600">{errors.destination}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
                Date de début
              </label>
              <input
                type="date"
                id="startDate"
                name="startDate"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2"
              />
            </div>

            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
                Date de fin
              </label>
              <input
                type="date"
                id="endDate"
                name="endDate"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2"
              />
            </div>
          </div>

          {errors.dates && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-800">{errors.dates}</div>
            </div>
          )}

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
              {isLoading ? 'Création...' : 'Créer le voyage'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

