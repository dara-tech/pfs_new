# Mobile App Design System

## Overview

The mobile app design system is built to match the web application's design language while being optimized for tablet devices. It ensures consistency, advanced styling, and a smooth workflow experience.

## Design Principles

1. **Consistency**: Matches web app colors, typography, and spacing
2. **Tablet-First**: Optimized layouts for larger screens (≥768px width)
3. **Accessibility**: Proper contrast, readable fonts, touch-friendly targets
4. **Modern UI**: Gradients, shadows, smooth animations
5. **Dark Mode**: Full support matching web app theme

## Color System

### Primary Colors (Green Theme)
- **Light Mode**: `#22c55e` (hsl(142, 76%, 36%))
- **Dark Mode**: `#4ade80` (hsl(142, 69%, 58%))
- **Gradients**: Matching web app gradient system

### Background Colors
- **Light**: `#ffffff`
- **Dark**: `#0f172a` (hsl(222.2 84% 4.9%))

### Text Colors
- **Primary Light**: `#0f172a`
- **Primary Dark**: `#f1f5f9`
- **Secondary Light**: `#64748b`
- **Secondary Dark**: `#94a3b8`

## Typography

### Font Families
- **Default**: System fonts (San Francisco on iOS, Roboto on Android)
- **Khmer**: Kantumruy Pro, Noto Sans Khmer, Khmer OS

### Font Sizes (Tablet Optimized)
- **H1**: 30-32px (Bold, 700)
- **H2**: 26-28px (Bold, 700)
- **H3**: 22-24px (Semi-bold, 600)
- **H4**: 18-20px (Semi-bold, 600)
- **Body Large**: 16-18px
- **Body Medium**: 15-16px
- **Body Small**: 13-14px

## Spacing System

### Base Spacing
- **xs**: 4px
- **sm**: 8px
- **md**: 16px
- **lg**: 24px
- **xl**: 32px
- **xxl**: 48px
- **xxxl**: 64px

### Screen Padding (Tablet)
- **Horizontal**: 32px
- **Vertical**: 24px

### Component Spacing
- **Card Padding**: 24px
- **Card Margin**: 16px
- **Card Gap**: 16px

## Components

### Cards
- **Border Radius**: 12-16px (xl)
- **Shadow**: Medium to Large
- **Border**: 1px (subtle)
- **Padding**: 24px (tablet), 20px (mobile)

### Buttons
- **Height**: 56px (mobile), 64px (tablet)
- **Border Radius**: 12px
- **Gradient Background**: Primary color gradient
- **Text**: Uppercase, 600 weight, letter-spacing

### Input Fields
- **Height**: 50px (mobile), 60px (tablet)
- **Border Radius**: 8px
- **Padding**: 15-20px
- **Border**: 1-2px

### Question Components
- **Card Style**: White/dark card with shadow
- **Option Buttons**: 56-64px height
- **Radio/Checkbox**: 24-28px size
- **Spacing**: 16px gap between options

## Layout Patterns

### Tablet Layouts
- **Max Width**: 800px (centered)
- **Two-Column**: Home screen cards side-by-side
- **Larger Touch Targets**: 64px minimum
- **Increased Padding**: 32px horizontal

### Mobile Layouts
- **Full Width**: 100% with padding
- **Single Column**: Stacked cards
- **Standard Touch Targets**: 56px minimum
- **Standard Padding**: 20-24px horizontal

## Shadows

### Shadow Levels
- **Small**: Subtle elevation (1-2px)
- **Medium**: Card elevation (3-4px)
- **Large**: Prominent elevation (5-8px)

## Border Radius

- **Small**: 4px
- **Medium**: 8px
- **Large**: 12px
- **Extra Large**: 16px
- **Full**: 9999px (circular)

## Dark Mode

All components support dark mode with:
- Inverted background colors
- Adjusted text colors for contrast
- Maintained primary color gradients
- Proper border and shadow adjustments

## Workflow Consistency

The mobile app workflow matches the web app:
1. **Home Screen**: Select questionnaire type
2. **Site Selection**: Choose site/location
3. **Questionnaire**: Step-by-step questions
4. **Progress Tracking**: Visual progress indicators
5. **Thank You**: Completion screen

## Responsive Breakpoints

- **Mobile**: < 768px width
- **Tablet**: ≥ 768px width

Components automatically adjust:
- Font sizes
- Padding/spacing
- Layout (single vs. two-column)
- Touch target sizes

## Implementation

All components use the centralized theme system:
```javascript
import { theme } from '../theme';
const { colors, typography, spacing } = theme;
```

This ensures consistency across all screens and makes theme updates easy.
