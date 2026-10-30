/**
 * UNPRO signature animation — bespoke blue-ink architectural sketch.
 * One recognizable worker, seven job sites that redraw around them.
 * CSS/SVG only; never interferes with Clara or page controls.
 */
import { useEffect, useRef } from "react";
import "./tradesLineArtPremium.css";

const scenes = [
  {
    name: "peinture",
    // wall, carefully drawn roller with paint swathes
    environment: "M289 31 Q286 30 286 34 L286 178 Q288 182 293 182 L476 182 M297 35 H469 M463 35 V181 M308 91 V171 M315 79 C341 77 353 78 378 77 M315 88 C342 86 359 89 375 85 M315 98 C337 96 352 100 369 95 M318 105 C337 102 350 106 362 103 M387 55 V173",
    details: "M329 42 C344 47 366 40 385 46 M336 52 C352 55 366 49 381 54 M340 62 C355 61 367 64 379 61 M398 43 C413 42 422 48 443 43 M406 53 C417 53 429 58 440 53 M414 63 L441 64 M398 115 C418 114 438 119 451 114 M395 133 C413 129 434 138 449 131 M400 150 L448 147",
    tool: "M219 101 Q239 91 258 83 L274 70 M270 69 L278 62 M276 49 H332 Q337 49 337 55 V63 Q337 69 332 69 H276 Q271 69 271 63 V55 Q271 49 276 49 Z M284 57 H324 M258 82 L264 87",
  },
  {
    name: "maçonnerie",
    environment: "M285 173 L478 173 M292 150 H468 M292 126 H468 M310 102 H468 M332 79 H468 M292 150 V173 M338 150 V173 M387 150 V173 M435 150 V173 M315 126 V150 M364 126 V150 M412 126 V150 M461 126 V150 M335 102 V126 M386 102 V126 M434 102 V126 M356 79 V102 M403 79 V102 M447 79 V102 M290 173 L291 127 Q291 124 295 124 M309 102 H333 M333 79 L352 79",
    details: "M296 156 L321 156 M341 156 L374 156 M393 156 H426 M317 133 L352 133 M376 133 L403 133 M335 108 L368 108 M389 108 H424 M358 85 L391 85 M411 86 H437 M300 180 H468 M307 184 H439",
    tool: "M220 103 Q240 107 252 100 L265 91 M263 90 L284 90 M283 82 L318 82 L302 93 L268 94 Z M279 78 L289 72 M289 72 L299 73 M303 96 L315 94",
  },
  {
    name: "toiture",
    environment: "M273 153 L382 51 Q387 46 392 52 L486 142 M263 166 L384 56 L495 158 M309 145 L407 66 M333 162 L422 84 M363 165 L438 100 M392 163 L454 116 M423 164 L471 133 M300 164 L488 164 M405 61 L405 32 L440 32 L440 92 M410 37 H435 M311 127 H343 M338 107 H364 M363 85 H389",
    details: "M288 157 L308 141 M319 158 L338 140 M344 158 L360 143 M371 158 L383 143 M401 158 L414 145 M431 158 L443 147 M459 158 L474 158 M418 41 H432 M418 49 H432 M418 57 H432 M418 65 H432 M418 73 H432 M285 177 H483",
    tool: "M219 105 Q238 93 260 79 L280 65 M276 65 L287 53 M284 49 L298 60 L292 65 L281 55 M296 72 L308 68",
  },
  {
    name: "thermopompe",
    environment: "M299 58 H466 Q473 58 473 66 V170 Q473 178 465 178 H298 Q292 178 292 171 V66 Q292 58 299 58 Z M309 73 H455 M309 163 H455 M319 85 H392 V150 H319 Z M356 91 C321 91 316 144 354 145 C391 147 393 93 356 91 Z M358 106 C368 106 376 117 374 125 C368 136 355 136 354 127 C352 119 342 119 340 111 Q342 103 358 106 Z M354 127 Q365 125 365 115 M357 126 Q345 138 336 130",
    details: "M410 87 H450 M410 96 H450 M410 105 H450 M410 114 H450 M410 123 H450 M410 132 H450 M410 141 H450 M310 170 H455 M407 153 H450 M304 181 V187 M456 181 V187 M285 187 H476 M337 116 L368 121 M352 107 L357 141",
    tool: "M221 105 Q241 100 262 111 L292 116 M279 111 Q287 102 295 102 M273 110 L274 120 M292 116 H305",
  },
  {
    name: "plomberie",
    environment: "M297 53 H465 M307 53 L318 97 H439 L450 53 M318 99 H439 M333 101 V132 Q333 151 351 151 H387 Q401 151 401 164 V178 M343 102 V131 Q343 141 353 141 H391 Q413 141 413 164 V178 M401 178 H421 M374 53 V35 Q374 27 383 27 Q392 27 392 36 V45 M379 45 Q389 48 394 43 M366 59 H399",
    details: "M322 60 H441 M328 69 H434 M339 78 H426 M353 87 H412 M393 157 H408 M343 150 L342 164 M417 162 L421 172 M401 178 V187 M413 178 V187 M376 34 H388 M388 43 C399 54 409 58 415 69 M369 43 C365 52 363 55 363 60",
    tool: "M220 107 Q242 100 254 91 L271 78 M271 78 C279 69 280 58 275 53 L267 63 L258 57 Q259 71 267 73 L259 85 M254 90 L247 99",
  },
  {
    name: "entretien",
    environment: "M273 43 L478 43 M275 52 H470 Q478 52 478 61 V76 Q472 85 456 83 L350 83 M470 83 V149 Q470 164 454 164 H433 M478 83 V150 Q478 174 452 174 H433 M300 185 L335 68 M334 185 L368 68 M307 163 H342 M313 143 H347 M320 122 H353 M326 101 H359 M333 80 H365",
    details: "M284 38 H450 M286 61 Q310 67 328 62 Q344 58 364 61 M388 61 H453 M408 72 H447 M464 100 V144 M459 153 Q452 158 441 155 M322 185 H347 M298 185 H314 M290 191 H365 M439 175 H485",
    tool: "M221 105 Q237 90 251 70 L270 54 M270 54 L279 51 M273 54 C286 62 294 62 304 59 M295 55 L308 58 M289 67 L296 75",
  },
  {
    name: "immobilier",
    environment: "M280 98 L369 27 L458 98 M291 95 V184 H447 V95 M320 80 L320 48 H346 V58 M310 182 H469 M349 182 V124 Q349 119 353 119 H384 Q387 119 387 124 V182 M400 116 H431 V151 H400 Z M307 116 H333 V144 H307 Z M358 129 H377 M425 90 L425 106",
    details: "M315 126 H329 M400 132 H431 M416 116 V151 M309 158 H334 M306 166 H332 M394 160 H433 M394 167 H433 M358 171 H366 M301 103 L369 48 L441 103 M325 75 L347 57 M373 183 H449",
    tool: "M220 104 Q236 95 252 82 L272 66 M272 66 A11 11 0 1 1 273 46 A11 11 0 0 1 272 66 Z M282 58 H309 L315 63 L309 69 L301 65 L297 70 L289 63",
  },
];

export default function TradesLineArtPremium() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    let inView = true;
    const sync = () => el.classList.toggle("unpro-ink-paused", document.hidden || !inView);
    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      sync();
    }, { threshold: 0.04 });
    observer?.observe(el);
    document.addEventListener("visibilitychange", sync);
    return () => {
      observer?.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  return (
    <div ref={root} className="unpro-ink-story" aria-hidden="true">
      <svg className="unpro-ink-canvas" viewBox="0 0 520 205" preserveAspectRatio="xMidYMid meet" focusable="false">
        <defs>
          <linearGradient id="unpro-ink-horizon" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#17B6F6" stopOpacity="0" />
            <stop offset=".47" stopColor="#188EED" stopOpacity=".44" />
            <stop offset="1" stopColor="#17B6F6" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g className="unpro-ink-atmosphere">
          <path d="M20 193 Q90 190 167 192 M240 192 Q345 189 501 192" />
          <path d="M68 27 V51 M56 39 H80 M466 10 V28 M457 19 H475" />
          <circle cx="191" cy="98" r="89" />
          <path d="M73 158 Q89 145 113 151 M99 38 Q112 31 128 35" />
        </g>
        <path d="M22 195 H500" stroke="url(#unpro-ink-horizon)" strokeWidth="2" />
        <g className="unpro-ink-worker">
          <g className="unpro-ink-outline">
            {/* Hard hat and face profile — no stick figure */}
            <path d="M163 48 Q165 30 180 23 Q200 16 215 31 Q221 39 220 49 M159 48 Q188 44 228 49 L230 55 Q193 59 156 54 Z" />
            <path d="M177 54 Q172 64 175 75 Q179 90 193 92 Q209 90 214 72 L213 55 M177 63 Q169 61 170 70 Q172 76 178 76" />
            <path d="M188 68 Q190 65 193 68 M205 68 Q207 65 210 68 M201 72 Q197 79 202 80 M192 85 Q199 89 205 83" />
            <path d="M183 91 V99 M207 89 L210 98 M181 99 Q171 101 163 110 Q154 125 154 144 L163 162 M211 99 Q223 105 225 123 L221 161" />
            {/* Work jacket and reflective vest */}
            <path d="M183 98 L197 112 L209 98 M163 112 Q173 117 185 123 L183 157 Q195 165 218 157 L219 115 M185 123 L197 115 L208 123" />
            <path d="M179 113 L174 143 M210 117 L213 145 M184 157 Q198 161 220 156 M188 129 H208 V145 H188 Z M193 132 H204" />
            <path d="M163 162 Q179 166 218 162 M179 165 L175 191 M211 166 L218 191 M179 181 L176 193 Q168 195 161 195 L159 200 H184 L185 191 M212 184 L215 194 Q224 195 231 196 L233 200 H207 L207 193" />
            <path d="M162 121 Q149 139 155 152 L167 160 M158 154 L171 160 M154 144 Q153 151 159 155" />
          </g>
          <g className="unpro-ink-stitch">
            <path d="M188 30 Q196 25 205 32 M183 56 Q185 58 192 58 M174 106 Q176 116 176 122 M217 116 V151 M191 151 H204 M184 172 L182 185 M214 174 L217 186" />
            <path d="M165 139 L168 149 M190 119 L190 126 M207 119 L207 126 M165 194 H179 M213 195 H229" />
          </g>
        </g>
        {scenes.map((scene, index) => (
          <g className="unpro-ink-scene" key={scene.name} style={{ animationDelay: index * 4 + "s" }}>
            <path className="unpro-ink-job" pathLength={1} d={scene.environment} style={{ animationDelay: index * 4 + "s" }} />
            <path className="unpro-ink-job-detail" pathLength={1} d={scene.details} style={{ animationDelay: index * 4.0 + 0.25 + "s" }} />
            <path className="unpro-ink-gesture" pathLength={1} d={scene.tool} style={{ animationDelay: index * 4 + "s" }} />
          </g>
        ))}
        <g className="unpro-ink-finishes">
          <path d="M24 195 H75 M443 195 H495" />
          <path d="M107 190 L116 188 M384 190 L399 189" />
        </g>
      </svg>
    </div>
  );
}
