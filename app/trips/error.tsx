'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function TripsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Trips page error:', error)
  }, [error])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-red-800">
                Erreur lors du chargement des voyages
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>
                  Une erreur s&apos;est produite lors du chargement de vos voyages.
                  Veuillez réessayer.
                </p>
              </div>
              <div className="mt-4 flex space-x-3">
                <button
                  onClick={reset}
                  className="text-sm font-medium text-red-800 hover:text-red-900 underline"
                >
                  Réessayer
                </button>
                <Link
                  href="/"
                  className="text-sm font-medium text-red-800 hover:text-red-900 underline"
                >
                  Retour à l&apos;accueil
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

