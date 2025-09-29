# Convert Cropify Emblem to Favicon

Your Cropify emblem has been copied to the public directory, but for optimal favicon support, you should convert it to ICO format.

## Current Files Created
- `public/favicon.png` - Your Cropify emblem
- `public/apple-touch-icon.png` - For iOS devices
- `public/favicon.ico` - Copy of PNG (should be converted to proper ICO)

## Convert to ICO Format

### Option 1: Online Converter (Recommended)
1. Visit https://favicon.io/favicon-converter/
2. Upload your `public/favicon.png` file
3. Download the generated `favicon.ico`
4. Replace `public/favicon.ico` with the downloaded file

### Option 2: Alternative Online Tools
- https://convertio.co/png-ico/
- https://www.icoconverter.com/
- https://favicon-generator.org/

### Option 3: Command Line (if you have ImageMagick)
```bash
magick public/favicon.png -resize 32x32 public/favicon.ico
```

## Test Your Favicon

1. **Build and serve locally**:
   ```bash
   npm run build
   npm run preview
   ```

2. **Check in browser**:
   - Open your website
   - Look at the browser tab
   - You should see your green plant sprout emblem

3. **Clear browser cache** if needed:
   - Hard refresh (Ctrl+F5 or Cmd+Shift+R)

## Deploy

After testing locally:
```bash
firebase deploy
```

Your Cropify emblem should now appear as the favicon in browser tabs!
