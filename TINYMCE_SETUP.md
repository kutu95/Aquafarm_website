# TinyMCE Setup

## Overview
We've successfully replaced CKEditor with TinyMCE, which provides a more reliable and feature-rich rich text editing experience.

## Features
- ✅ **Working Enter key** - Creates new paragraphs properly
- ✅ **Visible toolbar** - All formatting options are clearly visible
- ✅ **Image upload** - Direct upload to Supabase storage
- ✅ **Media library** - Select from previously uploaded images
- ✅ **Image resizing** - Resize images with presets or custom dimensions
- ✅ **Image captions** - Add captions to images
- ✅ **Rich formatting** - Bold, italic, lists, links, tables, etc.
- ✅ **Responsive design** - Works well on different screen sizes

## Image Resize Features
The editor now includes comprehensive image resize functionality:

### **Size Presets:**
- **Small** - Max width 200px
- **Medium** - Max width 400px  
- **Large** - Max width 600px
- **Responsive** - 100% width, auto height

### **Custom Dimensions:**
- Set exact width and height in pixels
- Maintain aspect ratio automatically
- Override preset sizes with custom values

### **Additional Options:**
- **Alt Text** - For accessibility
- **Captions** - Optional image captions
- **Preview** - See how the image will look before inserting

## API Key Setup
TinyMCE requires an API key for production use. To get a free API key:

1. Go to [TinyMCE Cloud](https://www.tiny.cloud/)
2. Sign up for a free account
3. Get your API key from the dashboard
4. Replace `"your-tinymce-api-key"` in `components/TinyMCE.js` with your actual API key

**Note**: The editor will work without an API key in development, but you'll see a warning message.

## Usage
The TinyMCE editor is now integrated into the dashboard and provides:

- **Text formatting**: Bold, italic, headings, lists, etc.
- **Image insertion**: Click the image button or use the "Insert Image" button
- **Image resizing**: Choose from presets or set custom dimensions
- **Media library**: Access previously uploaded images
- **Tables**: Insert and format tables
- **Links**: Add and edit links
- **Code view**: Switch to HTML view for advanced editing

## Benefits over CKEditor
- ✅ No Enter key issues
- ✅ Reliable toolbar display
- ✅ Better image handling with resize options
- ✅ More stable performance
- ✅ Better documentation and support
- ✅ Smaller bundle size
- ✅ Advanced image features (captions, alt text, custom sizing)

## File Structure
- `components/TinyMCE.js` - Main TinyMCE component with image resize features
- `pages/dashboard.js` - Updated to use TinyMCE
- Removed: `components/CKEditor.js` and `components/CKEditorClient.js`

## Next Steps
1. Get your TinyMCE API key
2. Test the editor functionality
3. Test image resize features
4. Customize the toolbar if needed
5. Add any additional plugins as required 