import { useEffect, useMemo, useRef, useState } from 'react'
import type { Map as LeafletMap } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { categoryStickers, type Meeting, type Photo } from '../data/models'
import { routePoints } from '../data/route'
export default function RouteMap({ meeting, photos }: { meeting: Meeting; photos: Photo[] }) {
  const [open, setOpen] = useState(false), [tileError, setTileError] = useState(false), [error, setError] = useState('')
  const container = useRef<HTMLDivElement>(null)
  const points = useMemo(() => routePoints(photos, meeting.expenses), [photos, meeting.expenses])
  useEffect(() => {
    if (!open || !container.current || !points.length) return
    let canceled = false, instance: LeafletMap | undefined
    setTileError(false); setError('')
    void import('leaflet').then(L => {
      if (canceled || !container.current) return
      const coordinates: [number, number][] = points.map(p => [p.latitude, p.longitude])
      instance = L.map(container.current, { scrollWheelZoom: false, zoomControl: true })
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors', maxZoom: 19,
      }).on('tileerror', () => { if (!canceled) setTileError(true) }).addTo(instance)
      L.polyline(coordinates, { color: '#637f53', weight: 3, dashArray: '5 8', opacity: .7 }).addTo(instance)
      points.forEach((p, i) => {
        const popup = document.createElement('div')
        popup.textContent = `${i + 1}. ${p.label}`
        L.marker([p.latitude, p.longitude], { title: `${i + 1}. ${p.label}`, icon: L.divIcon({ className: 'sticker-marker', html: `<span>${categoryStickers[p.category]}</span><small>${i + 1}</small>`, iconSize: [42, 42], iconAnchor: [21, 35] }) }).bindPopup(popup).addTo(instance!)
      })
      if (coordinates.length === 1) instance.setView(coordinates[0], 15)
      else instance.fitBounds(L.latLngBounds(coordinates), { padding: [40, 40], maxZoom: 16 })
      instance.invalidateSize()
    }).catch(() => { if (!canceled) setError('지도를 불러오지 못했어요. 아래 장소 목록에서 추억을 확인해 주세요.') })
    return () => { canceled = true; instance?.remove() }
  }, [open, points])
  return <details className="route-details" onToggle={e => setOpen(e.currentTarget.open)}><summary>그날, 우리가 걸었던 곳 <span>🗺 {points.length}곳 ▾</span></summary>{open && <><p className="hint">사진의 GPS를 시간순으로 이은 선이에요. 실제 길 찾기 경로와는 다를 수 있어요.</p>{points.length ? <><div className="route-map" ref={container} role="region" aria-label={`${meeting.title} 사진 동선 지도`} />{tileError && <p className="hint" role="status">지도 배경을 불러오지 못했어요. 사진 위치와 장소 목록은 그대로 볼 수 있어요.</p>}{error && <p role="alert" className="error">{error}</p>}<ol className="route-stops">{points.map((p, i) => <li key={i}>{categoryStickers[p.category]} {p.label}</li>)}</ol></> : <p className="map-empty">아직 위치가 담긴 사진이 없어요.<br />GPS가 있는 사진을 올리면 동선이 나타나요.</p>}</>}</details>
}
