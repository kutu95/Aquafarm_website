# Codebase Indexing

This document describes the barrel export (index) files created to improve code organization and simplify imports.

## Index Files Created

### Components
- `components/index.js` - All component exports (Layout, NavBar, Footer, etc.)

### Lib
- `lib/index.js` - Library exports (emailService, supabase client)

### Contexts
- `contexts/index.js` - Context exports (useLanguage, LanguageProvider)

### Locales
- `locales/index.js` - Translation exports (translations, t function)

## Usage Examples

### Before (direct imports)
```javascript
import Layout from '@/components/Layout'
import NavBar from '@/components/NavBar'
import Footer from '@/components/Footer'
import { supabase } from '@/lib/supabaseClient'
import { emailService } from '@/lib/emailService'
import { useLanguage } from '@/contexts/LanguageContext'
import { t } from '@/locales/translations'
```

### After (barrel exports)
```javascript
import { Layout, NavBar, Footer } from '@/components'
import { supabase, emailService } from '@/lib'
import { useLanguage } from '@/contexts'
import { t } from '@/locales'
```

## Available Exports

### Components
- `AnalyticsDashboard` - Analytics dashboard component
- `ApplicationConfirmationEmail` - Email confirmation component
- `DarkModeToggle` - Dark mode toggle component
- `EmailTemplate` - Email template component
- `EmailTemplates` - Email templates object
- `Footer` - Footer component
- `GoogleAnalytics` - Google Analytics component
- `initGA` - Initialize Google Analytics function
- `trackPageView` - Track page view function
- `trackEvent` - Track custom event function
- `GreenhouseMap` - Greenhouse map component
- `GreenhouseMapEditor` - Greenhouse map editor component
- `LanguageToggle` - Language toggle component
- `Layout` - Main layout component
- `MediaPicker` - Media picker component
- `NavBar` - Navigation bar component
- `TinyMCE` - TinyMCE editor component
- `TinyMCEWithScripts` - TinyMCE with scripts component

### Lib
- `supabase` - Supabase client instance
- `emailService` - Email service object with methods

### Contexts
- `useLanguage` - Language context hook
- `LanguageProvider` - Language context provider

### Locales
- `translations` - Translations object
- `t` - Translation function

## Notes

- All existing direct imports will continue to work - these index files are additive and don't break existing code.
- The index files use default exports where applicable and named exports for multiple exports.
- Google Analytics exports both the component and utility functions (initGA, trackPageView, trackEvent).

