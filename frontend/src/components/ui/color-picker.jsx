import { useState, useRef, useEffect } from 'react';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';
import { Card, CardContent } from './card';

// Convert HSL to RGB
const hslToRgb = (h, s, l) => {
  h /= 360;
  s /= 100;
  l /= 100;
  
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h * 6) % 2 - 1));
  const m = l - c / 2;
  
  let r, g, b;
  if (h < 1/6) { r = c; g = x; b = 0; }
  else if (h < 2/6) { r = x; g = c; b = 0; }
  else if (h < 3/6) { r = 0; g = c; b = x; }
  else if (h < 4/6) { r = 0; g = x; b = c; }
  else if (h < 5/6) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  
  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);
  
  return { r, g, b };
};

// Convert RGB to HSL
const rgbToHsl = (r, g, b) => {
  r /= 255;
  g /= 255;
  b /= 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  
  h = Math.round(h * 360);
  s = Math.round(s * 100);
  l = Math.round(l * 100);
  
  return { h, s, l };
};

// Convert hex to RGB
const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

// Convert RGB to hex
const rgbToHex = (r, g, b) => {
  return `#${[r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('')}`;
};

// Parse HSL string (format: "h s% l%")
const parseHsl = (hslString) => {
  if (!hslString) return null;
  const match = hslString.match(/(\d+)\s+(\d+)%\s+(\d+)%/);
  if (!match) return null;
  return {
    h: parseInt(match[1]),
    s: parseInt(match[2]),
    l: parseInt(match[3])
  };
};

// Format HSL to string
const formatHsl = (h, s, l) => {
  return `${h} ${s}% ${l}%`;
};

export function ColorPicker({ value, onChange, className = '' }) {
  // Initialize HSL from value prop (format: "h s% l%")
  const [hsl, setHsl] = useState(() => {
    if (value) {
      const parsed = parseHsl(value);
      if (parsed) return parsed;
    }
    // Default to a nice blue color
    return { h: 220, s: 70, l: 50 };
  });
  
  const [hex, setHex] = useState(() => {
    if (value) {
      const parsed = parseHsl(value);
      if (parsed) {
        const rgb = hslToRgb(parsed.h, parsed.s, parsed.l);
        return rgbToHex(rgb.r, rgb.g, rgb.b);
      }
    }
    return '#ff0000';
  });
  
  const [rgb, setRgb] = useState(() => {
    if (value) {
      const parsed = parseHsl(value);
      if (parsed) {
        return hslToRgb(parsed.h, parsed.s, parsed.l);
      }
    }
    return { r: 255, g: 0, b: 0 };
  });
  
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggingHue, setIsDraggingHue] = useState(false);
  const saturationRef = useRef(null);
  const hueRef = useRef(null);
  
  // Update HSL when value prop changes
  useEffect(() => {
    if (value) {
      const parsed = parseHsl(value);
      if (parsed) {
        setHsl(parsed);
        const rgbVal = hslToRgb(parsed.h, parsed.s, parsed.l);
        setRgb(rgbVal);
        setHex(rgbToHex(rgbVal.r, rgbVal.g, rgbVal.b));
      }
    }
  }, [value]);
  
  const updateColor = (newHsl) => {
    setHsl(newHsl);
    const rgbVal = hslToRgb(newHsl.h, newHsl.s, newHsl.l);
    setRgb(rgbVal);
    setHex(rgbToHex(rgbVal.r, rgbVal.g, rgbVal.b));
    onChange(formatHsl(newHsl.h, newHsl.s, newHsl.l));
  };
  
  const handleSaturationClick = (e) => {
    if (!saturationRef.current) return;
    const rect = saturationRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    
    updateColor({
      ...hsl,
      s: Math.round(x * 100),
      l: Math.round((1 - y) * 100)
    });
  };
  
  const handleSaturationMouseMove = (e) => {
    if (!isDragging || !saturationRef.current) return;
    handleSaturationClick(e);
  };
  
  const handleHueClick = (e) => {
    if (!hueRef.current) return;
    const rect = hueRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    
    updateColor({
      ...hsl,
      h: Math.round(x * 360)
    });
  };
  
  const handleHueMouseMove = (e) => {
    if (!isDraggingHue || !hueRef.current) return;
    handleHueClick(e);
  };
  
  const handleHexChange = (e) => {
    const newHex = e.target.value;
    if (/^#[0-9A-Fa-f]{6}$/.test(newHex)) {
      setHex(newHex);
      const rgbVal = hexToRgb(newHex);
      if (rgbVal) {
        const hslVal = rgbToHsl(rgbVal.r, rgbVal.g, rgbVal.b);
        updateColor(hslVal);
      }
    } else {
      setHex(newHex);
    }
  };
  
  const handleRgbChange = (component, val) => {
    const num = parseInt(val) || 0;
    const clamped = Math.max(0, Math.min(255, num));
    const newRgb = { ...rgb, [component]: clamped };
    setRgb(newRgb);
    const hslVal = rgbToHsl(newRgb.r, newRgb.g, newRgb.b);
    updateColor(hslVal);
  };
  
  const handleHslChange = (component, val) => {
    const num = parseInt(val) || 0;
    let newHsl = { ...hsl };
    if (component === 'h') {
      newHsl.h = Math.max(0, Math.min(360, num));
    } else {
      newHsl[component] = Math.max(0, Math.min(100, num));
    }
    updateColor(newHsl);
  };
  
  // Preset colors
  const presets = [
    { h: 0, s: 100, l: 50 },      // Red
    { h: 120, s: 100, l: 50 },    // Green
    { h: 240, s: 100, l: 50 },    // Blue
    { h: 60, s: 100, l: 50 },     // Yellow
    { h: 300, s: 100, l: 50 },    // Magenta
    { h: 180, s: 100, l: 50 },    // Cyan
    { h: 30, s: 100, l: 50 },     // Orange
    { h: 270, s: 100, l: 50 },    // Purple
    { h: 0, s: 0, l: 0 },         // Black
    { h: 0, s: 0, l: 50 },        // Gray
    { h: 0, s: 0, l: 100 },       // White
  ];
  
  const currentColor = `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
  const hueColor = `hsl(${hsl.h}, 100%, 50%)`;
  
  return (
    <Card className={className}>
      <CardContent className="p-4 space-y-4">
        {/* Saturation/Lightness Picker */}
        <div className="relative">
          <div
            ref={saturationRef}
            className="w-full h-48 rounded-lg cursor-crosshair overflow-hidden border border-border"
            style={{
              background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, ${hueColor}, #fff)`
            }}
            onClick={handleSaturationClick}
            onMouseDown={() => setIsDragging(true)}
            onMouseUp={() => setIsDragging(false)}
            onMouseLeave={() => setIsDragging(false)}
            onMouseMove={handleSaturationMouseMove}
          >
            <div
              className="absolute w-4 h-4 rounded-full border-2 border-white shadow-lg pointer-events-none"
              style={{
                left: `${hsl.s}%`,
                top: `${100 - hsl.l}%`,
                transform: 'translate(-50%, -50%)',
                backgroundColor: currentColor
              }}
            />
          </div>
        </div>
        
        {/* Hue Slider */}
        <div className="relative">
          <div
            ref={hueRef}
            className="w-full h-4 rounded-lg cursor-pointer overflow-hidden border border-border"
            style={{
              background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)'
            }}
            onClick={handleHueClick}
            onMouseDown={() => setIsDraggingHue(true)}
            onMouseUp={() => setIsDraggingHue(false)}
            onMouseLeave={() => setIsDraggingHue(false)}
            onMouseMove={handleHueMouseMove}
          >
            <div
              className="absolute w-2 h-full border-2 border-white shadow-lg pointer-events-none"
              style={{
                left: `${(hsl.h / 360) * 100}%`,
                transform: 'translateX(-50%)'
              }}
            />
          </div>
        </div>
        
        {/* Color Preview */}
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-lg border-2 border-border shadow-lg"
            style={{ backgroundColor: currentColor }}
          />
          <div className="flex-1 space-y-2">
            <div>
              <Label className="text-xs text-muted-foreground">HEX</Label>
              <Input
                type="text"
                value={hex}
                onChange={handleHexChange}
                className="font-mono text-sm"
                placeholder="#000000"
              />
            </div>
          </div>
        </div>
        
        {/* RGB Inputs */}
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-xs text-muted-foreground">R</Label>
            <Input
              type="number"
              min="0"
              max="255"
              value={rgb.r}
              onChange={(e) => handleRgbChange('r', e.target.value)}
              className="text-sm"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">G</Label>
            <Input
              type="number"
              min="0"
              max="255"
              value={rgb.g}
              onChange={(e) => handleRgbChange('g', e.target.value)}
              className="text-sm"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">B</Label>
            <Input
              type="number"
              min="0"
              max="255"
              value={rgb.b}
              onChange={(e) => handleRgbChange('b', e.target.value)}
              className="text-sm"
            />
          </div>
        </div>
        
        {/* HSL Inputs */}
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-xs text-muted-foreground">H</Label>
            <Input
              type="number"
              min="0"
              max="360"
              value={hsl.h}
              onChange={(e) => handleHslChange('h', e.target.value)}
              className="text-sm"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">S</Label>
            <Input
              type="number"
              min="0"
              max="100"
              value={hsl.s}
              onChange={(e) => handleHslChange('s', e.target.value)}
              className="text-sm"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">L</Label>
            <Input
              type="number"
              min="0"
              max="100"
              value={hsl.l}
              onChange={(e) => handleHslChange('l', e.target.value)}
              className="text-sm"
            />
          </div>
        </div>
        
        {/* Preset Colors */}
        <div>
          <Label className="text-xs text-muted-foreground mb-2 block">Presets</Label>
          <div className="grid grid-cols-6 gap-2">
            {presets.map((preset, index) => {
              const presetColor = `hsl(${preset.h}, ${preset.s}%, ${preset.l}%)`;
              return (
                <button
                  key={index}
                  className="w-8 h-8 rounded-md border-2 border-border hover:scale-110 transition-transform cursor-pointer"
                  style={{ backgroundColor: presetColor }}
                  onClick={() => updateColor(preset)}
                  title={`H: ${preset.h}, S: ${preset.s}%, L: ${preset.l}%`}
                />
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
