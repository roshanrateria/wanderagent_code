import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { Capacitor } from '@capacitor/core';
import { ICON_SRC } from './assetPath';

interface ExportOptions {
  fileName?: string;
}

// Helper: convert Uint8Array to base64 (module scope)
function uint8ArrayToBase64(u8: Uint8Array) {
  let CHUNK_SIZE = 0x8000;
  let index = 0;
  const length = u8.length;
  let result = '';
  while (index < length) {
    const slice = u8.subarray(index, Math.min(index + CHUNK_SIZE, length));
    result += String.fromCharCode.apply(null, Array.from(slice));
    index += CHUNK_SIZE;
  }
  if (typeof btoa !== 'undefined') return btoa(result);
  return Buffer.from(u8).toString('base64');
}

// Helper: wrap text to fit max width using a font's width measurement
function wrapText(text: string, font: any, size: number, maxWidth: number) {
  const words = String(text || '').split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const w of words) {
    const trial = current ? `${current} ${w}` : w;
    const width = font.widthOfTextAtSize(trial, size);
    if (width <= maxWidth) {
      current = trial;
    } else {
      if (current) lines.push(current);
      // if single word too long, push truncated piece
      if (font.widthOfTextAtSize(w, size) > maxWidth) {
        // split the long word
        let part = '';
        for (const ch of w) {
          const tryPart = part + ch;
          if (font.widthOfTextAtSize(tryPart + '-', size) > maxWidth) {
            if (part) lines.push(part + '-');
            part = ch;
          } else {
            part = tryPart;
          }
        }
        if (part) lines.push(part);
        current = '';
      } else {
        current = w;
      }
    }
  }
  if (current) lines.push(current);
  return lines;
}

// Helper: try to fetch and embed an image (jpg/png). Returns embedded image or null.
async function tryEmbedImage(pdfDoc: any, url?: string) {
  if (!url) return null;
  try {
    const resp = await fetch(String(url));
    if (!resp.ok) return null;
    const buf = await resp.arrayBuffer();
    const urlLower = String(url).toLowerCase();
    if (urlLower.endsWith('.png')) {
      return await pdfDoc.embedPng(new Uint8Array(buf));
    }
    // default to jpg
    return await pdfDoc.embedJpg(new Uint8Array(buf));
  } catch (e) {
    return null;
  }
}

export async function exportItineraryToPdf(itinerary: any, options?: ExportOptions): Promise<{ success: boolean; blobUrl?: string; filePath?: string; error?: string }> {
  try {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont((StandardFonts as any).HelveticaBold || StandardFonts.Helvetica);

    // Visual constants (sky pastel accent + dark blue)
    const ACCENT_SKY = rgb(0.69, 0.88, 0.94); // pastel sky blue
    const ACCENT_DARK = rgb(0.06, 0.2, 0.5); // dark blue
    const MUTED = rgb(0.35, 0.38, 0.45);

    // Try to embed app icon from public path (client/public/icon.png)
    const embeddedLogo = await tryEmbedImage(pdfDoc, ICON_SRC);

    // make places available to helpers and grouping (declare once)
    const places = Array.isArray(itinerary.places) ? itinerary.places : [];

    // Helper: get a stable day key for a place/item (supports many common field names and date grouping)
    const getPlaceDayKey = (p: any) => {
      if (!p) return '1';
      // explicit numeric day
      if (typeof p.day === 'number') return String(p.day);
      if (typeof p.day === 'string' && /^\d+$/.test(p.day)) return p.day;
      if (typeof p.dayIndex === 'number') return String(p.dayIndex + 1);
      if (typeof p.dayNumber === 'number') return String(p.dayNumber);
      if (typeof p.dayNo === 'number') return String(p.dayNo);
      if (typeof p.day_of_trip === 'number') return String(p.day_of_trip);
      if (p.startDate || p.date || p.scheduledDate || p.scheduled_at) {
        const dt = new Date(p.startDate || p.date || p.scheduledDate || p.scheduled_at);
        if (!isNaN(dt.getTime())) return dt.toISOString().slice(0,10); // use ISO date string as key
      }
      return '1';
    };

    // Helper: normalize description fields from many possible names
    const normalizeDescription = (obj: any) => {
      if (!obj) return obj;
      if (!obj.description) {
        obj.description = obj.description || obj.summary || obj.notes || obj.descriptionHtml || obj.longDescription || obj.details || obj.body || obj.blurb || '';
      }
      return obj;
    };

    // --- Grouping for multi-day support (prefer itinerary.multiDay.days, fallback to per-place day fields) ---
    const grouped: any[] = [];

    if (itinerary?.multiDay && Array.isArray(itinerary.multiDay.days) && itinerary.multiDay.days.length) {
      // expect days to be objects that may include .places, .items or .meals
      for (let di = 0; di < itinerary.multiDay.days.length; di++) {
        const dayObj = itinerary.multiDay.days[di] || {};
        const dayNum = typeof dayObj.day === 'number' ? dayObj.day : di + 1;
        const dayItems: any[] = [];

        // collect explicit places/items: support id references by looking up in top-level places
        if (Array.isArray(dayObj.places)) {
          for (const it of dayObj.places) {
            if (it && (typeof it === 'string' || typeof it === 'number') && Array.isArray(places)) {
              // try to resolve by id/_id or name
              const found = places.find((pp: any) => String(pp?.id) === String(it) || String(pp?._id) === String(it) || String(pp?.placeId) === String(it) || String(pp?.name) === String(it));
              dayItems.push(normalizeDescription(found || { id: it }));
            } else {
              dayItems.push(normalizeDescription(it));
            }
          }
        }
        if (Array.isArray(dayObj.items)) dayItems.push(...(dayObj.items.map((it: any) => normalizeDescription(it))));
        // meals array may be present
        if (Array.isArray(dayObj.meals)) {
          for (const m of dayObj.meals) {
            dayItems.push(normalizeDescription({ _isMeal: true, mealType: m.type || m.mealType || m.title || 'Meal', scheduledTime: m.time || m.scheduledTime || m.scheduled_at, description: m.description || m.notes || m.title || '', day: dayNum }));
          }
        }
        grouped.push({ day: dayNum, places: dayItems });
      }
    } else {
      // Fallback: collect places and top-level meals, group by inferred day key (supports date keys too)
      const map = new Map<string, any[]>();

      // include top-level places
      for (const p of places) {
        const key = getPlaceDayKey(p);
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(normalizeDescription(p));
      }

      // include top-level itinerary.items or itinerary.placesItems
      if (Array.isArray(itinerary.items)) {
        for (const it of itinerary.items) {
          const key = getPlaceDayKey(it);
          if (!map.has(key)) map.set(key, []);
          map.get(key)!.push(normalizeDescription(it));
        }
      }

      // include top-level meals if present
      if (Array.isArray(itinerary.meals)) {
        for (const m of itinerary.meals) {
          const key = getPlaceDayKey(m);
          if (!map.has(key)) map.set(key, []);
          map.get(key)!.push(normalizeDescription({ _isMeal: true, mealType: m.type || m.mealType || m.title || 'Meal', scheduledTime: m.time || m.scheduledTime || m.scheduled_at, description: m.description || m.notes || m.title || '' }));
        }
      }

      // If map is empty, ensure at least day 1
      if (map.size === 0) map.set('1', []);

      // Determine ordering of keys: if keys look like ISO dates, sort chronologically and assign day numbers; else numeric sort
      const keys = Array.from(map.keys());
      let orderedKeys: string[];
      const looksLikeDate = keys.every(k => /^\d{4}-\d{2}-\d{2}$/.test(k));
      if (looksLikeDate) {
        orderedKeys = keys.sort((a,b) => new Date(a).getTime() - new Date(b).getTime());
        for (let i = 0; i < orderedKeys.length; i++) grouped.push({ day: i + 1, places: map.get(orderedKeys[i]) });
      } else {
        // numeric keys possibly as strings
        orderedKeys = keys.sort((a,b) => Number(a) - Number(b));
        for (const k of orderedKeys) grouped.push({ day: Number(k) || 1, places: map.get(k) });
      }
    }

    // Normalize: ensure places arrays exist and include description fields where possible
    for (const g of grouped) {
      g.places = g.places || [];
      for (const p of g.places) {
        normalizeDescription(p);
      }
    }

    // Helper: draw a small app 'logo' and page header bar to make PDFs look branded
    const drawPageHeader = (page: any, titleText: string, subText?: string) => {
      const { width, height } = page.getSize();
      const headerH = 64;
      // top bar background
      page.drawRectangle({ x: 0, y: height - headerH, width, height: headerH, color: ACCENT_SKY });
      // logo area
      const logoSize = 44;
      const logoX = 36;
      const logoY = height - headerH + (headerH - logoSize) / 2;
      if (embeddedLogo) {
        try {
          page.drawImage(embeddedLogo, { x: logoX, y: logoY, width: logoSize, height: logoSize });
        } catch (err) {
          // fallback to box
          page.drawRectangle({ x: logoX, y: logoY, width: logoSize, height: logoSize, color: ACCENT_DARK });
        }
      } else {
        page.drawRectangle({ x: logoX, y: logoY, width: logoSize, height: logoSize, color: ACCENT_DARK });
        page.drawText('WA', { x: logoX + 10, y: logoY + 12, size: 16, font: fontBold, color: rgb(1,1,1) });
      }
      // title and subtitle (aligned with logo)
      page.drawText(titleText, { x: logoX + logoSize + 14, y: height - headerH + headerH / 2 + 6, size: 14, font: fontBold, color: ACCENT_DARK });
      if (subText) page.drawText(subText, { x: logoX + logoSize + 14, y: height - headerH + headerH / 2 - 8, size: 10, font, color: MUTED });

      // decorative icons on the right: use embedded logo scaled small if available, else colored squares
      const iconSize = 12;
      let ix = width - 36 - (iconSize * 3 + 8);
      for (let k = 0; k < 3; k++) {
        if (embeddedLogo) {
          try {
            page.drawImage(embeddedLogo, { x: ix, y: height - headerH + (headerH - iconSize) / 2, width: iconSize, height: iconSize });
          } catch (err) {
            page.drawRectangle({ x: ix, y: height - headerH + (headerH - iconSize) / 2, width: iconSize, height: iconSize, color: [ACCENT_DARK, ACCENT_SKY, rgb(0.9,0.9,0.95)][k] });
          }
        } else {
          page.drawRectangle({ x: ix, y: height - headerH + (headerH - iconSize) / 2, width: iconSize, height: iconSize, color: [ACCENT_DARK, ACCENT_SKY, rgb(0.9,0.9,0.95)][k] });
        }
        ix += iconSize + 4;
      }
    };

    // --- Cover page ---
    const cover = pdfDoc.addPage([595, 842]);
    const { width: cw, height: ch } = cover.getSize();
    // draw header/logo
    drawPageHeader(cover, 'My Travel Itinerary', itinerary.destination ? `Destination: ${itinerary.destination}` : 'Multi-stop trip');
    // Larger title under header
    const title = 'My Travel Itinerary';
    cover.drawText(title, { x: 40, y: ch - 120, size: 32, font: fontBold, color: ACCENT_DARK });
    const subtitle = itinerary.destination ? `Destination: ${itinerary.destination}` : 'Multi-stop trip';
    cover.drawText(subtitle, { x: 40, y: ch - 148, size: 12, font, color: MUTED });

    const metaLines: string[] = [];
    if (typeof itinerary.totalDays !== 'undefined') metaLines.push(`Days: ${itinerary.totalDays}`);
    if (typeof itinerary.totalDistance !== 'undefined') metaLines.push(`Distance: ${itinerary.totalDistance} km`);
    if (typeof itinerary.totalDuration !== 'undefined') metaLines.push(`Estimated time: ${itinerary.totalDuration} min`);
    metaLines.push(`Places: ${Array.isArray(itinerary.places) ? itinerary.places.length : 0}`);

    let metaY = ch - 170;
    for (const ml of metaLines) {
      cover.drawText(ml, { x: 40, y: metaY, size: 11, font, color: MUTED });
      metaY -= 14;
    }

    // Try to embed up to 2 images from first places
    // places already declared above for helpers
    // const places = Array.isArray(itinerary.places) ? itinerary.places : [];
    const imgSlots = Math.min(2, places.length);
    for (let i = 0; i < imgSlots; i++) {
      const p = places[i];
      const img = await tryEmbedImage(pdfDoc, p?.photoUrl);
      const slotW = (cw - 120) / 2;
      const slotH = 120;
      const imgX = 40 + i * (slotW + 20);
      const imgY = ch - 280;
      if (img) {
        const ratio = img.width / img.height;
        let drawW = slotW;
        let drawH = slotW / ratio;
        if (drawH > slotH) {
          drawH = slotH;
          drawW = slotH * ratio;
        }
        cover.drawImage(img, { x: imgX, y: imgY, width: drawW, height: drawH });
      } else {
        // placeholder rectangle
        cover.drawRectangle({ x: imgX, y: imgY, width: slotW, height: slotH, color: rgb(0.95, 0.95, 0.95) });
        cover.drawText(p?.name || 'No image', { x: imgX + 8, y: imgY + slotH / 2 - 6, size: 10, font, color: rgb(0.4, 0.4, 0.4) });
      }
    }

    // Flights removed from cover by user request; no flight summary is drawn on the cover.

    // --- Timeline pages ---
    for (let gi = 0; gi < grouped.length; gi++) {
      const dayBlock = grouped[gi];
      let np = pdfDoc.addPage([595, 842]);
      const { width: tw, height: th } = np.getSize();
      drawPageHeader(np, 'Trip Timeline', `Day ${dayBlock.day}`);
      let ty = th - 110;
      const lineX = 120;
      // vertical line
      np.drawRectangle({ x: lineX - 1, y: 80, width: 2, height: ty - 80, color: rgb(0.9, 0.9, 0.95) });

      for (let i = 0; i < dayBlock.places.length; i++) {
        const p = dayBlock.places[i];
        if (ty < 140) {
          // continue on next page for same day
          np = pdfDoc.addPage([595, 842]);
          // redraw header for continuity
          drawPageHeader(np, 'Trip Timeline (cont.)', `Day ${dayBlock.day}`);
          ty = th - 110;
          np.drawRectangle({ x: lineX - 1, y: 80, width: 2, height: ty - 80, color: rgb(0.9, 0.9, 0.95) });
        }

        // Draw bullet (different color for meals)
        const isMeal = Boolean(p?._isMeal || p?.type === 'meal' || p?.mealType);
        np.drawRectangle({ x: lineX - 6, y: ty - 6, width: 8, height: 8, color: isMeal ? ACCENT_SKY : ACCENT_DARK });

        const timeText = p?.scheduledTime || p?.time || p?.scheduled || p?.scheduled_at ? String(p?.scheduledTime || p?.time || p?.scheduled || p?.scheduled_at) : '';
        if (timeText) np.drawText(timeText, { x: 40, y: ty - 4, size: 10, font, color: MUTED });

        const name = isMeal ? (p.mealType || p.type || 'Meal') : (p?.name || 'Unknown');
        const nameLines = wrapText(name, fontBold, 11, tw - (lineX + 60));
        let nameY = ty - 2;
        for (const nl of nameLines) {
          np.drawText(nl, { x: lineX + 10, y: nameY, size: 11, font: fontBold, color: ACCENT_DARK });
          nameY -= 13;
        }

        // description/snippet
        if (p?.description) {
          const descLines = wrapText(p.description, font, 9, tw - (lineX + 60));
          let descY = nameY - 4;
          for (const dl of descLines.slice(0, 4)) {
            np.drawText(dl, { x: lineX + 10, y: descY, size: 9, font, color: rgb(0.2, 0.2, 0.2) });
            descY -= 11;
          }
          nameY = descY;
        }

        ty = Math.min(nameY, ty - 42) - 12;
      }

      // if no items, leave a small note
      if (!dayBlock.places.length) {
        np.drawText('No items for this day.', { x: 40, y: th - 150, size: 10, font, color: MUTED });
      }
    }

    // --- Compact place cards: two per page ---
    const cardW = 515;
    const cardPadding = 12;
    const perPage = 2;
    // If itinerary uses days, render cards grouped by day with headers
    if (grouped && grouped.length) {
      // flatten grouped into pages while adding headers per day
      for (const blk of grouped) {
        for (let i = 0; i < blk.places.length; i += perPage) {
          const page = pdfDoc.addPage([595, 842]);
          const { width, height } = page.getSize();
          drawPageHeader(page, `Day ${blk.day}`, `Places ${i + 1} - ${Math.min(i + perPage, blk.places.length)}`);
          let startY = height - 100;
          for (let slot = 0; slot < perPage; slot++) {
            const idx = i + slot;
            if (idx >= blk.places.length) break;
            const p = blk.places[idx];
            const boxH = 220;
            const boxX = 40;
            const boxY = startY - boxH;

            // card background
            page.drawRectangle({ x: boxX, y: boxY, width: cardW, height: boxH - 6, color: rgb(0.98, 0.98, 0.98) });

            // Title (include meal badge)
            const isMeal = Boolean(p?._isMeal || p?.type === 'meal' || p?.mealType);
            const titleText = `${idx + 1}. ${isMeal ? (p.mealType || 'Meal') : (p?.name || 'Unknown')}`;
            page.drawText(titleText, { x: boxX + 10, y: boxY + boxH - 28, size: 13, font: fontBold, color: ACCENT_DARK });

            // Left text column area
            const textX = boxX + 10;
            let ty2 = boxY + boxH - 48;
            const small = 10;

            if (!isMeal && p?.category) {
              page.drawText(`Category: ${p.category}`, { x: textX, y: ty2, size: small, font });
              ty2 -= 12;
            }
            if (!isMeal && p?.address) {
              const addrLines = wrapText(p.address, font, 9, 280);
              for (const al of addrLines) {
                page.drawText(al, { x: textX, y: ty2, size: 9, font, color: rgb(0.2, 0.2, 0.2) });
                ty2 -= 11;
              }
            }
            if (p?.scheduledTime) {
              page.drawText(`Time: ${p.scheduledTime}`, { x: textX, y: ty2, size: small, font });
              ty2 -= 12;
            }
            if (typeof p?.estimatedDuration !== 'undefined') {
              page.drawText(`Duration: ${p.estimatedDuration} min`, { x: textX, y: ty2, size: small, font });
              ty2 -= 12;
            }
            if (typeof p?.rating !== 'undefined') {
              page.drawText(`Rating: ${p.rating}`, { x: textX, y: ty2, size: small, font });
              ty2 -= 12;
            }

            // description block (show a few lines)
            if (p?.description && !isMeal) {
              const descLines = wrapText(p.description, font, 9, 260);
              for (const dl of descLines.slice(0, 6)) {
                page.drawText(dl, { x: textX, y: ty2, size: 9, font, color: rgb(0.2, 0.2, 0.2) });
                ty2 -= 11;
              }
            }

            // Map link (plain text)
            let mapsUrl = '';
            if (typeof p?.latitude === 'number' && typeof p?.longitude === 'number') {
              mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${p.latitude},${p.longitude}`;
            } else if (p?.address) {
              mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.address)}`;
            }
            if (mapsUrl) {
              const mapsLines = wrapText(mapsUrl, font, 8, 260);
              for (const ml of mapsLines) {
                page.drawText(ml, { x: textX, y: ty2, size: 8, font, color: rgb(0, 0, 0.55) });
                ty2 -= 10;
              }
            }

            // Right: image area
            const imgAreaX = boxX + cardW - 160;
            const imgAreaY = boxY + 12;
            const imgAreaW = 140;
            const imgAreaH = boxH - 36;

            // Try to embed
            // eslint-disable-next-line no-await-in-loop
            const embedded = await tryEmbedImage(pdfDoc, p?.photoUrl);
            if (embedded) {
              // scale to fit
              const ratio = embedded.width / embedded.height;
              let drawW = imgAreaW;
              let drawH = drawW / ratio;
              if (drawH > imgAreaH) {
                drawH = imgAreaH;
                drawW = drawH * ratio;
              }
              const drawX = imgAreaX + (imgAreaW - drawW) / 2;
              const drawY = imgAreaY + (imgAreaH - drawH) / 2;
              page.drawImage(embedded, { x: drawX, y: drawY, width: drawW, height: drawH });
            } else {
              page.drawRectangle({ x: imgAreaX, y: imgAreaY, width: imgAreaW, height: imgAreaH, color: rgb(0.97, 0.97, 0.97) });
              page.drawText('No image', { x: imgAreaX + 10, y: imgAreaY + imgAreaH / 2 - 6, size: 10, font, color: rgb(0.5, 0.5, 0.5) });
            }

            startY = boxY - 10;
          }
        }
      }
    }

    const bytes = await pdfDoc.save();

    // Web: return blob URL for download
    const blob = new Blob([bytes], { type: 'application/pdf' });

    // Native handling via Capacitor
    if (Capacitor.isNativePlatform && (Capacitor.isNativePlatform() || ['android', 'ios'].includes(Capacitor.getPlatform?.() || ''))) {
      try {
        const fsModule = await import('@capacitor/filesystem');
        const shareModule = await import('@capacitor/share');
        const base64 = uint8ArrayToBase64(new Uint8Array(bytes));
        const name = options?.fileName || `itinerary-${Date.now()}.pdf`;
        await fsModule.Filesystem.writeFile({ path: name, data: base64, directory: (fsModule as any).Directory.Documents });
        await shareModule.Share.share({ title: 'Itinerary', text: 'Here is your itinerary', url: name });
        return { success: true, filePath: name };
      } catch (e) {
        // fallback to web blob
      }
    }

    const url = URL.createObjectURL(blob);
    return { success: true, blobUrl: url };
  } catch (e: any) {
    return { success: false, error: String(e?.message || e) };
  }
}

export default exportItineraryToPdf;
