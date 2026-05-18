import type { LatLng, Marker } from "leaflet";
import { MapPin, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from "@/features/map/constants";
import { useLeafletMap } from "@/features/map/use-leaflet-map";

import { useReverseGeocodeQuery } from "./queries";

type Props = {
  latitude: number | null;
  longitude: number | null;
  onChange: (lat: number | null, lng: number | null) => void;
  onReverseGeocode?: (displayName: string) => void;
  addressIsEmpty: boolean;
};

const DRAG_DEBOUNCE_MS = 1000;
const PINNED_ZOOM = 16;
const USE_MY_LOCATION_ZOOM = 17;

export function LocationMapPicker({
  latitude,
  longitude,
  onChange,
  onReverseGeocode,
  addressIsEmpty,
}: Props) {
  const markerRef = useRef<Marker | null>(null);
  const dragTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onChangeRef = useRef(onChange);
  const onReverseGeocodeRef = useRef(onReverseGeocode);
  const addressIsEmptyRef = useRef(addressIsEmpty);
  const initialLatRef = useRef(latitude);
  const initialLngRef = useRef(longitude);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [debouncedCoords, setDebouncedCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(
    latitude !== null && longitude !== null
      ? { lat: latitude, lng: longitude }
      : null
  );

  onChangeRef.current = onChange;
  onReverseGeocodeRef.current = onReverseGeocode;
  addressIsEmptyRef.current = addressIsEmpty;

  const hasInitialCoords =
    initialLatRef.current !== null && initialLngRef.current !== null;
  const { containerRef, leafletRef, mapRef } = useLeafletMap({
    center: hasInitialCoords
      ? [initialLatRef.current as number, initialLngRef.current as number]
      : DEFAULT_MAP_CENTER,
    onReady: (map) => {
      map.on("click", (e: { latlng: LatLng }) => {
        const { lat, lng } = e.latlng;
        placeMarker(lat, lng, { immediate: true, triggerGeocode: true });
        onChangeRef.current(lat, lng);
      });
      if (initialLatRef.current !== null && initialLngRef.current !== null) {
        placeMarker(initialLatRef.current, initialLngRef.current, {
          immediate: true,
          triggerGeocode: false,
        });
      }
    },
    zoom: hasInitialCoords ? PINNED_ZOOM : DEFAULT_MAP_ZOOM,
  });

  const geocode = useReverseGeocodeQuery(
    debouncedCoords?.lat ?? null,
    debouncedCoords?.lng ?? null
  );
  const lastSuggestionRef = useRef<string | null>(null);
  const suggestion = geocode.data?.data?.displayName ?? null;

  useEffect(() => {
    if (!suggestion || suggestion === lastSuggestionRef.current) {
      return;
    }
    lastSuggestionRef.current = suggestion;
    if (addressIsEmptyRef.current) {
      onReverseGeocodeRef.current?.(suggestion);
    }
  }, [suggestion]);

  useEffect(
    () => () => {
      if (dragTimerRef.current) {
        clearTimeout(dragTimerRef.current);
      }
      markerRef.current = null;
    },
    []
  );

  function placeMarker(
    lat: number,
    lng: number,
    opts: { triggerGeocode: boolean; immediate: boolean }
  ) {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!(L && map)) {
      return;
    }
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        onChangeRef.current(pos.lat, pos.lng);
        scheduleGeocode(pos.lat, pos.lng);
      });
      markerRef.current = marker;
    }
    if (opts.triggerGeocode) {
      if (opts.immediate) {
        commitGeocodeCoords(lat, lng);
      } else {
        scheduleGeocode(lat, lng);
      }
    }
  }

  function commitGeocodeCoords(lat: number, lng: number) {
    setDebouncedCoords((prev) =>
      prev && prev.lat === lat && prev.lng === lng ? prev : { lat, lng }
    );
  }

  function scheduleGeocode(lat: number, lng: number) {
    if (dragTimerRef.current) {
      clearTimeout(dragTimerRef.current);
    }
    dragTimerRef.current = setTimeout(() => {
      commitGeocodeCoords(lat, lng);
    }, DRAG_DEBOUNCE_MS);
  }

  function handleUseMyLocation() {
    if (!navigator.geolocation) {
      setGeoError("Geolocation not supported");
      return;
    }
    setGeoError(null);
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        mapRef.current?.setView([lat, lng], USE_MY_LOCATION_ZOOM);
        placeMarker(lat, lng, { immediate: true, triggerGeocode: true });
        onChangeRef.current(lat, lng);
        setGeoLoading(false);
      },
      () => {
        setGeoError("Could not get location");
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, maximumAge: 60_000, timeout: 10_000 }
    );
  }

  function handleClear() {
    if (markerRef.current && mapRef.current) {
      mapRef.current.removeLayer(markerRef.current);
      markerRef.current = null;
    }
    lastSuggestionRef.current = null;
    setDebouncedCoords(null);
    onChangeRef.current(null, null);
  }

  function handleUseSuggestion() {
    if (suggestion) {
      onReverseGeocodeRef.current?.(suggestion);
    }
  }

  const showSuggestionLink =
    suggestion && !addressIsEmpty && lastSuggestionRef.current === suggestion;

  return (
    <div className="space-y-2">
      <div
        className="h-[280px] w-full overflow-hidden rounded-md border md:h-[400px]"
        ref={containerRef}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button
          disabled={geoLoading}
          onClick={handleUseMyLocation}
          size="sm"
          type="button"
          variant="outline"
        >
          <MapPin className="mr-1 size-4" />
          {geoLoading ? "Locating..." : "Use my location"}
        </Button>
        <Button
          disabled={latitude === null && longitude === null}
          onClick={handleClear}
          size="sm"
          type="button"
          variant="ghost"
        >
          <X className="mr-1 size-4" />
          Clear
        </Button>
        <p className="text-muted-foreground text-xs">
          {latitude !== null && longitude !== null
            ? `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
            : "Tap the map to drop a pin"}
        </p>
      </div>
      {geoError && <p className="text-destructive text-sm">{geoError}</p>}
      {showSuggestionLink && (
        <button
          className="text-left text-primary text-xs underline-offset-2 hover:underline"
          onClick={handleUseSuggestion}
          type="button"
        >
          Use suggested: {suggestion}
        </button>
      )}
    </div>
  );
}
