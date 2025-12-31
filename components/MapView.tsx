'use client'

import { useEffect, useMemo, memo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix for default marker icons in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

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

interface MapViewProps {
  places: Place[]
  center?: [number, number]
  zoom?: number
}

// Component to fit map bounds to markers
const FitBounds = memo(function FitBounds({ places }: { places: Place[] }) {
  const map = useMap()
  const placesWithCoords = useMemo(
    () => places.filter(p => p.lat !== null && p.lng !== null),
    [places]
  )

  useEffect(() => {
    if (placesWithCoords.length > 0) {
      const bounds = L.latLngBounds(
        placesWithCoords.map(p => [p.lat!, p.lng!] as [number, number])
      )
      map.fitBounds(bounds, { padding: [50, 50] })
    }
  }, [map, placesWithCoords])

  return null
})

const PLACE_TYPE_COLORS: { [key: string]: string } = {
  food: '#FF6B6B',
  bar: '#4ECDC4',
  cafe: '#95E1D3',
  photo: '#F38181',
  museum: '#AA96DA',
  activity: '#FCBAD3',
  other: '#6C757D'
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

// Custom marker icon with color
function createCustomIcon(color: string) {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background-color: ${color}; width: 30px; height: 30px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30]
  })
}

function MapView({ places, center = [48.8566, 2.3522], zoom = 13 }: MapViewProps) {
  const placesWithCoords = useMemo(
    () => places.filter(p => p.lat !== null && p.lng !== null),
    [places]
  )

  const mapCenter: [number, number] = useMemo(() => {
    if (center) return center
    if (placesWithCoords.length === 0) return [48.8566, 2.3522]
    const avgLat = placesWithCoords.reduce((sum, p) => sum + p.lat!, 0) / placesWithCoords.length
    const avgLng = placesWithCoords.reduce((sum, p) => sum + p.lng!, 0) / placesWithCoords.length
    return [avgLat, avgLng]
  }, [center, placesWithCoords])

  const markers = useMemo(() => {
    return placesWithCoords.map((place) => {
      const color = PLACE_TYPE_COLORS[place.type] || PLACE_TYPE_COLORS.other
      const icon = createCustomIcon(color)
      return { place, icon, color }
    })
  }, [placesWithCoords])

  if (placesWithCoords.length === 0) {
    return (
      <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center">
        <p className="text-gray-600">Aucun lieu avec coordonnées à afficher sur la carte.</p>
      </div>
    )
  }

  return (
    <div className="h-96 w-full rounded-lg overflow-hidden">
      <MapContainer
        center={mapCenter}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds places={placesWithCoords} />
        {markers.map(({ place, icon }) => (
          <Marker
            key={place.id}
            position={[place.lat!, place.lng!]}
            icon={icon}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-semibold text-gray-900 mb-1">{place.name}</h3>
                <p className="text-sm text-gray-600 mb-1">
                  <span className="font-medium">{PLACE_TYPE_LABELS[place.type] || place.type}</span>
                  {place.dayIndex !== null && (
                    <span className="ml-2 text-gray-500">• Jour {place.dayIndex}</span>
                  )}
                </p>
                {place.address && (
                  <p className="text-xs text-gray-500 mb-1">{place.address}</p>
                )}
                {place.notes && (
                  <p className="text-xs text-gray-500 italic">{place.notes}</p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}

export default memo(MapView)

