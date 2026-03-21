

## Fix: QR codes visibility on mobile

### Problem
From the screenshot, the QR code in QRShareSheet's QRView is overflowing to the right on mobile (384px viewport). The QR image is partially clipped and the "Want to see..." label is cut off.

### Root Causes
1. **QRCodeCard** uses a fixed `visualSize` of `Math.min(size, 220)` = 200px, plus `p-3` padding on the wrapper = ~224px total. This is fine width-wise but the parent dialog may not be constraining properly.
2. **QRShareSheet DialogContent** uses `w-[calc(100vw-1rem)]` which is correct, but the QR view content doesn't properly center/constrain within it.
3. The header area in QRView has the icon + italic text that can push content wide.

### Fixes

**1. QRCodeCard.tsx**
- Make the QR size responsive: use `min(size, calc(100% available))` approach
- Remove hard `Math.min(size, 220)` cap — instead use a responsive max based on container
- Ensure the wrapper uses `max-w-full` and `overflow-hidden`

**2. QRShareSheet.tsx — QRView**
- Add `overflow-hidden` to the main container
- Ensure the header gradient section constrains text with proper truncation
- Center the QR code properly with `w-full` and `items-center`
- Add `max-w-full` constraints to prevent any horizontal overflow

**3. QRShareSheet.tsx — DialogContent**
- Ensure `overflow-x-hidden` on the dialog to prevent horizontal scroll

### Changes
- `src/components/sharing/QRCodeCard.tsx`: Make size responsive, add `max-w-full overflow-hidden` on wrapper
- `src/components/sharing/QRShareSheet.tsx`: Add overflow constraints to QRView, fix header text truncation

