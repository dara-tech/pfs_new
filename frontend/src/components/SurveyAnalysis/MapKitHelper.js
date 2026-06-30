/**
 * MapKit JS Helper for Apple Maps Integration
 * 
 * To use true Apple Maps, you need:
 * 1. Apple Developer account
 * 2. MapKit JS API key
 * 3. Add the script to index.html:
 *    <script src="https://cdn.apple-mapkit.com/mk/5.x.x/mapkit.js"></script>
 * 
 * Then set your API key in environment variables or config
 */

/**
 * Initialize MapKit JS
 * @param {string} apiKey - Your Apple Maps API key
 * @returns {Promise} - Resolves when MapKit is loaded
 */
export const initMapKit = (apiKey) => {
  return new Promise((resolve, reject) => {
    if (window.mapkit) {
      // MapKit already loaded
      mapkit.init({
        authorizationCallback: (done) => {
          done(apiKey);
        }
      });
      resolve(window.mapkit);
      return;
    }

    // Load MapKit JS script
    const script = document.createElement('script');
    script.src = 'https://cdn.apple-mapkit.com/mk/5.x.x/mapkit.js';
    script.async = true;
    script.onload = () => {
      if (window.mapkit) {
        mapkit.init({
          authorizationCallback: (done) => {
            done(apiKey);
          }
        });
        resolve(window.mapkit);
      } else {
        reject(new Error('MapKit failed to load'));
      }
    };
    script.onerror = () => {
      reject(new Error('Failed to load MapKit JS'));
    };
    document.head.appendChild(script);
  });
};

/**
 * Create a MapKit map instance
 * @param {HTMLElement} container - Container element for the map
 * @param {Object} options - Map options
 * @returns {mapkit.Map} - MapKit map instance
 */
export const createMapKitMap = (container, options = {}) => {
  if (!window.mapkit) {
    throw new Error('MapKit JS not loaded. Call initMapKit first.');
  }

  const defaultOptions = {
    region: new mapkit.CoordinateRegion(
      new mapkit.Coordinate(12.5657, 104.9910), // Center of Cambodia
      new mapkit.CoordinateSpan(5, 5)
    ),
    showsUserLocation: false,
    mapType: mapkit.Map.MapTypes.standard,
    ...options
  };

  return new mapkit.Map(container, defaultOptions);
};

/**
 * Add annotation to MapKit map
 * @param {mapkit.Map} map - MapKit map instance
 * @param {number} latitude - Latitude
 * @param {number} longitude - Longitude
 * @param {Object} data - Annotation data (title, subtitle, etc.)
 */
export const addMapKitAnnotation = (map, latitude, longitude, data = {}) => {
  if (!window.mapkit) {
    throw new Error('MapKit JS not loaded');
  }

  const coordinate = new mapkit.Coordinate(latitude, longitude);
  const annotation = new mapkit.MarkerAnnotation(coordinate, {
    title: data.title || '',
    subtitle: data.subtitle || '',
    color: data.color || '#007AFF',
    selected: data.selected || false,
    clusteringIdentifier: data.clusteringIdentifier || null
  });

  map.addAnnotation(annotation);
  return annotation;
};

/**
 * Add circle overlay to MapKit map
 * @param {mapkit.Map} map - MapKit map instance
 * @param {number} latitude - Latitude
 * @param {number} longitude - Longitude
 * @param {number} radius - Radius in meters
 * @param {Object} style - Circle style options
 */
export const addMapKitCircle = (map, latitude, longitude, radius, style = {}) => {
  if (!window.mapkit) {
    throw new Error('MapKit JS not loaded');
  }

  const coordinate = new mapkit.Coordinate(latitude, longitude);
  const circle = new mapkit.CircleOverlay(coordinate, radius, {
    fillColor: style.fillColor || 'rgba(0, 122, 255, 0.2)',
    strokeColor: style.strokeColor || '#007AFF',
    lineWidth: style.lineWidth || 2
  });

  map.addOverlay(circle);
  return circle;
};

/**
 * Fit map to show all annotations
 * @param {mapkit.Map} map - MapKit map instance
 * @param {Array} annotations - Array of annotations
 */
export const fitMapKitToAnnotations = (map, annotations) => {
  if (!window.mapkit || !annotations || annotations.length === 0) {
    return;
  }

  const coordinates = annotations
    .map(annotation => annotation.coordinate)
    .filter(Boolean);

  if (coordinates.length === 0) {
    return;
  }

  const region = mapkit.CoordinateRegion.fromCoordinates(coordinates);
  map.region = region;
};

export default {
  initMapKit,
  createMapKitMap,
  addMapKitAnnotation,
  addMapKitCircle,
  fitMapKitToAnnotations
};
