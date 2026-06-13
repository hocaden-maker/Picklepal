// Unified geolocation: native Capacitor GPS on iOS/Android, browser API on web.
// All functions return { lat, lng } or throw.

const isNative = () =>
  typeof window !== 'undefined' &&
  window.Capacitor?.isNativePlatform?.();

async function getCapacitor() {
  if (!isNative()) return null;
  try {
    const { Geolocation } = await import('@capacitor/geolocation');
    return Geolocation;
  } catch {
    return null;
  }
}

export async function requestPermission() {
  const Geo = await getCapacitor();
  if (Geo) {
    const status = await Geo.requestPermissions({ permissions: ['location'] });
    return status.location === 'granted' || status.location === 'limited';
  }
  // Web: permission is implicitly requested on first getCurrentPosition call
  return true;
}

export async function getCurrentPosition() {
  const Geo = await getCapacitor();
  if (Geo) {
    const pos = await Geo.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
  }
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Geolocation not supported'));
    navigator.geolocation.getCurrentPosition(
      p => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      reject,
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

// Returns a cleanup function
export async function watchPosition(callback) {
  const Geo = await getCapacitor();
  if (Geo) {
    const id = await Geo.watchPosition({ enableHighAccuracy: true }, (pos, err) => {
      if (pos) callback({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
    });
    return () => Geo.clearWatch({ id });
  }
  if (!navigator.geolocation) return () => {};
  const id = navigator.geolocation.watchPosition(
    p => callback({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
    () => {},
    { enableHighAccuracy: true, maximumAge: 10000 }
  );
  return () => navigator.geolocation.clearWatch(id);
}
