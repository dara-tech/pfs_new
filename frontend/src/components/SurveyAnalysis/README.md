# Survey Analysis Components

This directory contains components for advanced survey analysis with geographic visualization.

## Components

### GeographicMap.jsx
Interactive map component that displays survey data by geographic location.

**Features:**
- Apple Maps-like styling using CartoDB tiles (clean, minimal design)
- Satellite view option
- Color-coded markers based on satisfaction rates
- Circle overlays showing data volume
- Interactive popups with detailed information
- Fullscreen mode
- Responsive design

**Map Styles:**
- **Apple-style Map**: Clean, minimal design similar to Apple Maps (default)
- **Satellite**: Satellite imagery view

**Usage:**
```jsx
import GeographicMap from '../components/SurveyAnalysis/GeographicMap';

<GeographicMap 
  surveyData={analysisData} 
  locale={locale} 
/>
```

## Using True Apple Maps (MapKit JS)

To use true Apple Maps via MapKit JS:

1. **Get Apple Developer Account**
   - Sign up at https://developer.apple.com
   - Create a Maps identifier
   - Generate a MapKit JS API key

2. **Add MapKit JS Script**
   Add to `index.html`:
   ```html
   <script src="https://cdn.apple-mapkit.com/mk/5.x.x/mapkit.js"></script>
   ```

3. **Set API Key**
   Add to your environment variables or config:
   ```javascript
   const APPLE_MAPS_API_KEY = 'your-api-key-here';
   ```

4. **Use MapKit Helper**
   ```jsx
   import { initMapKit, createMapKitMap } from '../components/SurveyAnalysis/MapKitHelper';
   
   useEffect(() => {
     initMapKit(APPLE_MAPS_API_KEY).then(() => {
       const map = createMapKitMap(mapContainerRef.current);
       // Use map...
     });
   }, []);
   ```

## Current Implementation

The current implementation uses **CartoDB Light** tiles which provide an Apple Maps-like clean, minimal appearance. This doesn't require any API keys and works immediately.

## Customization

You can customize the map by modifying the `getTileUrl()` function in `GeographicMap.jsx`:

- **CartoDB Light** (current): Clean, Apple-like style
- **CartoDB Dark**: Dark mode variant
- **Stamen Toner**: High contrast black and white
- **Esri World Imagery**: Satellite imagery
- **OpenStreetMap**: Standard OSM tiles

## Province Coordinates

Cambodian province coordinates are pre-configured in the component. If you need to add or modify coordinates, update the `CAMBODIA_PROVINCES` object in `GeographicMap.jsx`.
