import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaMapMarkerAlt } from 'react-icons/fa';
import { MapContainer, Marker, Polyline, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import 'leaflet/dist/leaflet.css';
import './CustomerPages.css';

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const parseCoords = (value) => {
  if (!value || typeof value !== 'string') return null;
  const parts = value.split(',').map((part) => Number(part.trim()));
  if (parts.length !== 2 || parts.some((num) => !Number.isFinite(num))) return null;
  return { lat: parts[0], lng: parts[1] };
};

const normalizeCoords = (coords) => {
  if (!coords) return null;
  const lat = Number(coords.lat);
  const lng = Number(coords.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
};

const FitBounds = ({ points, fallback }) => {
  const map = useMap();

  useEffect(() => {
    if (!points || points.length === 0) {
      if (fallback) map.setView(fallback, 13);
      return;
    }

    if (points.length === 1) {
      map.setView(points[0], 14);
      return;
    }

    map.fitBounds(points, { padding: [40, 40] });
  }, [map, points, fallback]);

  return null;
};

const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [routePoints, setRoutePoints] = useState([]);
  const [routeError, setRouteError] = useState('');
  const [originCoords, setOriginCoords] = useState(null);
  const [originStatus, setOriginStatus] = useState('loading');
  const [resolvedDestinationCoords, setResolvedDestinationCoords] = useState(null);
  const [destinationStatus, setDestinationStatus] = useState('loading');

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const destinationFromQuery = searchParams.get('destination') || searchParams.get('dest');
  const destination = location.state?.destination || destinationFromQuery || '';
  const title = location.state?.title || searchParams.get('title') || 'Navigation';
  const backTo = location.state?.backTo || '/customer/discover';
  const destinationCoords = useMemo(() => {
    const stateCoords = normalizeCoords(location.state?.destinationCoords);
    if (stateCoords) return stateCoords;
    return parseCoords(destination);
  }, [location.state?.destinationCoords, destination]);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setOriginStatus('unsupported');
      return;
    }

    setOriginStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        localStorage.setItem('lastLocation', JSON.stringify(coords));
        setOriginCoords(coords);
        setOriginStatus('ready');
      },
      () => {
        setOriginStatus('denied');
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  useEffect(() => {
    const raw = localStorage.getItem('lastLocation');
    if (raw) {
      try {
        const { lng, lat } = JSON.parse(raw);
        if (Number.isFinite(lng) && Number.isFinite(lat)) {
          setOriginCoords({ lat, lng });
          setOriginStatus('ready');
          return;
        }
      } catch {
        // fall through to geolocation
      }
    }

    requestLocation();
  }, []);

  useEffect(() => {
    let cancelled = false;
    setDestinationStatus('loading');
    setResolvedDestinationCoords(null);

    if (destinationCoords) {
      setResolvedDestinationCoords(destinationCoords);
      setDestinationStatus('ready');
      return undefined;
    }

    if (!destination) {
      setDestinationStatus('missing');
      return undefined;
    }

    const fetchDestination = async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(destination)}`
        );
        if (!res.ok) throw new Error('Geocode failed');
        const data = await res.json();
        const first = data?.[0];
        if (!first || !first.lat || !first.lon) throw new Error('No result');

        if (!cancelled) {
          const resolved = normalizeCoords({ lat: first.lat, lng: first.lon });
          if (!resolved) throw new Error('Invalid coordinates');
          setResolvedDestinationCoords(resolved);
          setDestinationStatus('ready');
        }
      } catch (error) {
        if (!cancelled) setDestinationStatus('error');
      }
    };

    fetchDestination();

    return () => {
      cancelled = true;
    };
  }, [destination, destinationCoords]);

  useEffect(() => {
    let cancelled = false;
    setRouteError('');
    setRouteError('');
    setRoutePoints([]);

    if (!originCoords || !resolvedDestinationCoords) return;

    const loadRoute = async () => {
      try {
        const from = `${originCoords.lng},${originCoords.lat}`;
        const to = `${resolvedDestinationCoords.lng},${resolvedDestinationCoords.lat}`;
        const res = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${from};${to}?overview=full&geometries=geojson&steps=true`
        );
        if (!res.ok) throw new Error('Route request failed');
        const data = await res.json();
        const route = data?.routes?.[0];
        if (!route || !route.geometry?.coordinates?.length) throw new Error('No route found');

        const coords = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
        if (!cancelled) setRoutePoints(coords);
      } catch (error) {
        if (!cancelled) setRouteError('Could not load route.');
      }
    };

    loadRoute();

    return () => {
      cancelled = true;
    };
  }, [originCoords, resolvedDestinationCoords]);

  const mapPoints = useMemo(() => {
    if (routePoints.length) return routePoints;
    if (originCoords && resolvedDestinationCoords) return [[originCoords.lat, originCoords.lng], [resolvedDestinationCoords.lat, resolvedDestinationCoords.lng]];
    if (resolvedDestinationCoords) return [[resolvedDestinationCoords.lat, resolvedDestinationCoords.lng]];
    if (originCoords) return [[originCoords.lat, originCoords.lng]];
    return [];
  }, [routePoints, originCoords, resolvedDestinationCoords]);

  const mapCenter = useMemo(() => {
    if (originCoords) return [originCoords.lat, originCoords.lng];
    if (resolvedDestinationCoords) return [resolvedDestinationCoords.lat, resolvedDestinationCoords.lng];
    if (destinationCoords) return [destinationCoords.lat, destinationCoords.lng];
    return [27.7172, 85.324];
  }, [originCoords, resolvedDestinationCoords, destinationCoords]);

  return (
    <div className="navigation-page">
      <div className="navigation-header">
        <button
          className="back-link nav-back-button"
          type="button"
          onClick={() => navigate(backTo)}
        >
          <FaArrowLeft /> Back
        </button>
        <div className="navigation-title">
          <h1>{title}</h1>
          <p>{destination || 'Destination is not available for this store.'}</p>
        </div>
      </div>

      {!destination ? (
        <div className="no-results">
          <FaMapMarkerAlt className="navigation-empty-icon" />
          <p>We do not have enough location data to show directions.</p>
        </div>
      ) : (
        <div className="navigation-stack">
          <div className="navigation-frame">
            <MapContainer className="navigation-map" center={mapCenter} zoom={13} scrollWheelZoom>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <FitBounds points={mapPoints} fallback={mapCenter} />
              {originCoords ? <Marker position={[originCoords.lat, originCoords.lng]} /> : null}
              {resolvedDestinationCoords ? <Marker position={[resolvedDestinationCoords.lat, resolvedDestinationCoords.lng]} /> : null}
              {routePoints.length ? <Polyline positions={routePoints} /> : null}
            </MapContainer>
          </div>

          {!originCoords && originStatus === 'loading' ? (
            <div className="navigation-loading">Waiting for your location...</div>
          ) : null}
          {!originCoords && originStatus === 'denied' ? (
            <div className="navigation-error">Location access is blocked. Allow location to get directions.</div>
          ) : null}
          {!originCoords && originStatus === 'unsupported' ? (
            <div className="navigation-error">Your browser does not support geolocation.</div>
          ) : null}
          {!originCoords && originStatus === 'loading' ? (
            <button className="btn-secondary navigation-retry" type="button" onClick={requestLocation}>
              Use my current location
            </button>
          ) : null}
          {destinationStatus === 'error' ? (
            <div className="navigation-error">We could not find this destination on the map.</div>
          ) : null}
          {destinationStatus === 'missing' ? (
            <div className="navigation-error">This store does not have address or coordinates saved yet.</div>
          ) : null}
          {routeError ? <div className="navigation-error">{routeError}</div> : null}
        </div>
      )}
    </div>
  );
};

export default Navigation;
