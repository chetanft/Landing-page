# Image Assets Setup Guide

## Problem
The images in `LoginPage.tsx` were using Figma MCP asset URLs that expire and are not publicly accessible. These URLs are temporary and meant only for initial development/testing.

## Solution
Download the images from Figma and save them to the `public/assets/` folder.

## Figma Design File
**Design URL**: https://www.figma.com/design/UrgiE4l2RIBbZi5XO6kwBV/Log-In?node-id=1-25256&t=hLaXrPBkVVGuZdCw-4

**File Key**: `UrgiE4l2RIBbZi5XO6kwBV`  
**Node ID**: `1:25256`

## Required Images

You need to download and save these 3 images:

1. **Google Icon** (`google-icon.svg`)
   - Original Figma asset ID: `13062fc2-c406-4ddd-8549-63779e808e07`
   - Save as: `public/assets/google-icon.svg`
   - Used for: Google sign-in button

2. **Microsoft Logo** (`microsoft-logo.svg`)
   - Original Figma asset ID: `04ddcc59-4e7d-4aa6-b48e-228144fdee86`
   - Save as: `public/assets/microsoft-logo.svg`
   - Used for: Microsoft sign-in button

3. **Product Showcase Image** (`product-showcase.png`)
   - Original Figma asset ID: `6ba08004-7545-4ac5-b376-0d7edaf671f7`
   - Save as: `public/assets/product-showcase.png`
   - Used for: Product slides carousel on login page

## How to Download from Figma

### Option 1: Using Figma Desktop App
1. Open your Figma design file
2. Select the image/component you want to export
3. In the right sidebar, click "Export" or use the export panel
4. Choose the appropriate format (SVG for icons, PNG/JPG for images)
5. Click "Export [filename]" and save to `public/assets/` folder

### Option 2: Using Figma Web
1. Open your Figma design in the browser
2. Select the image/component
3. Right-click → "Copy as PNG" or use Export options
4. Save the file to `public/assets/` with the correct filename

### Option 3: Using Figma MCP Tools (if available)
If you have access to Figma MCP tools, you can use the `get_screenshot` tool to export images programmatically.

## File Structure

After downloading, your `public/assets/` folder should look like:

```
public/
└── assets/
    ├── google-icon.svg
    ├── microsoft-logo.svg
    ├── product-showcase.png
    ├── freight-tiger-logo.svg (existing)
    ├── jsw-logo.png (existing)
    ├── shadowfax-logo.png (existing)
    └── tata-motors-logo.png (existing)
```

## Verification

After adding the images:
1. Restart your development server (`npm run dev`)
2. Navigate to the login page
3. Check the browser console for any image loading errors
4. Verify all images display correctly

## Error Handling

The code now includes error handling that will:
- Hide broken images gracefully
- Log warnings to the console if images fail to load
- Prevent the UI from breaking if images are missing

## Notes

- SVG format is preferred for icons (Google, Microsoft) as they scale better
- PNG/JPG format is fine for the product showcase image
- Make sure file names match exactly what's in the code
- Images are served from `/assets/` path (Vite automatically serves files from `public/`)
