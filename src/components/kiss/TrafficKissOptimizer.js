import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import './TrafficKissOptimizer.css';
// Reuse the floating boards background and some shared theming affordances from Sudoku
import '../sudoku/Sudoku.css';

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
];

// Geometry helpers (module scope for stability/perf)
function projectMeters(lat, lng, refLat) {
  const k = 111320; // meters per degree approx
  const x = (lng) * Math.cos(refLat * Math.PI/180) * k;
  const y = (lat) * k;
  return { x, y };
}

function pointToPolylineDistanceMeters(point, poly) {
  if (!poly || poly.length < 2) return Infinity;
  const refLat = point.lat;
  const P = projectMeters(point.lat, point.lng, refLat);
  let best = Infinity;
  for (let i = 0; i < poly.length - 1; i++) {
    const A = projectMeters(poly[i].lat, poly[i].lng, refLat);
    const B = projectMeters(poly[i+1].lat, poly[i+1].lng, refLat);
    const ABx = B.x - A.x, ABy = B.y - A.y;
    const APx = P.x - A.x, APy = P.y - A.y;
    const ab2 = ABx*ABx + ABy*ABy || 1e-9;
    let t = (APx*ABx + APy*ABy) / ab2;
    t = Math.max(0, Math.min(1, t));
    const Qx = A.x + t*ABx, Qy = A.y + t*ABy;
    const dx = P.x - Qx, dy = P.y - Qy;
    const d = Math.sqrt(dx*dx + dy*dy);
    if (d < best) best = d;
  }
  return best;
}

// Cluster points within a distance threshold (meters) to represent
// multi-signal intersections as a single dot. Returns an array of
// { lat, lng, count } where count is the number of consolidated points.
function clusterPoints(points, thresholdMeters = 15) {
  if (!Array.isArray(points) || points.length === 0) return [];
  const refLat = points[0].lat;
  const cell = Math.max(1, thresholdMeters);
  const grid = new Map(); // key: "i,j" -> array of cluster indices
  const clusters = [];
  const t2 = thresholdMeters * thresholdMeters;
  const key = (i, j) => i + ',' + j;
  for (const p of points) {
    const P = projectMeters(p.lat, p.lng, refLat);
    const gi = Math.floor(P.x / cell);
    const gj = Math.floor(P.y / cell);
    let found = -1;
    for (let di = -1; di <= 1 && found === -1; di++) {
      for (let dj = -1; dj <= 1 && found === -1; dj++) {
        const arr = grid.get(key(gi + di, gj + dj));
        if (!arr) continue;
        for (let k = 0; k < arr.length; k++) {
          const idx = arr[k];
          const c = clusters[idx];
          const dx = P.x - c.x;
          const dy = P.y - c.y;
          if (dx*dx + dy*dy <= t2) { found = idx; break; }
        }
      }
    }
    if (found !== -1) {
      const c = clusters[found];
      const n = c.count + 1;
      c.x = (c.x * c.count + P.x) / n;
      c.y = (c.y * c.count + P.y) / n;
      c.lat = (c.lat * c.count + p.lat) / n;
      c.lng = (c.lng * c.count + p.lng) / n;
      c.count = n;
    } else {
      const idx = clusters.length;
      clusters.push({ x: P.x, y: P.y, lat: p.lat, lng: p.lng, count: 1 });
      const k = key(gi, gj);
      const arr = grid.get(k);
      if (arr) arr.push(idx); else grid.set(k, [idx]);
    }
  }
  return clusters.map(c => ({ lat: c.lat, lng: c.lng, count: c.count }));
}

function getCookie(name) {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  if (match) return decodeURIComponent(match[2]);
  return null;
}

function setCookie(name, value, days = 365) {
  const d = new Date();
  d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${d.toUTCString()};path=/`;
}

// Lightweight Google Maps JS API loader (no external deps)
function loadGoogleMaps(apiKey) {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.maps) return resolve(window.google);
    const existing = document.querySelector('script[data-gmaps]');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.google));
      existing.addEventListener('error', reject);
      return;
    }

    if (!apiKey) {
      reject(new Error('Missing REACT_APP_GOOGLE_MAPS_API_KEY'));
      return;
    }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&v=weekly`;
    script.async = true;
    script.defer = true;
    script.dataset.gmaps = '1';
    script.onload = () => resolve(window.google);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export default function TrafficKissOptimizer() {
  const [phase, setPhase] = useState('idle'); // idle | searching | showing
  const [theme, setTheme] = useState(() => getCookie('theme') || 'dark');
  const [start, setStart] = useState('');
  const [dest, setDest] = useState('');
  const [useLoc, setUseLoc] = useState(null); // {lat, lng} or null
  const [tolerance, setTolerance] = useState(15); // % over fastest, 0–50
  const [toast, setToast] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const [gReady, setGReady] = useState(false);
  const [startLatLng, setStartLatLng] = useState(null);
  const [destLatLng, setDestLatLng] = useState(null);
  const [routes, setRoutes] = useState([]); // {points:[], durationSec, durationText, lights}
  const [fastestIndex, setFastestIndex] = useState(null);
  const [kissIndex, setKissIndex] = useState(null);
  const [stats, setStats] = useState({ lights: null, etaText: null, extraText: null });
  const [viewMode, setViewMode] = useState('kiss'); // 'kiss' | 'fastest'
  // Trip edit HUD state
  const [editingTrip, setEditingTrip] = useState(false);
  const [draftStart, setDraftStart] = useState('');
  const [draftDest, setDraftDest] = useState('');
  const [draftUseLoc, setDraftUseLoc] = useState(null); // {lat,lng} or null
  const [draftStartLatLng, setDraftStartLatLng] = useState(null);
  const [draftDestLatLng, setDraftDestLatLng] = useState(null);

  const startInputRef = useRef(null);
  const destInputRef = useRef(null);
  const hudStartInputRef = useRef(null);
  const hudDestInputRef = useRef(null);
  const editTripBtnRef = useRef(null);
  const copyBtnRef = useRef(null);
  const kissTabRef = useRef(null);
  const fastestTabRef = useRef(null);
  const mapDivRef = useRef(null);
  const mapRef = useRef(null);
  const overlaysRef = useRef({ polylines: [], markers: [] });
  const lightsRef = useRef([]);
  const nearLightsCacheRef = useRef(new Map()); // routeIndex -> near lights array
  const overpassCacheRef = useRef(new Map());
  const overpassAbortRef = useRef(null);
  const runIdRef = useRef(0);
  const statsRef = useRef(null);

  const canStart = useMemo(() => {
    return (start?.trim().length > 0 || useLoc) && dest?.trim().length > 0;
  }, [start, dest, useLoc]);

  // Overlay debug toggles via URL params
  const overlaysEnabled = useMemo(() => {
    try { return new URLSearchParams(window.location.search).get('tko_overlays') !== '0'; } catch { return true; }
  }, []);
  const useDomMarkers = useMemo(() => {
    try { return new URLSearchParams(window.location.search).get('tko_dom_markers') !== '0'; } catch { return true; }
  }, []);

  // Body classes for route, theme, and background effect
  useEffect(() => {
    document.body.classList.add('navigate-page');
    document.body.classList.add(`theme-${theme}`);
    return () => {
      document.body.classList.remove('navigate-page');
      document.body.classList.remove(`theme-${theme}`);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep theme class in sync
  useEffect(() => {
    const other = theme === 'dark' ? 'light' : 'dark';
    document.body.classList.remove(`theme-${other}`);
    document.body.classList.add(`theme-${theme}`);
    setCookie('theme', theme);
  }, [theme]);

  const showToast = useCallback((msg) => {
    setToast(msg);
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(''), 6000);
  }, []);

  // Load Google Maps on mount
  useEffect(() => {
    const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
    loadGoogleMaps(apiKey)
      .then(() => setGReady(true))
      .catch(() => {
        setGReady(false);
        showToast('Google Maps failed to load. Set REACT_APP_GOOGLE_MAPS_API_KEY.');
      });
  }, [showToast]);

  // Init Places Autocomplete when ready
  useEffect(() => {
    if (!gReady) return;
    let startAuto = null;
    let destAuto = null;
    if (startInputRef.current) {
      startAuto = new window.google.maps.places.Autocomplete(startInputRef.current, {
        fields: ['formatted_address', 'geometry', 'place_id', 'name']
      });
      startAuto.addListener('place_changed', () => {
        const p = startAuto.getPlace();
        if (!p || !p.geometry) return;
        setStart(p.formatted_address || p.name || '');
        setUseLoc(null);
        const ll = p.geometry.location.toJSON();
        setStartLatLng(ll);
      });
    }
    if (destInputRef.current) {
      destAuto = new window.google.maps.places.Autocomplete(destInputRef.current, {
        fields: ['formatted_address', 'geometry', 'place_id', 'name']
      });
      destAuto.addListener('place_changed', () => {
        const p = destAuto.getPlace();
        if (!p || !p.geometry) return;
        setDest(p.formatted_address || p.name || '');
        const ll = p.geometry.location.toJSON();
        setDestLatLng(ll);
      });
    }
    // No explicit cleanup API; listeners are GC'd with Autocomplete instances.
  }, [gReady]);

  // Init Places Autocomplete for HUD edit panel when open
  useEffect(() => {
    if (!gReady || !editingTrip) return;
    let startAuto = null;
    let destAuto = null;
    if (hudStartInputRef.current) {
      startAuto = new window.google.maps.places.Autocomplete(hudStartInputRef.current, {
        fields: ['formatted_address', 'geometry', 'place_id', 'name']
      });
      startAuto.addListener('place_changed', () => {
        const p = startAuto.getPlace();
        if (!p || !p.geometry) return;
        setDraftStart(p.formatted_address || p.name || '');
        setDraftUseLoc(null);
        const ll = p.geometry.location.toJSON();
        setDraftStartLatLng(ll);
      });
    }
    if (hudDestInputRef.current) {
      destAuto = new window.google.maps.places.Autocomplete(hudDestInputRef.current, {
        fields: ['formatted_address', 'geometry', 'place_id', 'name']
      });
      destAuto.addListener('place_changed', () => {
        const p = destAuto.getPlace();
        if (!p || !p.geometry) return;
        setDraftDest(p.formatted_address || p.name || '');
        const ll = p.geometry.location.toJSON();
        setDraftDestLatLng(ll);
      });
    }
    // cleanup by letting GC collect listeners with Autocomplete
  }, [gReady, editingTrip]);

  // Edit Trip focus management and ESC-to-close
  useEffect(() => {
    if (!editingTrip) return;
    // focus first input after panel mounts
    const t = setTimeout(() => {
      try { hudStartInputRef.current && hudStartInputRef.current.focus(); } catch (_) {}
    }, 0);
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        cancelEditTrip();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey);
    };
  }, [editingTrip]);

  // HUD + Edit Trip helpers (component scope)
  function buildDirectionsUrl(originStrOrLL, destStrOrLL, points, maxWaypoints = 10) {
    const encodePlace = (p) => {
      if (!p) return '';
      if (typeof p === 'string') return encodeURIComponent(p);
      if (p.lat != null && p.lng != null) return `${p.lat},${p.lng}`;
      return encodeURIComponent(String(p));
    };
    const originParam = encodePlace(originStrOrLL);
    const destParam = encodePlace(destStrOrLL);
    let waypointsParam = '';
    if (Array.isArray(points) && points.length > 2 && maxWaypoints > 0) {
      const count = Math.min(maxWaypoints, Math.max(0, points.length - 2));
      const step = Math.max(1, Math.floor((points.length - 2) / count));
      const wps = [];
      for (let i = 1; i < points.length - 1 && wps.length < count; i += step) {
        const p = points[i];
        // Use raw lat,lng without 'via:' prefix for Maps URL compatibility
        wps.push(`${p.lat},${p.lng}`);
      }
      if (wps.length) waypointsParam = `&waypoints=${encodeURIComponent(wps.join('|'))}`;
    }
    return `https://www.google.com/maps/dir/?api=1&origin=${originParam}&destination=${destParam}&travelmode=driving${waypointsParam}`;
  }

  function openEditTrip() {
    setDraftStart(start);
    setDraftDest(dest);
    setDraftUseLoc(useLoc);
    setDraftStartLatLng(startLatLng);
    setDraftDestLatLng(destLatLng);
    setEditingTrip(true);
  }

  function cancelEditTrip() {
    setEditingTrip(false);
    // restore focus to the Edit Trip button
    setTimeout(() => {
      try { editTripBtnRef.current && editTripBtnRef.current.focus(); } catch (_) {}
    }, 0);
  }

  function handleUseMyLocationDraft() {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setDraftUseLoc({ lat: latitude, lng: longitude });
        setDraftStart('My location');
        setDraftStartLatLng({ lat: latitude, lng: longitude });
        if (gReady) {
          try {
            const geocoder = new window.google.maps.Geocoder();
            geocoder.geocode({ location: { lat: latitude, lng: longitude } }, (results, status) => {
              if (status === 'OK' && results && results[0]) {
                setDraftStart(results[0].formatted_address);
              }
            });
          } catch (_) {}
        }
        showToast('Using your current location as Start');
      },
      () => showToast('Unable to retrieve your location.'),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  function confirmEditTrip() {
    const ok = (draftStart?.trim().length > 0 || draftUseLoc) && (draftDest?.trim().length > 0);
    if (!ok) { showToast('Enter both Start and Destination.'); return; }
    // Clear visuals and invalidate any in-flight operations
    clearMapOverlays();
    if (overpassAbortRef.current) {
      try { overpassAbortRef.current.abort(); } catch (_) {}
      overpassAbortRef.current = null;
    }
    runIdRef.current += 1; // invalidate
    nearLightsCacheRef.current = new Map();
    setRoutes([]);
    setFastestIndex(null);
    setKissIndex(null);
    setStats({ lights: null, etaText: null, extraText: null });
    // Apply drafts
    setStart(draftStart);
    setDest(draftDest);
    setUseLoc(draftUseLoc);
    setStartLatLng(draftStartLatLng);
    setDestLatLng(draftDestLatLng);
    setEditingTrip(false);
    // restore focus to the Edit Trip button
    setTimeout(() => {
      try { editTripBtnRef.current && editTripBtnRef.current.focus(); } catch (_) {}
    }, 0);
    // Kick optimization in next tick to allow state flush
    setTimeout(() => startOptimization(), 0);
  }

  function openSelectedRouteInGoogleMaps() {
    if (!routes.length || fastestIndex == null || kissIndex == null) return;
    const selIdx = (viewMode === 'kiss' ? kissIndex : fastestIndex);
    const r = routes[selIdx];
    const origin = useLoc || startLatLng || start;
    const destination = destLatLng || dest;
    const url = buildDirectionsUrl(origin, destination, r.points);
    try { window.open(url, '_blank', 'noopener,noreferrer'); } catch (_) { window.location.href = url; }
  }

  async function copySelectedRouteLink() {
    if (!routes.length || fastestIndex == null || kissIndex == null) return;
    const selIdx = (viewMode === 'kiss' ? kissIndex : fastestIndex);
    const r = routes[selIdx];
    const origin = useLoc || startLatLng || start;
    const destination = destLatLng || dest;
    const url = buildDirectionsUrl(origin, destination, r.points);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const ta = document.createElement('textarea');
        ta.value = url;
        ta.setAttribute('readonly', '');
        ta.style.position = 'absolute';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      showToast('Route link copied to clipboard.');
      try {
        copyBtnRef.current?.classList.add('copied');
        window.setTimeout(() => copyBtnRef.current?.classList.remove('copied'), 1200);
      } catch (_) {}
    } catch (e) {
      showToast('Copy failed. Opening link instead.');
      try { window.open(url, '_blank', 'noopener,noreferrer'); } catch (_) { window.location.href = url; }
    }
  }

  // Tabs keyboard navigation (Kiss/Fastest)
  function onTabsKeyDown(e) {
    const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
    if (!keys.includes(e.key)) return;
    e.preventDefault();
    let next = viewMode;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      next = viewMode === 'kiss' ? 'fastest' : 'kiss';
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      next = viewMode === 'kiss' ? 'fastest' : 'kiss';
    } else if (e.key === 'Home') {
      next = 'kiss';
    } else if (e.key === 'End') {
      next = 'fastest';
    }
    if (next !== viewMode) {
      setViewMode(next);
      setTimeout(() => {
        try {
          (next === 'kiss' ? kissTabRef.current : fastestTabRef.current)?.focus();
        } catch (_) {}
      }, 0);
    }
  }

  function handleUseMyLocation() {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUseLoc({ lat: latitude, lng: longitude });
        setStart('My location');
        setStartLatLng({ lat: latitude, lng: longitude });
        if (gReady) {
          try {
            const geocoder = new window.google.maps.Geocoder();
            geocoder.geocode({ location: { lat: latitude, lng: longitude } }, (results, status) => {
              if (status === 'OK' && results && results[0]) {
                setStart(results[0].formatted_address);
              }
            });
          } catch (_) {
            // ignore geocoder failures
          }
        }
        showToast('Using your current location as Start');
      },
      () => showToast('Unable to retrieve your location.'),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  function handleSwap() {
    const prevStart = start;
    const prevStartLL = startLatLng;
    const prevDestLL = destLatLng;
    setStart(dest);
    setDest(prevStart);
    setStartLatLng(prevDestLL || null);
    setDestLatLng(prevStartLL || null);
    setUseLoc(null);
  }

  function handleSwapDraft() {
    const prevStart = draftStart;
    const prevStartLL = draftStartLatLng;
    const prevDestLL = draftDestLatLng;
    setDraftStart(draftDest);
    setDraftDest(prevStart);
    setDraftStartLatLng(prevDestLL || null);
    setDraftDestLatLng(prevStartLL || null);
    setDraftUseLoc(null);
  }

  function handleNewSearch() {
    // reset phases and visuals
    clearMapOverlays();
    if (overpassAbortRef.current) {
      try { overpassAbortRef.current.abort(); } catch (_) {}
      overpassAbortRef.current = null;
    }
    runIdRef.current += 1; // invalidate any in-flight run
    setRoutes([]);
    setFastestIndex(null);
    setKissIndex(null);
    setStats({ lights: null, etaText: null, extraText: null });
    setPhase('idle');
  }

  function softSnap(value) {
    // soft snap to 0, 15, 30, 50
    const anchors = [0, 15, 30, 50];
    let closest = value;
    let d = Infinity;
    anchors.forEach((a) => {
      const dist = Math.abs(a - value);
      if (dist < d && dist <= 3) { // within 3% snap
        closest = a; d = dist;
      }
    });
    return closest;
  }

  function startOptimization() {
    if (!canStart || isStarting) return;
    if (!gReady) { showToast('Google Maps is still loading...'); return; }
    setIsStarting(true);
    setPhase('searching');
    // run async chain
    const myRunId = runIdRef.current + 1;
    runIdRef.current = myRunId;
    runOptimization(myRunId)
      .catch((e) => {
        console.error(e);
        showToast('Failed to compute routes. Try again.');
      })
      .finally(() => setIsStarting(false));
  }

  const clearMapOverlays = useCallback(() => {
    overlaysRef.current.polylines.forEach(p => p.setMap(null));
    overlaysRef.current.markers.forEach(m => m.setMap(null));
    overlaysRef.current = { polylines: [], markers: [] };
  }, []);

  useEffect(() => {
    return () => clearMapOverlays();
  }, [clearMapOverlays]);

  const getAccentColor = useCallback(() => {
    const v = getComputedStyle(document.body).getPropertyValue('--accent') || '#00e5a8';
    return v.trim() || '#00e5a8';
  }, []);

  const filterLightsNearRoute = useCallback((allLights, routePoints, thresholdMeters = 25) => {
    const out = [];
    for (const L of allLights) {
      const d = pointToPolylineDistanceMeters(L, routePoints);
      if (d <= thresholdMeters) out.push(L);
    }
    return out;
  }, []);

  const getSelectedIndex = useCallback((mode, fIdx, kIdx) => (mode === 'kiss' ? kIdx : fIdx), []);

  const updateStatsForMode = useCallback((mode, routesArr, fIdx, kIdx) => {
    if (!routesArr.length || fIdx == null || kIdx == null) return;
    const selIdx = mode === 'kiss' ? kIdx : fIdx;
    const fastestSec = routesArr[fIdx].durationSec;
    const chosen = routesArr[selIdx];
    setStats({
      lights: chosen.lights,
      etaText: chosen.durationText,
      extraText: '+' + formatDuration(Math.max(0, chosen.durationSec - fastestSec)),
    });
  }, []);

  function formatDuration(totalSeconds) {
    const s = Math.max(0, Math.round(totalSeconds));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${sec}s`;
    return `${sec}s`;
  }

  function computeBBox(points) {
    let south = 90, west = 180, north = -90, east = -180;
    for (const p of points) {
      if (p.lat < south) south = p.lat;
      if (p.lat > north) north = p.lat;
      if (p.lng < west) west = p.lng;
      if (p.lng > east) east = p.lng;
    }
    return { south, west, north, east };
  }

  

  async function fetchDirections() {
    return new Promise((resolve, reject) => {
      try {
        const svc = new window.google.maps.DirectionsService();
        const origin = useLoc || startLatLng || start;
        const destination = destLatLng || dest;
        const req = {
          origin,
          destination,
          travelMode: window.google.maps.TravelMode.DRIVING,
          provideRouteAlternatives: true,
          drivingOptions: {
            departureTime: new Date(Date.now() + 2 * 60 * 1000),
            trafficModel: window.google.maps.TrafficModel.BEST_GUESS,
          },
        };
        svc.route(req, (res, status) => {
          if (status !== 'OK') return reject(new Error('Directions status ' + status));
          const routes = (res.routes || []).map((r) => {
            const pts = (r.overview_path || []).map(ll => ({ lat: ll.lat(), lng: ll.lng() }));
            let secs = 0;
            (r.legs || []).forEach(leg => {
              secs += (leg.duration_in_traffic?.value) || (leg.duration?.value) || 0;
            });
            return { points: pts, durationSec: secs, durationText: formatDuration(secs) };
          });
          resolve(routes);
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  async function fetchTrafficLights(bbox, signal) {
    const { south, west, north, east } = bbox;
    const key = [south, west, north, east].map(n => +Number(n).toFixed(4)).join(',');
    const cached = overpassCacheRef.current.get(key);
    if (cached) return cached;
    const payload = `[out:json][timeout:25];(node["highway"="traffic_signals"](${south},${west},${north},${east});way["highway"="traffic_signals"](${south},${west},${north},${east});relation["highway"="traffic_signals"](${south},${west},${north},${east}););out center;`;
    let lastErr = null;
    for (const base of OVERPASS_ENDPOINTS) {
      const url = `${base}?data=${encodeURIComponent(payload)}`;
      try {
        const resp = await fetch(url, { headers: { 'Accept': 'application/json' }, signal });
        if (!resp.ok) { lastErr = new Error('Overpass failed: ' + resp.status); continue; }
        const data = await resp.json();
        const lights = [];
        for (const el of data.elements || []) {
          if (el.type === 'node') {
            lights.push({ lat: el.lat, lng: el.lon });
          } else if (el.type === 'way' && el.center) {
            lights.push({ lat: el.center.lat, lng: el.center.lon });
          } else if (el.type === 'relation' && el.center) {
            lights.push({ lat: el.center.lat, lng: el.center.lon });
          }
        }
        overpassCacheRef.current.set(key, lights);
        return lights;
      } catch (e) {
        if (signal?.aborted) throw e;
        lastErr = e;
      }
    }
    if (lastErr) throw lastErr;
    return [];
  }

  function countLightsNearRoute(lights, routePoints, thresholdMeters = 25) {
    let count = 0;
    for (const L of lights) {
      const d = pointToPolylineDistanceMeters(L, routePoints);
      if (d <= thresholdMeters) count++;
    }
    return count;
  }

  function chooseKissRoute(routesArr, fastestIdx, tolerancePct) {
    const fastestSec = routesArr[fastestIdx].durationSec;
    const maxAllowed = fastestSec * (1 + tolerancePct / 100);
    let bestIdx = fastestIdx;
    let bestLights = routesArr[fastestIdx].lights || 0;
    let bestExtra = 0;
    routesArr.forEach((r, i) => {
      if (r.durationSec <= maxAllowed) {
        const extra = r.durationSec - fastestSec;
        const lights = r.lights || 0;
        if (lights > bestLights || (lights === bestLights && extra < bestExtra)) {
          bestLights = lights;
          bestExtra = extra;
          bestIdx = i;
        }
      }
    });
    return bestIdx;
  }

  const renderOverlays = useCallback((routesArr, fastestIdx, kissIdx, mode) => {
    if (!mapRef.current) return;
    if (!overlaysEnabled) return;
    clearMapOverlays();
    const accent = getAccentColor();
    const idx = mode === 'kiss' ? kissIdx : fastestIdx;
    if (idx == null) return;
    const r = routesArr[idx];
    const line = new window.google.maps.Polyline({
      path: r.points,
      strokeOpacity: 1,
      strokeWeight: 6,
      strokeColor: accent,
      zIndex: 1000,
      map: mapRef.current,
    });
    overlaysRef.current.polylines.push(line);
  }, [clearMapOverlays, getAccentColor, overlaysEnabled]);

  const renderLightsMarkers = useCallback((lights) => {
    if (!mapRef.current || !lights?.length) return;
    if (!overlaysEnabled) return;
    const accent = getAccentColor();
    const maxMarkers = 400; // perf guard
    const step = Math.max(1, Math.floor(lights.length / maxMarkers));
    for (let i = 0; i < lights.length; i += step) {
      const L = lights[i];
      const m = new window.google.maps.Marker({
        position: L,
        map: mapRef.current,
        optimized: !useDomMarkers,
        zIndex: 1100,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 4,
          strokeColor: accent,
          strokeWeight: 2,
          fillColor: '#ffffff',
          fillOpacity: 1,
        }
      });
      overlaysRef.current.markers.push(m);
    }
  }, [getAccentColor, overlaysEnabled, useDomMarkers]);

  const fitToRoute = useCallback((points) => {
    if (!mapRef.current || !points?.length) return;
    const bounds = new window.google.maps.LatLngBounds();
    points.forEach(p => bounds.extend(new window.google.maps.LatLng(p.lat, p.lng)));
    mapRef.current.fitBounds(bounds, 40);
  }, []);

  async function runOptimization(runId) {
    try {
      // 1) Directions
      showToast('Fetching routes…');
      const dirRoutes = await fetchDirections();
      if (!dirRoutes.length) throw new Error('No routes');
      const fastestIdx = dirRoutes.reduce((bi, r, i, a) => r.durationSec < a[bi].durationSec ? i : bi, 0);
      if (runIdRef.current !== runId) return;
      // 2) Overpass bbox across all alternatives
      const allPts = dirRoutes.flatMap(r => r.points);
      const bbox = computeBBox(allPts);
      showToast('Fetching traffic lights…');
      let lights = [];
      try {
        if (overpassAbortRef.current) {
          try { overpassAbortRef.current.abort(); } catch (_) {}
        }
        const controller = new AbortController();
        overpassAbortRef.current = controller;
        lights = await fetchTrafficLights(bbox, controller.signal);
      } catch (e) {
        console.warn('Overpass error', e);
      }
      if (runIdRef.current !== runId) return;
      overpassAbortRef.current = null;
      // Consolidate signals into intersections (one dot per intersection)
      const intersections = clusterPoints(lights, 15);
      lightsRef.current = intersections;
      // 3) Count + choose
      const withCounts = dirRoutes.map(r => ({ ...r, lights: countLightsNearRoute(intersections, r.points, 25) }));
      const kissIdx = chooseKissRoute(withCounts, fastestIdx, tolerance);
      // 4) set state + map
      setRoutes(withCounts);
      setFastestIndex(fastestIdx);
      setKissIndex(kissIdx);
      nearLightsCacheRef.current = new Map(); // reset
      // Precompute near-lights for fastest and kiss for snappy toggles
      try {
        const nf = filterLightsNearRoute(intersections, withCounts[fastestIdx].points, 25);
        nearLightsCacheRef.current.set(fastestIdx, nf);
      } catch {}
      try {
        const nk = filterLightsNearRoute(intersections, withCounts[kissIdx].points, 25);
        nearLightsCacheRef.current.set(kissIdx, nk);
      } catch {}
      updateStatsForMode(viewMode, withCounts, fastestIdx, kissIdx);
      setPhase('showing');
      // 5) draw only selected route + its near lights
      const selIdx = getSelectedIndex(viewMode, fastestIdx, kissIdx);
      renderOverlays(withCounts, fastestIdx, kissIdx, viewMode);
      const near = nearLightsCacheRef.current.get(selIdx) || [];
      renderLightsMarkers(near);
      fitToRoute(withCounts[selIdx].points);
      showToast('Kiss route ready.');
    } catch (e) {
      console.error(e);
      showToast('Route computation failed.');
      setPhase('showing');
    }
  }

  // Recompute kiss route on tolerance change if routes already loaded
  useEffect(() => {
    if (!routes.length) return;
    if (fastestIndex == null) return;
    const kissIdx = chooseKissRoute(routes, fastestIndex, tolerance);
    setKissIndex(kissIdx);
    updateStatsForMode(viewMode, routes, fastestIndex, kissIdx);
    // Ensure near-lights cached for new kiss selection
    try {
      if (!nearLightsCacheRef.current.has(kissIdx)) {
        const nk = filterLightsNearRoute(lightsRef.current, routes[kissIdx].points, 25);
        nearLightsCacheRef.current.set(kissIdx, nk);
      }
    } catch {}
    const selIdx = getSelectedIndex(viewMode, fastestIndex, kissIdx);
    renderOverlays(routes, fastestIndex, kissIdx, viewMode);
    const near = nearLightsCacheRef.current.get(selIdx) || [];
    renderLightsMarkers(near);
    fitToRoute(routes[selIdx].points);
  }, [tolerance, routes, fastestIndex, renderOverlays, renderLightsMarkers, fitToRoute, viewMode, updateStatsForMode, getSelectedIndex, filterLightsNearRoute]);

  // Ensure overlays render when map becomes ready or indices/routes update
  useEffect(() => {
    if (!gReady) return;
    if (!mapRef.current) return;
    if (phase === 'idle') return;
    if (!routes.length || fastestIndex == null || kissIndex == null) return;
    updateStatsForMode(viewMode, routes, fastestIndex, kissIndex);
    // On readiness or view change, draw selected route + near lights
    renderOverlays(routes, fastestIndex, kissIndex, viewMode);
    const selIdx = getSelectedIndex(viewMode, fastestIndex, kissIndex);
    if (!nearLightsCacheRef.current.has(selIdx)) {
      try {
        const n = filterLightsNearRoute(lightsRef.current, routes[selIdx].points, 25);
        nearLightsCacheRef.current.set(selIdx, n);
      } catch {}
    }
    const near = nearLightsCacheRef.current.get(selIdx) || [];
    renderLightsMarkers(near);
    fitToRoute(routes[selIdx].points);
  }, [gReady, phase, routes, fastestIndex, kissIndex, renderOverlays, renderLightsMarkers, fitToRoute, viewMode, getSelectedIndex, updateStatsForMode, filterLightsNearRoute]);

  // Focus HUD stats when results are shown
  useEffect(() => {
    if (phase === 'showing' && statsRef.current) {
      try { statsRef.current.focus(); } catch (_) {}
    }
  }, [phase]);

  // Reduced motion helper class
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) document.body.classList.add('reduced-motion');
    return () => document.body.classList.remove('reduced-motion');
  }, []);

  // Initialize map when showing/searching and API ready
  useEffect(() => {
    if (!gReady) return;
    if (phase === 'idle') return;
    if (!mapDivRef.current) return;
    const cardBg = (getComputedStyle(document.body).getPropertyValue('--card') || '#12141a').trim() || '#12141a';
    if (!mapRef.current) {
      const center = startLatLng || useLoc || { lat: 37.7749, lng: -122.4194 };
      mapRef.current = new window.google.maps.Map(mapDivRef.current, {
        center,
        zoom: 12,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        backgroundColor: cardBg,
        noClear: true,
      });
      try {
        const gm = mapDivRef.current.querySelector('.gm-style');
        if (gm) gm.style.backgroundColor = cardBg;
      } catch (_) {}
    } else {
      // keep map theme/center in sync
      const center = startLatLng || useLoc || mapRef.current.getCenter();
      if (center) mapRef.current.setCenter(center);
      try {
        const gm = mapDivRef.current.querySelector('.gm-style');
        if (gm) gm.style.backgroundColor = cardBg;
      } catch (_) {}
    }
  }, [gReady, phase, startLatLng, useLoc]);

  return (
    <div className={`kiss-container kiss-${phase}`}>
      {/* Toast */}
      {toast && <div className="kiss-toast" role="status" aria-live="polite">{toast}</div>}

      {/* HUD (visible after start) */}
      {phase !== 'idle' && (
        <div className="kiss-hud" aria-label="Kiss optimizer HUD">
          <div className="hud-left">
            <div className="stats-pill" aria-live="polite" ref={statsRef} tabIndex="-1">
              <span className="stats-title">{viewMode === 'kiss' ? 'Kiss Route' : 'Fastest Route'}</span>
              <span className="stats-values">Lights: {stats.lights ?? '—'} · ETA: {stats.etaText ?? '—'} · +Time: {stats.extraText ?? '—'}</span>
            </div>
          </div>
          <div className="hud-right">
            <div className="view-row" role="tablist" aria-label="View mode" onKeyDown={onTabsKeyDown}>
              <button
                className={`theme-pill ${viewMode === 'kiss' ? 'selected' : ''}`}
                role="tab"
                aria-selected={viewMode === 'kiss'}
                tabIndex={viewMode === 'kiss' ? 0 : -1}
                ref={kissTabRef}
                onClick={() => setViewMode('kiss')}
              >
                💋 Kiss
              </button>
              <button
                className={`theme-pill ${viewMode === 'fastest' ? 'selected' : ''}`}
                role="tab"
                aria-selected={viewMode === 'fastest'}
                tabIndex={viewMode === 'fastest' ? 0 : -1}
                ref={fastestTabRef}
                onClick={() => setViewMode('fastest')}
              >
                ⚡ Fastest
              </button>
            </div>
            <button className="btn secondary compact" onClick={openEditTrip} aria-expanded={editingTrip} aria-controls="trip-edit-panel" ref={editTripBtnRef}>
              Edit Trip
            </button>
          </div>
        </div>
      )}

      {/* Idle Card */}
      {phase === 'idle' && (
        <section className={`kiss-start-card ${isStarting ? 'launch' : ''}`}>
          <header className="card-head">
            <h1 className="title">Traffic Kiss Optimizer</h1>
            <p className="subtitle">Find the route with the most traffic lights within a time tolerance.</p>
          </header>

          <div className="theme-row" role="tablist" aria-label="Theme">
            <button
              className={`theme-pill ${theme === 'dark' ? 'selected' : ''}`}
              role="tab"
              aria-selected={theme === 'dark'}
              onClick={() => setTheme('dark')}
            >
              🌙 Dark
            </button>
            <button
              className={`theme-pill ${theme === 'light' ? 'selected' : ''}`}
              role="tab"
              aria-selected={theme === 'light'}
              onClick={() => setTheme('light')}
            >
              ☀️ Light
            </button>
          </div>

          <div className="inputs">
            <label className="field">
              <span className="label">Start</span>
              <input
                type="text"
                inputMode="search"
                placeholder="Enter a starting point"
                value={start}
                ref={startInputRef}
                onChange={(e) => { setStart(e.target.value); setUseLoc(null); }}
              />
              <div className="inline-actions">
                <button className="chip" onClick={handleUseMyLocation}>
                  Use my location
                </button>
                <button className="chip" onClick={handleSwap}>
                  Swap ↔
                </button>
              </div>
            </label>

            <label className="field">
              <span className="label">Destination</span>
              <input
                type="text"
                inputMode="search"
                placeholder="Enter a destination"
                value={dest}
                ref={destInputRef}
                onChange={(e) => setDest(e.target.value)}
              />
            </label>
          </div>

          <div className="slider-row">
            <div className="slider-head">
              <span className="slider-title">Delay tolerance</span>
              <span className="slider-note">How much slower than the fastest route</span>
            </div>
            <div className="slider-wrap">
              <input
                aria-label="Delay tolerance percentage"
                type="range"
                min="0"
                max="50"
                step="1"
                value={tolerance}
                onChange={(e) => setTolerance(Number(e.target.value))}
                onMouseUp={() => setTolerance((v) => softSnap(v))}
                onTouchEnd={() => setTolerance((v) => softSnap(v))}
                style={{ '--pos': `${(tolerance / 50) * 100}%` }}
              />
              <div className="slider-bubble" style={{ left: `${(tolerance/50)*100}%` }}>
                {tolerance}%
              </div>
              <div className="slider-anchors">
                <span>0%</span><span>15%</span><span>30%</span><span>50%</span>
              </div>
            </div>
          </div>

          <div className="cta-row">
            <button
              className={`btn primary ${canStart ? '' : 'disabled'}`}
              disabled={!canStart}
              onClick={startOptimization}
            >
              Optimize Kisses
            </button>
          </div>
        </section>
      )}

      {/* Map Stage / Placeholder */}
      {phase !== 'idle' && (
        <section className={`kiss-map-stage ${phase}`} aria-busy={phase === 'searching'}>
          {/* Trip Edit Panel */}
          {editingTrip && (
            <div id="trip-edit-panel" className="trip-edit-panel" role="dialog" aria-modal="false" aria-label="Edit trip" aria-describedby="trip-edit-help">
              <p id="trip-edit-help" className="sr-only">Use the fields below to edit start and destination. Press Escape to close the panel.</p>
              <div className="inputs">
                <label className="field">
                  <span className="label">Start</span>
                  <input
                    type="text"
                    inputMode="search"
                    placeholder="Enter a starting point"
                    value={draftStart}
                    ref={hudStartInputRef}
                    onChange={(e) => { setDraftStart(e.target.value); setDraftUseLoc(null); setDraftStartLatLng(null); }}
                  />
                  <div className="inline-actions">
                    <button className="chip" onClick={handleUseMyLocationDraft}>Use my location</button>
                    <button className="chip" onClick={handleSwapDraft}>Swap ↔</button>
                  </div>
                </label>
                <label className="field">
                  <span className="label">Destination</span>
                  <input
                    type="text"
                    inputMode="search"
                    placeholder="Enter a destination"
                    value={draftDest}
                    ref={hudDestInputRef}
                    onChange={(e) => { setDraftDest(e.target.value); setDraftDestLatLng(null); }}
                  />
                </label>
              </div>
              <div className="trip-edit-actions">
                <button className="btn secondary" onClick={cancelEditTrip}>Cancel</button>
                <button className={`btn primary ${((draftStart?.trim().length > 0 || draftUseLoc) && (draftDest?.trim().length > 0)) ? '' : 'disabled'}`} disabled={!((draftStart?.trim().length > 0 || draftUseLoc) && (draftDest?.trim().length > 0))} onClick={confirmEditTrip}>Find routes</button>
              </div>
            </div>
          )}
          <div ref={mapDivRef} className="map-canvas" aria-label="Map canvas" />
          {!gReady && (
            <div className="map-placeholder" role="img" aria-label="Map coming soon">
              <div className="map-grid" />
              <div className="map-callout">Map preview · Google Maps + Traffic Lights integration coming in next step</div>
            </div>
          )}
        </section>
      )}

      {/* Below-map controls: slider (left) + actions (right) */}
      {phase !== 'idle' && (
        <div className="map-controls" aria-label="Route controls">
          <div className="map-controls-left">
            <div className="slider-compact" aria-label="Delay tolerance">
              <div className="slider-wrap">
                <input
                  aria-label="Delay tolerance percentage"
                  type="range"
                  min="0"
                  max="50"
                  step="1"
                  value={tolerance}
                  onChange={(e) => setTolerance(Number(e.target.value))}
                  onMouseUp={() => setTolerance((v) => softSnap(v))}
                  onTouchEnd={() => setTolerance((v) => softSnap(v))}
                  style={{ '--pos': `${(tolerance / 50) * 100}%` }}
                />
                <div className="slider-bubble" style={{ left: `${(tolerance/50)*100}%` }}>{tolerance}%</div>
              </div>
            </div>
          </div>
          <div className="map-controls-right">
            <button
              className="btn secondary copy"
              onClick={copySelectedRouteLink}
              ref={copyBtnRef}
              disabled={!routes.length || fastestIndex == null || kissIndex == null}
              aria-label="Copy route link to clipboard"
              title="Copy route link"
            >
              Copy Route Link ⧉
            </button>
            <button className="btn secondary" onClick={openSelectedRouteInGoogleMaps} disabled={!routes.length || fastestIndex == null || kissIndex == null}>
              Open in Google Maps ↗
            </button>
            <button className="btn secondary" onClick={handleNewSearch}>
              New Search
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
