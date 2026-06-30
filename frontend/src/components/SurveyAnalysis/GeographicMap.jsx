import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, GeoJSON } from 'react-leaflet';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { FaMapMarkerAlt, FaInfoCircle, FaExpand, FaCompress } from 'react-icons/fa';
import { useSitesStore } from '../../lib/stores/sitesStore';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Cambodian provinces coordinates (approximate centers)
const CAMBODIA_PROVINCES = {
  'Phnom Penh': { lat: 11.5564, lng: 104.9282 },
  'Kandal': { lat: 11.4833, lng: 104.9167 },
  'Kampong Cham': { lat: 11.9833, lng: 105.4500 },
  'Kampong Chhnang': { lat: 12.2500, lng: 104.6667 },
  'Kampong Speu': { lat: 11.4500, lng: 104.5167 },
  'Kampong Thom': { lat: 12.7000, lng: 104.8833 },
  'Kampot': { lat: 10.6000, lng: 104.1833 },
  'Koh Kong': { lat: 11.6167, lng: 102.9833 },
  'Kratie': { lat: 12.4833, lng: 106.0167 },
  'Mondulkiri': { lat: 12.7833, lng: 107.0167 },
  'Oddar Meanchey': { lat: 14.1667, lng: 103.5000 },
  'Pailin': { lat: 12.8500, lng: 102.6167 },
  'Preah Vihear': { lat: 13.8167, lng: 104.9833 },
  'Prey Veng': { lat: 11.4833, lng: 105.3333 },
  'Pursat': { lat: 12.5333, lng: 103.9167 },
  'Ratanakiri': { lat: 13.7333, lng: 107.0000 },
  'Siem Reap': { lat: 13.3667, lng: 103.8500 },
  'Stung Treng': { lat: 13.5167, lng: 105.9667 },
  'Svay Rieng': { lat: 11.0833, lng: 105.8000 },
  'Takeo': { lat: 10.9833, lng: 104.7833 },
  'Battambang': { lat: 13.1000, lng: 103.2000 },
  'Banteay Meanchey': { lat: 13.5833, lng: 102.9833 },
  'Kep': { lat: 10.4833, lng: 104.3167 },
  'Preah Sihanouk': { lat: 10.6167, lng: 103.5167 },
  'Tboung Khmum': { lat: 11.8167, lng: 105.3167 }, // Capital: Suong
  'Tbong Khmum': { lat: 11.8167, lng: 105.3167 }, // Alternative spelling
};

// Map bounds fitter component
function MapBoundsFitter({ bounds }) {
  const map = useMap();
  
  useEffect(() => {
    if (bounds && bounds.length > 0) {
      const group = new L.featureGroup(bounds);
      map.fitBounds(group.getBounds().pad(0.1));
    }
  }, [bounds, map]);
  
  return null;
}

// Province boundary component - creates approximate boundary using circle
function ProvinceBoundary({ provinceName, coordinates, onClose }) {
  if (!provinceName || !coordinates) return null;
  
  // Create approximate boundary using a circle (can be replaced with real GeoJSON)
  const radius = 50000; // 50km radius for approximate province boundary
  
  return (
    <>
      <Circle
        center={[coordinates.lat, coordinates.lng]}
        radius={radius}
        pathOptions={{
          color: '#3b82f6',
          fillColor: '#3b82f6',
          fillOpacity: 0.1,
          weight: 3,
          opacity: 0.8,
          dashArray: '10, 5'
        }}
        eventHandlers={{
          click: () => onClose && onClose()
        }}
      />
      {/* Add a highlight circle */}
      <Circle
        center={[coordinates.lat, coordinates.lng]}
        radius={radius * 0.3}
        pathOptions={{
          color: '#3b82f6',
          fillColor: '#3b82f6',
          fillOpacity: 0.05,
          weight: 2,
          opacity: 0.6
        }}
      />
    </>
  );
}

// Apple Maps tile layer - using a service that provides Apple Maps style tiles
// Alternative: You can use MapKit JS if you have Apple Developer credentials
const AppleMapTileLayer = () => {
  // Option 1: Use a tile service that provides Apple Maps-like tiles
  // This uses a service that mimics Apple Maps styling
  const appleMapUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
  
  // Option 2: For true Apple Maps, you would need MapKit JS
  // Option 3: Use CartoDB Positron which has a clean Apple-like style
  const cartoUrl = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
  
  // Option 4: Use Stamen Toner which has a clean style
  const stamenUrl = 'https://stamen-tiles-{s}.a.ssl.fastly.net/toner-lite/{z}/{x}/{y}{r}.png';
  
  // Using CartoDB as it has the cleanest Apple Maps-like appearance
  return (
    <TileLayer
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      url={cartoUrl}
      subdomains="abcd"
      maxZoom={19}
    />
  );
};

// Alternative: True Apple Maps using MapKit JS (requires API key)
// Uncomment and configure if you have Apple Developer credentials
/*
const AppleMapKitLayer = ({ apiKey }) => {
  const mapRef = useRef(null);
  
  useEffect(() => {
    if (!window.mapkit || !apiKey) return;
    
    mapkit.init({
      authorizationCallback: (done) => {
        done(apiKey);
      }
    });
    
    const map = new mapkit.Map(mapRef.current, {
      region: mapkit.CoordinateRegion(
        new mapkit.Coordinate(12.5657, 104.9910),
        new mapkit.CoordinateSpan(5, 5)
      ),
      showsUserLocation: false,
      mapType: mapkit.Map.MapTypes.standard
    });
    
    return () => {
      if (map) map.destroy();
    };
  }, [apiKey]);
  
  return <div ref={mapRef} style={{ width: '100%', height: '100%' }} />;
};
*/

export default function GeographicMap({ surveyData, locale, filteredData = [] }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedProvince, setSelectedProvince] = useState(null);
  const [mapData, setMapData] = useState([]);
  const [mapType, setMapType] = useState('apple'); // 'apple', 'satellite', 'standard', 'terrain'
  const [provinceBoundary, setProvinceBoundary] = useState(null);
  const { sites: allSites, fetchSites } = useSitesStore();
  
  // Get unique provinces from map data
  const availableProvinces = mapData.length > 0 
    ? Array.from(new Set(mapData.map(d => d.name))).sort()
    : [];

  // Fetch sites on mount to get province information
  useEffect(() => {
    if (allSites.length === 0) {
      fetchSites();
    }
  }, [allSites.length, fetchSites]);
  
  // Build site-province mapping from sites store
  const siteProvinceMap = {};
  allSites.forEach(site => {
    if (site.name && site.province) {
      siteProvinceMap[site.name] = site.province;
      // Also map by code if available
      if (site.code) {
        siteProvinceMap[site.code] = site.province;
      }
    }
  });

  // Extract province from site name
  const extractProvince = (siteName, siteProvinceMap) => {
    if (!siteName || typeof siteName !== 'string') {
      return null;
    }
    
    // First, check if we have a direct mapping from the sites API
    if (siteProvinceMap[siteName]) {
      return siteProvinceMap[siteName];
    }
    
    const siteNameLower = siteName.toLowerCase().trim();
    
    // Try exact match first (case insensitive)
    for (const province of Object.keys(CAMBODIA_PROVINCES)) {
      if (siteNameLower === province.toLowerCase()) {
        return province;
      }
    }
    
    // Try to match province names in the site name
    for (const province of Object.keys(CAMBODIA_PROVINCES)) {
      const provinceLower = province.toLowerCase();
      if (siteNameLower.includes(provinceLower) || provinceLower.includes(siteNameLower)) {
        return province;
      }
    }
    
    // If no match, try to extract from common patterns
    const parts = siteName.split(/[\s\-_,]/);
    for (const part of parts) {
      const partTrimmed = part.trim();
      if (partTrimmed && CAMBODIA_PROVINCES[partTrimmed]) {
        return partTrimmed;
      }
      // Case insensitive match
      for (const province of Object.keys(CAMBODIA_PROVINCES)) {
        if (partTrimmed.toLowerCase() === province.toLowerCase()) {
          return province;
        }
      }
    }
    
    // If still no match, check if it's a known site name pattern
    const parenMatch = siteName.match(/\(([^)]+)\)|\[([^\]]+)\]/);
    if (parenMatch) {
      const matchText = (parenMatch[1] || parenMatch[2]).trim();
      for (const province of Object.keys(CAMBODIA_PROVINCES)) {
        if (matchText.toLowerCase().includes(province.toLowerCase())) {
          return province;
        }
      }
    }
    
    // Return null if we can't determine
    return null;
  };

  useEffect(() => {
    if (!surveyData) {
      setMapData([]);
      return;
    }

    const processedData = [];
    
    // Get site metrics from satisfaction data
    const siteMetrics = surveyData.satisfaction?.bySite || {};
    
    // Get raw data to process
    const dataToProcess = surveyData.rawData || filteredData || [];
    
    // Process all sites - group by province but show all provinces
    const provinceData = {};
    const siteStats = {};
    const unknownSites = [];
    
    // First, collect all site statistics - prefer raw data as it has province info
    if (dataToProcess.length > 0) {
      // Process from raw data - this has province information directly
      const uniqueSites = new Set();
      const siteProvinceData = {}; // Map site to province from raw data
      
      dataToProcess.forEach(row => {
        const siteName = row.site || row.sitename || row.Site || 'Unknown';
        const province = row.province || row.Province || row.PROVINCE || null;
        
        uniqueSites.add(siteName);
        if (!siteStats[siteName]) {
          siteStats[siteName] = { total: 0, satisfied: 0 };
        }
        siteStats[siteName].total++;
        
        // Store province from raw data if available
        if (province && !siteProvinceData[siteName]) {
          siteProvinceData[siteName] = province;
        }
        
        // Calculate satisfaction
        const scores = [];
        for (let i = 1; i <= 5; i++) {
          const q = row[`Q${i}A`];
          if (q != null && q !== 4) scores.push(parseInt(q));
        }
        if (scores.length > 0) {
          const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
          if (avg >= 3) siteStats[siteName].satisfied++;
        }
      });
      
      // Merge province data from raw data into siteProvinceMap
      Object.entries(siteProvinceData).forEach(([siteName, province]) => {
        if (province && !siteProvinceMap[siteName]) {
          siteProvinceMap[siteName] = province;
        }
      });
    } else if (Object.keys(siteMetrics).length > 0) {
      // Fallback: Use satisfaction metrics if no raw data
      Object.entries(siteMetrics).forEach(([siteName, metrics]) => {
        siteStats[siteName] = {
          total: metrics.total || 0,
          satisfied: metrics.satisfied || 0
        };
      });
    }
    
    // Group sites by province using sites store
    let unknownCount = 0;
    
    Object.entries(siteStats).forEach(([siteName, stats]) => {
      // Priority 1: Get province from raw data (most accurate)
      let province = siteProvinceMap[siteName];
      
      // Priority 2: Try to find in allSites array directly (case-insensitive)
      if (!province && allSites.length > 0) {
        const siteMatch = allSites.find(s => {
          const sName = (s.name || '').toLowerCase().trim();
          const sCode = (s.code || '').toLowerCase().trim();
          const searchName = siteName.toLowerCase().trim();
          return sName === searchName || 
                 sCode === searchName ||
                 sName.includes(searchName) ||
                 searchName.includes(sName);
        });
        if (siteMatch && siteMatch.province) {
          province = siteMatch.province;
          matchedCount++;
        }
      }
      
      // Priority 3: Try to extract from site name (least reliable)
      if (!province) {
        province = extractProvince(siteName, siteProvinceMap);
      }
      
      // Normalize province name to match CAMBODIA_PROVINCES keys
      if (province) {
        // Handle common spelling variations
        const provinceVariations = {
          'tbong khmum': 'Tboung Khmum',
          'tboung khmum': 'Tboung Khmum',
          'tbong khmom': 'Tboung Khmum',
          'tboung khmom': 'Tboung Khmum',
        };
        
        const provinceLower = province.toLowerCase();
        if (provinceVariations[provinceLower]) {
          province = provinceVariations[provinceLower];
        } else if (!CAMBODIA_PROVINCES[province]) {
          // Try case-insensitive match
          const normalizedProvince = Object.keys(CAMBODIA_PROVINCES).find(
            p => p.toLowerCase() === province.toLowerCase()
          );
          if (normalizedProvince) {
            province = normalizedProvince;
          }
        }
      }
      
      // If we have a valid province, add it
      if (province && CAMBODIA_PROVINCES[province]) {
        // Initialize province data if needed
        if (!provinceData[province]) {
          provinceData[province] = {
            province,
            total: 0,
            satisfied: 0,
            sites: [],
            position: [CAMBODIA_PROVINCES[province].lat, CAMBODIA_PROVINCES[province].lng]
          };
        }
        
        // Add site to province
        provinceData[province].total += stats.total;
        provinceData[province].satisfied += stats.satisfied;
        provinceData[province].sites.push({
          name: siteName,
          total: stats.total,
          satisfied: stats.satisfied
        });
      } else {
        // Fallback: Show unknown sites at Phnom Penh with offset
        unknownCount++;
        unknownSites.push({ name: siteName, ...stats });
        
        const hash = siteName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const offsetLat = ((hash % 100) - 50) * 0.02;
        const offsetLng = (((hash * 7) % 100) - 50) * 0.02;
        const defaultProvince = 'Phnom Penh';
        const coords = CAMBODIA_PROVINCES[defaultProvince];
        
        if (coords) {
          const bucket = Math.floor(hash % 5);
          const unknownKey = `${defaultProvince}_unknown_${bucket}`;
          
          if (!provinceData[unknownKey]) {
            provinceData[unknownKey] = {
              province: `${defaultProvince} (${unknownCount > 1 ? 'Multiple Sites' : siteName})`,
              total: 0,
              satisfied: 0,
              sites: [],
              position: [coords.lat + offsetLat, coords.lng + offsetLng]
            };
          }
          provinceData[unknownKey].total += stats.total;
          provinceData[unknownKey].satisfied += stats.satisfied;
          provinceData[unknownKey].sites.push({
            name: siteName,
            total: stats.total,
            satisfied: stats.satisfied
          });
        }
      }
    });
    
    // Convert to map markers - show ALL provinces with data
    Object.entries(provinceData).forEach(([provinceKey, data]) => {
      // Handle unknown sites with custom positions
      let position = data.position;
      let provinceName = data.province;
      
      // If no position set, get from CAMBODIA_PROVINCES
      if (!position) {
        const coords = CAMBODIA_PROVINCES[provinceName];
        if (coords) {
          position = [coords.lat, coords.lng];
        } else {
          return; // Skip if no coordinates
        }
      }
      
      const satisfactionRate = data.total > 0 
        ? (data.satisfied / data.total) * 100 
        : 0;
      
      processedData.push({
        id: `province-${provinceKey}`,
        name: provinceName,
        position: position,
        total: data.total,
        satisfied: data.satisfied,
        satisfactionRate: Math.round(satisfactionRate * 10) / 10, // Round to 1 decimal
        sites: data.sites
      });
    });
    
    // Sort by total (most data first)
    processedData.sort((a, b) => b.total - a.total);
    
    setMapData(processedData);
  }, [surveyData, allSites, filteredData]);

  const getMarkerColor = (satisfactionRate) => {
    if (satisfactionRate >= 80) return '#22c55e'; // Green
    if (satisfactionRate >= 60) return '#eab308'; // Yellow
    if (satisfactionRate >= 40) return '#f97316'; // Orange
    return '#ef4444'; // Red
  };

  const getCircleRadius = (total) => {
    // Scale radius based on total records (min 5000, max 50000)
    return Math.max(5000, Math.min(50000, total * 100));
  };

  const getTileUrl = () => {
    switch (mapType) {
      case 'satellite':
        return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      case 'terrain':
        return 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
      case 'standard':
        return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      case 'apple':
      default:
        // Apple Maps-like clean style using CartoDB
        return 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
    }
  };

  const center = [12.5657, 104.9910]; // Center of Cambodia
  const zoom = 7;

  // Show map even if no data - just show empty map centered on Cambodia
  const showEmptyState = mapData.length === 0;

  const MapContent = () => (
    <div className={`relative ${isFullscreen ? 'fixed inset-0 z-[200]' : 'h-[600px] w-full overflow-hidden border border-primary/20'}`}>
      <MapContainer
        center={center}
        zoom={mapData.length > 1 ? 7 : 8}
        style={{ height: '100%', width: '100%', minHeight: '600px', zIndex: 1 }}
        scrollWheelZoom={true}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url={getTileUrl()}
          subdomains="abcd"
          maxZoom={19}
        />
        
        {mapData.length > 0 && (
          <MapBoundsFitter bounds={mapData.map(d => L.marker(d.position))} />
        )}

        {mapData
          .filter((location) => !selectedProvince || location.name === selectedProvince)
          .map((location) => {
          const color = getMarkerColor(location.satisfactionRate);
          const radius = getCircleRadius(location.total);
          
          return (
            <div key={location.id}>
              {/* Circle to show data volume */}
              <Circle
                center={location.position}
                radius={radius}
                pathOptions={{
                  fillColor: color,
                  fillOpacity: 0.2,
                  color: color,
                  weight: 2,
                  opacity: 0.6
                }}
              />
              
              {/* Marker */}
              <Marker
                position={location.position}
                icon={L.divIcon({
                  className: 'custom-marker',
                  html: `
                    <div style="
                      background-color: ${color};
                      width: 40px;
                      height: 40px;
                      border-radius: 50%;
                      border: 3px solid white;
                      box-shadow: 0 3px 10px rgba(0,0,0,0.4);
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      color: white;
                      font-weight: bold;
                      font-size: 11px;
                      cursor: pointer;
                      transition: transform 0.2s;
                    ">
                      ${Math.round(location.satisfactionRate)}%
                    </div>
                  `,
                  iconSize: [40, 40],
                  iconAnchor: [20, 20]
                })}
                eventHandlers={{
                  click: () => {
                    const provinceCoords = CAMBODIA_PROVINCES[location.name];
                    if (provinceCoords) {
                      setSelectedProvince(location.name);
                      setProvinceBoundary({
                        name: location.name,
                        coordinates: provinceCoords
                      });
                    }
                  }
                }}
              >
                <Popup className="custom-popup" lang={locale}>
                  <div className={`p-3 min-w-[240px] bg-card text-card-foreground ${locale === 'kh' ? 'font-khmer' : ''}`}>
                    <h3 className={`font-bold text-base mb-3 text-foreground border-b border-border pb-2 ${locale === 'kh' ? 'font-khmer' : ''}`}>
                      {location.name}
                    </h3>
                    <div className="space-y-2 text-sm text-foreground">
                      <div className="flex justify-between items-center">
                        <span className={`text-muted-foreground ${locale === 'kh' ? 'font-khmer' : ''}`}>
                          {locale === 'kh' ? 'សរុប' : 'Total Records'}:
                        </span>
                        <span className={`font-semibold text-foreground ${locale === 'kh' ? 'font-khmer' : ''}`}>{location.total}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={`text-muted-foreground ${locale === 'kh' ? 'font-khmer' : ''}`}>
                          {locale === 'kh' ? 'ពេញចិត្ត' : 'Satisfied'}:
                        </span>
                        <span className={`font-semibold text-green-600 dark:text-green-400 ${locale === 'kh' ? 'font-khmer' : ''}`}>{location.satisfied}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={`text-muted-foreground ${locale === 'kh' ? 'font-khmer' : ''}`}>
                          {locale === 'kh' ? 'អត្រាពេញចិត្ត' : 'Satisfaction Rate'}:
                        </span>
                        <Badge 
                          variant={location.satisfactionRate >= 80 ? 'default' : location.satisfactionRate >= 60 ? 'secondary' : 'destructive'}
                          className={`ml-2 ${locale === 'kh' ? 'font-khmer' : ''}`}
                        >
                          {location.satisfactionRate.toFixed(1)}%
                        </Badge>
                      </div>
                      {location.sites && location.sites.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-border">
                          <p className={`text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide ${locale === 'kh' ? 'font-khmer' : ''}`}>
                            {locale === 'kh' ? 'តំបន់' : 'Sites'} ({location.sites.length})
                          </p>
                          <div className="max-h-40 overflow-y-auto space-y-1">
                            {location.sites.slice(0, 8).map((site, idx) => (
                              <div key={idx} className={`text-xs py-1 px-2 hover:bg-muted/50 rounded ${locale === 'kh' ? 'font-khmer' : ''}`}>
                                <span className={`font-medium text-foreground ${locale === 'kh' ? 'font-khmer' : ''}`}>{site.name}</span>
                                <span className={`text-muted-foreground ml-2 ${locale === 'kh' ? 'font-khmer' : ''}`}>
                                  ({site.total} {locale === 'kh' ? 'កំណត់ត្រា' : 'records'})
                                </span>
                              </div>
                            ))}
                            {location.sites.length > 8 && (
                              <div className={`text-xs text-muted-foreground pt-1 ${locale === 'kh' ? 'font-khmer' : ''}`}>
                                +{location.sites.length - 8} {locale === 'kh' ? 'ផ្សេងទៀត' : 'more sites'}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            </div>
          );
        })}
        
        {/* Province Boundary */}
        {provinceBoundary && (
          <ProvinceBoundary
            provinceName={provinceBoundary.name}
            coordinates={provinceBoundary.coordinates}
            onClose={() => {
              setProvinceBoundary(null);
              setSelectedProvince(null);
            }}
          />
        )}
      </MapContainer>


      {/* Empty State Overlay */}
      {showEmptyState && (
        <div className="absolute inset-0 flex items-center justify-center z-[500]">
          <div className="text-center p-6">
            <FaInfoCircle className="h-16 w-16 mx-auto mb-4 text-primary/60" />
            <p className="text-lg font-semibold text-foreground mb-2">
              {locale === 'kh' 
                ? 'គ្មានទិន្នន័យសម្រាប់បង្ហាញ' 
                : 'No geographic data available'}
            </p>
            <p className="text-sm text-muted-foreground">
              {locale === 'kh' 
                ? 'សូមជ្រើសរើសចន្លោះកាលបរិច្ឆេទនិងចុចចាប់ផ្តើមវិភាគ' 
                : 'Please select a date range and click Start Analysis'}
            </p>
          </div>
        </div>
      )}

      {/* Legend */}
      {!showEmptyState && (
      <div className={`absolute bottom-4 left-4 border border-primary/20 p-3 shadow-xl z-[1000] max-w-[220px] ${locale === 'kh' ? 'font-khmer' : ''}`}>
        <h4 className={`font-bold text-sm mb-3 text-foreground ${locale === 'kh' ? 'font-khmer' : ''}`}>
          {locale === 'kh' ? 'អត្រាពេញចិត្ត' : 'Satisfaction Rate'}
        </h4>
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-green-500 border-2 border-white shadow-sm"></div>
            <span className={`font-medium ${locale === 'kh' ? 'font-khmer' : ''}`}>≥ 80%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-yellow-500 border-2 border-white shadow-sm"></div>
            <span className={`font-medium ${locale === 'kh' ? 'font-khmer' : ''}`}>60-79%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-orange-500 border-2 border-white shadow-sm"></div>
            <span className={`font-medium ${locale === 'kh' ? 'font-khmer' : ''}`}>40-59%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-red-500 border-2 border-white shadow-sm"></div>
            <span className={`font-medium ${locale === 'kh' ? 'font-khmer' : ''}`}>&lt; 40%</span>
          </div>
        </div>
        <div className={`mt-3 pt-3 border-t border-primary/20 text-xs text-muted-foreground ${locale === 'kh' ? 'font-khmer' : ''}`}>
          <p className={`font-medium ${locale === 'kh' ? 'font-khmer' : ''}`}>
            {locale === 'kh' 
              ? 'រង្វង់បង្ហាញបរិមាណទិន្នន័យ' 
              : 'Circle size = Data volume'}
          </p>
        </div>
      </div>
      )}

      {/* Close Province Boundary Button */}
      {provinceBoundary && (
        <div className={`absolute top-4 left-4 z-[1000] ${locale === 'kh' ? 'font-khmer' : ''}`}>
          <Button
            onClick={() => {
              setProvinceBoundary(null);
              setSelectedProvince(null);
            }}
            variant="outline"
            size="sm"
            className="border border-primary/20"
          >
            {locale === 'kh' ? 'បិទព្រំដែន' : 'Close Boundary'}
          </Button>
        </div>
      )}

      {/* Controls: Map Type, Province Selector, and Fullscreen */}
      <div className={`absolute top-4 right-4 z-[1000] flex gap-2 items-center ${locale === 'kh' ? 'font-khmer' : ''}`}>
        {/* Map Type Selector */}
        <Select value={mapType} onValueChange={setMapType}>
          <SelectTrigger className={`w-[140px] border border-primary/20 rounded-none ${locale === 'kh' ? 'font-khmer' : ''}`}>
            <SelectValue placeholder={locale === 'kh' ? 'ផែនទី' : 'Map'} />
          </SelectTrigger>
          <SelectContent className="rounded-none">
            <SelectItem value="apple" className={locale === 'kh' ? 'font-khmer' : ''}>{locale === 'kh' ? 'ផែនទី' : 'Map'}</SelectItem>
            <SelectItem value="satellite" className={locale === 'kh' ? 'font-khmer' : ''}>{locale === 'kh' ? 'ផែនទីផ្កាយរណប' : 'Satellite'}</SelectItem>
            <SelectItem value="standard" className={locale === 'kh' ? 'font-khmer' : ''}>{locale === 'kh' ? 'ផែនទីស្តង់ដារ' : 'Standard'}</SelectItem>
            <SelectItem value="terrain" className={locale === 'kh' ? 'font-khmer' : ''}>{locale === 'kh' ? 'ផែនទីភូមិសាស្ត្រ' : 'Terrain'}</SelectItem>
          </SelectContent>
        </Select>
        
        {/* Province Selector */}
        <Select value={selectedProvince || 'all'} onValueChange={(value) => setSelectedProvince(value === 'all' ? null : value)}>
          <SelectTrigger className={`w-[180px] border border-primary/20 rounded-none ${locale === 'kh' ? 'font-khmer' : ''}`}>
            <SelectValue placeholder={locale === 'kh' ? 'ជ្រើសរើសខេត្ត/ក្រុង' : 'Select Province/City'} />
          </SelectTrigger>
          <SelectContent className="rounded-none">
            <SelectItem value="all" className={locale === 'kh' ? 'font-khmer' : ''}>{locale === 'kh' ? 'ទាំងអស់' : 'All Provinces'}</SelectItem>
            {availableProvinces.map((province) => (
              <SelectItem key={province} value={province} className={locale === 'kh' ? 'font-khmer' : ''}>{province}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {/* Fullscreen Toggle */}
        <Button
          onClick={() => setIsFullscreen(!isFullscreen)}
          className={locale === 'kh' ? 'font-khmer' : ''}
          size="sm"
          variant="outline"
        >
          {isFullscreen ? (
            <>
              <FaCompress className="h-4 w-4 mr-2" />
              {locale === 'kh' ? 'បិទ' : 'Exit Fullscreen'}
            </>
          ) : (
            <>
              <FaExpand className="h-4 w-4 mr-2" />
              {locale === 'kh' ? 'ពេញអេក្រង់' : 'Fullscreen'}
            </>
          )}
        </Button>
      </div>
    </div>
  );

  return (
    <Card className={`border-primary/20 shadow-xl rounded-none ${locale === 'kh' ? 'font-khmer' : ''}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className={`flex items-center gap-2 ${locale === 'kh' ? 'font-khmer' : ''}`}>
            <FaMapMarkerAlt className="h-5 w-5 text-primary" />
            {locale === 'kh' ? 'ផែនទីតាមតំបន់' : 'Geographic Analysis Map'}
          </CardTitle>
          {mapData.length > 0 && (
            <Badge variant="secondary" className={locale === 'kh' ? 'font-khmer' : ''}>
              {mapData.length} {locale === 'kh' ? 'តំបន់' : 'Locations'}
            </Badge>
          )}
          {mapData.length === 0 && (
            <Badge variant="outline" className={locale === 'kh' ? 'font-khmer' : ''}>
              {locale === 'kh' ? 'គ្មានទិន្នន័យ' : 'No Data'}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="w-full" style={{ minHeight: '600px' }}>
          <MapContent />
        </div>
      </CardContent>
    </Card>
  );
}
