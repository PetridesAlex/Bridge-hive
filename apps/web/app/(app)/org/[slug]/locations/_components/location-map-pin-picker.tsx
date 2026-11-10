'use client';

import { MapPin, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  MapContainer,
  Marker,
  TileLayer,
  useMapEvents,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

/** Cyprus overview — used only while choosing a pin, never as a fake workplace. */
const CYPRUS_CENTER: [number, number] = [35.1264, 33.4299];
const CYPRUS_OVERVIEW_ZOOM = 8;
const STREET_ZOOM = 16;

const tealPin = L.divIcon({
  className: '',
  html: `<span style="display:block;width:18px;height:18px;border-radius:999px;background:#14A9B5;border:2.5px solid #0B2A43;box-shadow:0 2px 8px rgba(11,42,67,0.35);"></span>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function ClickToPin({
  onPick,
}: {
  onPick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function FlyToPin({
  position,
  hasPin,
}: {
  position: [number, number];
  hasPin: boolean;
}) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(position, hasPin ? STREET_ZOOM : CYPRUS_OVERVIEW_ZOOM, {
      duration: 0.55,
    });
  }, [hasPin, map, position]);
  return null;
}

function parseCoord(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : undefined;
}

export function LocationMapPinPicker({
  initialLatitude,
  initialLongitude,
}: {
  initialLatitude?: number | null;
  initialLongitude?: number | null;
}) {
  const initialPair =
    typeof initialLatitude === 'number' &&
    typeof initialLongitude === 'number' &&
    Number.isFinite(initialLatitude) &&
    Number.isFinite(initialLongitude)
      ? ({ lat: initialLatitude, lng: initialLongitude } as const)
      : null;

  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(initialPair);
  const [latText, setLatText] = useState(
    initialPair ? String(initialPair.lat) : '',
  );
  const [lngText, setLngText] = useState(
    initialPair ? String(initialPair.lng) : '',
  );

  const mapCenter = useMemo<[number, number]>(
    () => (pin ? [pin.lat, pin.lng] : CYPRUS_CENTER),
    [pin],
  );

  function applyPin(lat: number, lng: number) {
    const next = {
      lat: Math.round(lat * 1e6) / 1e6,
      lng: Math.round(lng * 1e6) / 1e6,
    };
    setPin(next);
    setLatText(String(next.lat));
    setLngText(String(next.lng));
  }

  function clearPin() {
    setPin(null);
    setLatText('');
    setLngText('');
  }

  function syncFromInputs() {
    const lat = parseCoord(latText);
    const lng = parseCoord(lngText);
    if (lat === undefined && lng === undefined) {
      clearPin();
      return;
    }
    if (lat === undefined || lng === undefined) return;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return;
    applyPin(lat, lng);
  }

  const labelClass = 'text-[11px] font-semibold uppercase tracking-[0.08em] text-bh-text-muted';
  const fieldClass =
    'h-11 rounded-xl border-bh-border/80 bg-white shadow-[0_1px_2px_rgba(7,29,48,0.03)] focus-visible:border-bh-teal focus-visible:ring-bh-teal/25';

  return (
    <div className="space-y-3 rounded-2xl border border-bh-border/70 bg-[#f7fafc]/70 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-bh-navy text-white">
              <MapPin className="h-4 w-4" aria-hidden />
            </span>
            <Label className={cn(labelClass, 'normal-case tracking-normal text-bh-navy')}>
              Workplace map pin
            </Label>
          </div>
          <p className="max-w-xl text-sm text-bh-text-secondary">
            Tap the map to place the hospital or clinic pin. Cyprus overview is
            only for choosing — the saved pin is the workplace. Leave empty if
            you only have an address.
          </p>
        </div>
        {pin ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0 rounded-xl text-bh-text-muted"
            onClick={clearPin}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
            Clear pin
          </Button>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-2xl border border-bh-border/80 bg-white shadow-[0_8px_24px_rgba(7,29,48,0.06)]">
        <div className="h-[220px] w-full">
          <MapContainer
            center={mapCenter}
            zoom={pin ? STREET_ZOOM : CYPRUS_OVERVIEW_ZOOM}
            scrollWheelZoom
            className="h-full w-full"
            attributionControl
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <ClickToPin onPick={applyPin} />
            <FlyToPin position={mapCenter} hasPin={Boolean(pin)} />
            {pin ? <Marker position={[pin.lat, pin.lng]} icon={tealPin} /> : null}
          </MapContainer>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="latitude" className={labelClass}>
            Latitude
          </Label>
          <Input
            id="latitude"
            name="latitude"
            inputMode="decimal"
            placeholder="e.g. 34.707130"
            value={latText}
            onChange={(e) => setLatText(e.target.value)}
            onBlur={syncFromInputs}
            className={fieldClass}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="longitude" className={labelClass}>
            Longitude
          </Label>
          <Input
            id="longitude"
            name="longitude"
            inputMode="decimal"
            placeholder="e.g. 33.022617"
            value={lngText}
            onChange={(e) => setLngText(e.target.value)}
            onBlur={syncFromInputs}
            className={fieldClass}
          />
        </div>
      </div>
    </div>
  );
}
