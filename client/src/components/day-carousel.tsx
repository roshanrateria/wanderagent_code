import React, { useMemo, useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface DayPlaceItem {
  order: number;
  name: string;
  category?: string;
  scheduledTime?: string;
  estimatedDuration?: number;
  reason?: string;
  fsqPlaceId?: string;
}

interface DayMealItem {
  name: string;
  scheduledTime?: string;
  estimatedDuration?: number;
}

interface DayData {
  day: number;
  date?: string;
  theme?: string;
  places?: DayPlaceItem[];
  meals?: { lunch?: DayMealItem; dinner?: DayMealItem };
}

interface DayCarouselProps {
  days: DayData[];
  editable?: boolean;
  onChange?: (days: DayData[]) => void;
  currentIndex?: number;
  onActiveIndexChange?: (index: number) => void;
  perDayMeta?: Record<number, { totalDistance?: number; totalDuration?: number; placesCount?: number }>;

}

const formatMinutes = (min?: number) => {
  if (!min && min !== 0) return "";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

export default function DayCarousel({ days, editable = false, onChange, currentIndex, onActiveIndexChange, perDayMeta }: DayCarouselProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [current, setCurrent] = useState(0);
  const [draftDays, setDraftDays] = useState<DayData[]>([]);
  const [mealEdit, setMealEdit] = useState<{ dayIdx: number; which: 'lunch' | 'dinner' } | null>(null);

  useEffect(() => {
    setDraftDays(JSON.parse(JSON.stringify(days || [])));
  }, [days]);

  const sortedDays = useMemo(() => {
    return [...(draftDays || [])].sort((a, b) => a.day - b.day);
  }, [draftDays]);

  const emitChange = (updated: DayData[]) => {
    setDraftDays(updated);
    onChange?.(updated);
  };

  const scrollToIndex = (index: number) => {
    const el = containerRef.current;
    if (!el) return;
    const child = el.children[index] as HTMLElement | undefined;
    if (child) child.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  };

  const handlePrev = () => {
    const next = Math.max(0, (typeof currentIndex === 'number' ? currentIndex : current) - 1);
    setCurrent(next);
    onActiveIndexChange?.(next);
    scrollToIndex(next);
  };

  const handleNext = () => {
    const base = (typeof currentIndex === 'number' ? currentIndex : current);
    const next = Math.min(sortedDays.length - 1, base + 1);
    setCurrent(next);
    onActiveIndexChange?.(next);
    scrollToIndex(next);
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => {
      const children = Array.from(el.children) as HTMLElement[];
      if (children.length === 0) return;
      const { scrollLeft, clientWidth } = el;
      let closestIdx = 0;
      let closestDist = Infinity;
      const viewportCenter = scrollLeft + clientWidth / 2;
      children.forEach((child, idx) => {
        const rectLeft = child.offsetLeft;
        const rectCenter = rectLeft + child.clientWidth / 2;
        const dist = Math.abs(rectCenter - viewportCenter);
        if (dist < closestDist) {
          closestDist = dist;
          closestIdx = idx;
        }
      });
      setCurrent(closestIdx);
      onActiveIndexChange?.(closestIdx);
    };
    el.addEventListener("scroll", onScroll, { passive: true } as any);
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const reorderWithinDay = (dayIndex: number, placeIndex: number, direction: -1 | 1) => {
    const updated = [...sortedDays].map(d => ({ ...d, places: [...(d.places || [])] }));
    const day = updated[dayIndex];
    if (!day || !day.places) return;
    const newIndex = placeIndex + direction;
    if (newIndex < 0 || newIndex >= day.places.length) return;
    const [moved] = day.places.splice(placeIndex, 1);
    day.places.splice(newIndex, 0, moved);
    day.places = day.places.map((p, idx) => ({ ...p, order: idx + 1 }));
    emitChange(updated);
  };

  const removeFromDay = (dayIndex: number, placeIndex: number) => {
    const updated = [...sortedDays].map(d => ({ ...d, places: [...(d.places || [])] }));
    const day = updated[dayIndex];
    if (!day || !day.places) return;
    day.places.splice(placeIndex, 1);
    day.places = day.places.map((p, idx) => ({ ...p, order: idx + 1 }));
    emitChange(updated);
  };

  const movePlaceToDay = (fromDayIdx: number, placeIndex: number, toDayIdx: number) => {
    if (toDayIdx < 0 || toDayIdx >= sortedDays.length) return;
    const updated = [...sortedDays].map(d => ({ ...d, places: [...(d.places || [])] }));
    const fromDay = updated[fromDayIdx];
    const toDay = updated[toDayIdx];
    if (!fromDay || !fromDay.places || !toDay) return;
    const [moved] = fromDay.places.splice(placeIndex, 1);
    toDay.places = toDay.places || [];
    toDay.places.push(moved);
    fromDay.places = fromDay.places.map((p, idx) => ({ ...p, order: idx + 1 }));
    toDay.places = toDay.places.map((p, idx) => ({ ...p, order: idx + 1 }));
    emitChange(updated);
  };

  const updateMeal = (dayIndex: number, which: 'lunch' | 'dinner', field: 'name' | 'scheduledTime' | 'estimatedDuration', value: any) => {
    const updated = [...sortedDays].map(d => ({ ...d, meals: d.meals ? { ...d.meals } : {} } as DayData));
    const day = updated[dayIndex];
    if (!day) return;
    const meals = (day.meals || {}) as any;
    const existingMeal = meals[which] || {};
    const meal = { ...existingMeal };
    (meal as any)[field] = field === 'estimatedDuration' ? Number(value) || undefined : value;
    (updated[dayIndex] as any).meals = { ...meals, [which]: meal };
    emitChange(updated);
  };

  const reorderDays = (dayIndex: number, direction: -1 | 1) => {
    const targetIdx = dayIndex + direction;
    const arr = [...sortedDays];
    if (targetIdx < 0 || targetIdx >= arr.length) return;
    const swap = arr[targetIdx];
    arr[targetIdx] = arr[dayIndex];
    arr[dayIndex] = swap;
    const renumbered = arr.map((d, i) => ({ ...d, day: i + 1 }));
    setCurrent(targetIdx);
    onActiveIndexChange?.(targetIdx);
    emitChange(renumbered);
    setTimeout(() => scrollToIndex(targetIdx), 0);
  };

  if (!sortedDays || sortedDays.length === 0) return null;

  return (
    <div className="relative">
      {/* Carousel viewport */}
      <div
        ref={containerRef}
        className="flex gap-6 overflow-x-auto snap-x snap-mandatory scroll-px-6 pb-4"
        style={{ scrollBehavior: "smooth" }}
      >
        {sortedDays.map((day, dIdx) => {
          const meta = perDayMeta?.[dIdx] || {};
          const placesCount = meta.placesCount ?? (day.places?.length || 0);
          const distanceStr = typeof meta.totalDistance === 'number' ? `${meta.totalDistance.toFixed(1)} km` : '';
          const durationStr = typeof meta.totalDuration === 'number' ? formatMinutes(Math.round(meta.totalDuration)) : '';
          const isActive = (typeof currentIndex === 'number' ? currentIndex : current) === dIdx;
          return (
            <div
              key={day.day}
              className={`snap-center shrink-0 w-[320px] sm:w-[380px] md:w-[420px] lg:w-[460px] transition-transform`}
            >
              <div className={`bg-white rounded-2xl shadow border ${
                isActive ? 'border-primary ring-2 ring-primary/30' : 'border-gray-100'
              } p-5 h-full transition-all`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center font-bold">
                      {day.day}
                    </div>
                    <div>
                      <div className="text-lg font-bold text-gray-900">Day {day.day}{day.date ? ` • ${day.date}` : ''}</div>
                      {day.theme && <div className="text-sm text-gray-500">{day.theme}</div>}
                    </div>
                  </div>
                  {editable && (
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" title="Move day left" onClick={() => reorderDays(dIdx, -1)}>
                        <i className="fas fa-arrow-left" />
                      </Button>
                      <Button variant="outline" size="icon" title="Move day right" onClick={() => reorderDays(dIdx, 1)}>
                        <i className="fas fa-arrow-right" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Compact day summary */}
                <div className="mb-4 flex items-center flex-wrap gap-2 text-xs">
                  <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-700 font-medium"><i className="fas fa-map-pin mr-1" />{placesCount} places</span>
                  {distanceStr && <span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 font-medium"><i className="fas fa-road mr-1" />{distanceStr}</span>}
                  {durationStr && <span className="px-2 py-1 rounded-full bg-purple-50 text-purple-700 font-medium"><i className="fas fa-clock mr-1" />{durationStr}</span>}
                </div>

                <ol className="space-y-3">
                  {(day.places || []).map((place, pIdx) => (
                    <li key={place.fsqPlaceId || place.order} className="relative">
                      <div className="flex items-start justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 hover:bg-gray-100 transition-colors p-3">
                        <div className="flex items-start gap-3">
                          <div className="w-7 h-7 bg-primary text-white rounded-full flex items-center justify-center font-bold text-xs mt-0.5">
                            {place.order}
                          </div>
                          <div className="flex-1">
                            <span className="font-semibold text-blue-700 leading-tight">{place.name}</span>
                            {place.category && (
                              <div className="text-[11px] text-gray-600 mt-0.5"><i className="fas fa-tag mr-1" />{place.category}</div>
                            )}
                            {(place.scheduledTime || place.estimatedDuration !== undefined) && (
                              <div className="text-[11px] text-gray-500 mt-0.5">
                                {place.scheduledTime}
                                {place.scheduledTime && place.estimatedDuration !== undefined ? " • " : ""}
                                {place.estimatedDuration !== undefined ? formatMinutes(place.estimatedDuration) : ""}
                              </div>
                            )}
                            {place.reason && <div className="mt-1 text-xs text-gray-700">{place.reason}</div>}
                          </div>
                        </div>

                        {editable && (
                          <div className="flex items-center gap-1 opacity-80">
                            <Button variant="outline" size="icon" onClick={() => reorderWithinDay(dIdx, pIdx, -1)} title="Move up">
                              <i className="fas fa-arrow-up" />
                            </Button>
                            <Button variant="outline" size="icon" onClick={() => reorderWithinDay(dIdx, pIdx, 1)} title="Move down">
                              <i className="fas fa-arrow-down" />
                            </Button>
                            <Button variant="outline" size="icon" onClick={() => movePlaceToDay(dIdx, pIdx, dIdx - 1)} title="Move to previous day">
                              <i className="fas fa-backward" />
                            </Button>
                            <Button variant="outline" size="icon" onClick={() => movePlaceToDay(dIdx, pIdx, dIdx + 1)} title="Move to next day">
                              <i className="fas fa-forward" />
                            </Button>
                            <Button variant="destructive" size="icon" onClick={() => removeFromDay(dIdx, pIdx)} title="Remove">
                              <i className="fas fa-trash" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </li>
                  ))}

                  {/* Lunch */}
                  {day.meals?.lunch && (
                    <li className="relative">
                      <div className="flex items-start justify-between gap-3 rounded-xl border border-orange-100 bg-orange-50 p-3">
                        <div className="flex items-start gap-3">
                          <div className="w-7 h-7 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold text-xs mt-0.5">
                            <i className="fas fa-utensils" />
                          </div>
                          <div>
                            <span className="font-semibold text-orange-700">Lunch: {day.meals.lunch.name}</span>
                            <div className="text-[11px] text-gray-600">
                              {day.meals.lunch.scheduledTime} {day.meals.lunch.estimatedDuration ? `• ${formatMinutes(day.meals.lunch.estimatedDuration)}` : ''}
                            </div>
                          </div>
                        </div>
                        {editable && (
                          <div className="flex items-center gap-2">
                            {mealEdit?.dayIdx === dIdx && mealEdit.which === 'lunch' ? (
                              <>
                                <input
                                  className="border rounded px-2 py-1 text-xs w-28"
                                  placeholder="Time"
                                  type="time"
                                  defaultValue={day.meals.lunch.scheduledTime}
                                  onBlur={(e) => updateMeal(dIdx, 'lunch', 'scheduledTime', e.target.value)}
                                />
                                <input
                                  className="border rounded px-2 py-1 text-xs w-20"
                                  placeholder="Dur (min)"
                                  type="number"
                                  defaultValue={day.meals.lunch.estimatedDuration as any}
                                  onBlur={(e) => updateMeal(dIdx, 'lunch', 'estimatedDuration', e.target.value)}
                                />
                                <Button variant="outline" size="icon" title="Done" onClick={() => setMealEdit(null)}>
                                  <i className="fas fa-check" />
                                </Button>
                              </>
                            ) : (
                              <Button variant="outline" size="icon" title="Edit lunch time" onClick={() => setMealEdit({ dayIdx: dIdx, which: 'lunch' })}>
                                <i className="fas fa-pen" />
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </li>
                  )}

                  {/* Dinner */}
                  {day.meals?.dinner && (
                    <li className="relative">
                      <div className="flex items-start justify-between gap-3 rounded-xl border border-orange-200 bg-orange-100 p-3">
                        <div className="flex items-start gap-3">
                          <div className="w-7 h-7 bg-orange-700 text-white rounded-full flex items-center justify-center font-bold text-xs mt-0.5">
                            <i className="fas fa-drumstick-bite" />
                          </div>
                          <div>
                            <span className="font-semibold text-orange-700">Dinner: {day.meals.dinner.name}</span>
                            <div className="text-[11px] text-gray-600">
                              {day.meals.dinner.scheduledTime} {day.meals.dinner.estimatedDuration ? `• ${formatMinutes(day.meals.dinner.estimatedDuration)}` : ''}
                            </div>
                          </div>
                        </div>
                        {editable && (
                          <div className="flex items-center gap-2">
                            {mealEdit?.dayIdx === dIdx && mealEdit.which === 'dinner' ? (
                              <>
                                <input
                                  className="border rounded px-2 py-1 text-xs w-28"
                                  placeholder="Time"
                                  type="time"
                                  defaultValue={day.meals.dinner.scheduledTime}
                                  onBlur={(e) => updateMeal(dIdx, 'dinner', 'scheduledTime', e.target.value)}
                                />
                                <input
                                  className="border rounded px-2 py-1 text-xs w-20"
                                  placeholder="Dur (min)"
                                  type="number"
                                  defaultValue={day.meals.dinner.estimatedDuration as any}
                                  onBlur={(e) => updateMeal(dIdx, 'dinner', 'estimatedDuration', e.target.value)}
                                />
                                <Button variant="outline" size="icon" title="Done" onClick={() => setMealEdit(null)}>
                                  <i className="fas fa-check" />
                                </Button>
                              </>
                            ) : (
                              <Button variant="outline" size="icon" title="Edit dinner time" onClick={() => setMealEdit({ dayIdx: dIdx, which: 'dinner' })}>
                                <i className="fas fa-pen" />
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </li>
                  )}
                </ol>
              </div>
            </div>
          );
        })}
      </div>

      {/* Controls */}
      <div className="absolute -left-2 top-1/2 -translate-y-1/2 hidden md:flex">
        <Button variant="outline" size="icon" className="rounded-full" onClick={handlePrev}>
          <i className="fas fa-chevron-left" />
        </Button>
      </div>
      <div className="absolute -right-2 top-1/2 -translate-y-1/2 hidden md:flex">
        <Button variant="outline" size="icon" className="rounded-full" onClick={handleNext}>
          <i className="fas fa-chevron-right" />
        </Button>
      </div>

      {/* Numbered pager */}
      <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
        {sortedDays.map((d, idx) => (
          <button
            key={idx}
            aria-label={`Go to day ${idx + 1}`}
            onClick={() => {
              setCurrent(idx);
              onActiveIndexChange?.(idx);
              scrollToIndex(idx);
            }}
            className={`px-3 h-8 rounded-full text-sm font-medium transition-all border ${
              (typeof currentIndex === 'number' ? currentIndex : current) === idx
                ? 'bg-primary text-white border-primary shadow'
                : 'bg-white text-gray-700 border-gray-200 hover:border-primary'
            }`}
          >
            Day {d.day}
          </button>
        ))}
      </div>
    </div>
  );
}
