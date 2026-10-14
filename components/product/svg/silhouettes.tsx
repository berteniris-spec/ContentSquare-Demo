// One flat illustration per product silhouette, each with front, back and side views.
// Canvas: viewBox 0 0 400 500, visual centre near (200, 235), ground at y = 440.
// Only `base` changes per colour; shapes, hardware and backdrop stay fixed.
// The detail view is derived from the front view by the renderer (ProductImage).

import type { ReactNode } from "react";
import type { Silhouette } from "@/lib/products";
import type { Palette } from "./color";

export interface ViewDef {
  /** Main body shapes, filled with `base` (and used to clip the detail texture). */
  body: string[];
  /** Drawn before the body (things behind it, e.g. a back handle). */
  under?: (p: Palette) => ReactNode;
  /** Shade, highlight, details and hardware, drawn on top of the body. */
  draw: (p: Palette) => ReactNode;
  /** Ground shadow: half width and optional y (default 440). */
  shadow: { rx: number; y?: number };
  /** Optional transform for the whole product group (used for symmetric squashes). */
  transform?: string;
}

export interface SilhouetteDef {
  front: ViewDef;
  back: ViewDef;
  side: ViewDef;
  /** Point of the front view the detail close-up is centred on. */
  detailFocus: [number, number];
}

// ---------- drawing helpers ----------

/** Rounded rectangle path. */
function R(x: number, y: number, w: number, h: number, r: number): string {
  return `M${x + r} ${y}H${x + w - r}Q${x + w} ${y} ${x + w} ${y + r}V${y + h - r}Q${x + w} ${y + h} ${x + w - r} ${y + h}H${x + r}Q${x} ${y + h} ${x} ${y + h - r}V${y + r}Q${x} ${y} ${x + r} ${y}Z`;
}

function Line({ d, p, w = 2 }: { d: string; p: Palette; w?: number }) {
  return (
    <path d={d} fill="none" stroke={p.line} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
  );
}

function Seam({ d, p }: { d: string; p: Palette }) {
  return (
    <path
      d={d}
      fill="none"
      stroke={p.line}
      strokeWidth={1.5}
      strokeDasharray="4 4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

function Shade({ d, p }: { d: string; p: Palette }) {
  return <path d={d} fill={p.shade} />;
}

function Light({ d, p }: { d: string; p: Palette }) {
  return <path d={d} fill={p.light} opacity={0.6} />;
}

function Hw({ d, p }: { d: string; p: Palette }) {
  return <path d={d} fill={p.hw} />;
}

/** A shape in base colour with a detail outline (handles, collars, overlapping parts). */
function Part({ d, p, fill }: { d: string; p: Palette; fill?: string }) {
  return (
    <path d={d} fill={fill ?? p.base} stroke={p.line} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
  );
}

/** A thick strap/handle stroke with an outline. */
function Strap({ d, p, w = 12, color }: { d: string; p: Palette; w?: number; color?: string }) {
  return (
    <>
      <path d={d} fill="none" stroke={p.line} strokeWidth={w + 4} strokeLinecap="round" />
      <path d={d} fill="none" stroke={color ?? p.base} strokeWidth={w} strokeLinecap="round" />
    </>
  );
}

/** Neutral label patch with an abstract tide glyph. */
function Patch({ x, y }: { x: number; y: number }) {
  return (
    <>
      <path d={R(x, y, 26, 15, 3)} fill="#EAE4D9" stroke="#B8B0A3" strokeWidth={1} />
      <path
        d={`M${x + 5} ${y + 8.5}q3.5 -3 7 0t7 0`}
        fill="none"
        stroke="#8C857A"
        strokeWidth={1.3}
        strokeLinecap="round"
      />
    </>
  );
}

/** Ribbing: short vertical strokes between x0 and x1 inside a band. */
function Rib({ x0, x1, y0, y1, p, step = 10 }: { x0: number; x1: number; y0: number; y1: number; p: Palette; step?: number }) {
  const d: string[] = [];
  for (let x = x0 + step / 2; x < x1; x += step) d.push(`M${x} ${y0}V${y1}`);
  return <path d={d.join("")} fill="none" stroke={p.line} strokeWidth={1.25} strokeLinecap="round" opacity={0.7} />;
}

const SQUASH = (s: number) => `translate(200 0) scale(${s} 1) translate(-200 0)`;

// ---------- shared apparel shapes ----------

const TORSO =
  "M160 95L130 108Q98 120 92 160L72 360Q70 372 82 374L112 376Q122 376 123 366L132 240L134 420Q134 428 142 428H258Q266 428 266 420L268 240L277 366Q278 376 288 376L318 374Q330 372 328 360L308 160Q302 120 270 108L240 95Q220 112 200 112Q180 112 160 95Z";
const TORSO_CUFF_L = "M73.2 348L123.9 354L123 366Q122 376 112 376L82 374Q70 372 72 360Z";
const TORSO_CUFF_R = "M326.8 348L276.1 354L277 366Q278 376 288 376L318 374Q330 372 328 360Z";
const TORSO_HEM = "M134 404H266L266 420Q266 428 258 428H142Q134 428 134 420Z";
const ARMHOLES = "M130 108Q142 170 132 240M270 108Q258 170 268 240";
const TORSO_LIGHT = "M160 112Q141 117 138 152Q135 196 139 232Q156 196 164 158Q171 128 188 115Z";
const TORSO_LIGHT_BACK = "M240 112Q259 117 262 152Q265 196 261 232Q244 196 236 158Q229 128 212 115Z";

const SIDE_TORSO =
  "M178 95Q152 102 150 140L146 420Q146 428 154 428H246Q254 428 254 420L250 140Q248 102 222 95Q200 104 178 95Z";
const SIDE_SLEEVE =
  "M196 108Q218 106 224 132L232 360Q233 372 221 373L197 374Q186 374 186 362L182 140Q182 110 196 108Z";
const SIDE_CUFF = "M185.6 350L232.6 348L232 360Q233 372 221 373L197 374Q186 374 186 362Z";
const SIDE_HEM = "M146.4 404H253.6L254 420Q254 428 246 428H154Q146 428 146 420Z";

function longSleeveExtras(p: Palette, ribbed = false) {
  return (
    <>
      <Shade d={TORSO_CUFF_L} p={p} />
      <Shade d={TORSO_CUFF_R} p={p} />
      <Shade d={TORSO_HEM} p={p} />
      {ribbed && (
        <>
          <Rib x0={134} x1={266} y0={408} y1={424} p={p} step={9} />
          <Rib x0={78} x1={120} y0={356} y1={370} p={p} step={8} />
          <Rib x0={280} x1={322} y0={356} y1={370} p={p} step={8} />
        </>
      )}
      <Line d={ARMHOLES} p={p} w={1.75} />
    </>
  );
}

function sideApparel(p: Palette, ribbed = false) {
  return (
    <>
      <Shade d={SIDE_HEM} p={p} />
      {ribbed && <Rib x0={148} x1={252} y0={408} y1={424} p={p} step={9} />}
      <Part d={SIDE_SLEEVE} p={p} />
      <Shade d={SIDE_CUFF} p={p} />
      {ribbed && <Rib x0={188} x1={230} y0={355} y1={369} p={p} step={8} />}
      <Light d="M193 114Q185 120 185 150Q186 198 190 236Q194 190 194 150Q194 126 199 113Z" p={p} />
    </>
  );
}

// ---------- bags ----------

const BACKPACK_BODY = R(100, 85, 200, 340, 48);
const BACKPACK_BOTTOM = "M100 370H300V377Q300 425 252 425H148Q100 425 100 377Z";
const BACKPACK_LID = "M100 133Q100 85 148 85H252Q300 85 300 133V140H100Z";

const backpack: SilhouetteDef = {
  detailFocus: [201, 262],
  front: {
    body: [BACKPACK_BODY],
    shadow: { rx: 112 },
    draw: (p) => (
      <>
        <Strap d="M175 86Q175 58 200 58Q225 58 225 86" p={p} w={8} color={p.shade} />
        <Shade d={BACKPACK_BOTTOM} p={p} />
        <Light d={BACKPACK_LID} p={p} />
        <Line d="M108 150Q200 128 292 150" p={p} />
        <Hw d={R(274, 138, 9, 20, 3)} p={p} />
        <path d={R(130, 235, 140, 150, 26)} fill={p.base} stroke={p.line} strokeWidth={2} />
        <Seam d={R(138, 243, 124, 134, 20)} p={p} />
        <Line d="M138 262Q200 250 262 262" p={p} />
        <Hw d={R(196, 252, 10, 22, 3)} p={p} />
        <Shade d={R(90, 200, 26, 10, 4)} p={p} />
        <Shade d={R(284, 200, 26, 10, 4)} p={p} />
        <Hw d={R(104, 197, 12, 16, 3)} p={p} />
        <Hw d={R(284, 197, 12, 16, 3)} p={p} />
        <Patch x={187} y={305} />
      </>
    ),
  },
  back: {
    body: [BACKPACK_BODY],
    shadow: { rx: 112 },
    draw: (p) => (
      <>
        <Strap d="M175 86Q175 58 200 58Q225 58 225 86" p={p} w={8} color={p.shade} />
        <Light d={BACKPACK_LID} p={p} />
        <Shade d={R(118, 110, 164, 285, 34)} p={p} />
        <Seam d="M126 200H274M126 290H274" p={p} />
        <Part d="M150 100C140 180 130 260 140 390L160 390C152 260 160 180 170 100Z" p={p} />
        <Part d="M250 100C260 180 270 260 260 390L240 390C248 260 240 180 230 100Z" p={p} />
        <Hw d={R(136, 380, 28, 12, 3)} p={p} />
        <Hw d={R(236, 380, 28, 12, 3)} p={p} />
        <Shade d={BACKPACK_BOTTOM} p={p} />
      </>
    ),
  },
  side: {
    body: [R(150, 95, 100, 330, 36)],
    shadow: { rx: 62 },
    draw: (p) => (
      <>
        <Strap d="M150 125C118 185 116 300 150 392" p={p} w={10} color={p.shade} />
        <Strap d="M185 96Q200 72 215 96" p={p} w={7} color={p.shade} />
        <Shade d="M186 95Q150 95 150 131V389Q150 425 186 425H176V95Z" p={p} />
        <Light d="M150 131Q150 95 186 95H214Q250 95 250 131V138H150Z" p={p} />
        <Shade d={R(176, 200, 74, 10, 4)} p={p} />
        <Hw d={R(228, 197, 14, 16, 3)} p={p} />
        <path d={R(186, 295, 58, 115, 14)} fill={p.shade} stroke={p.line} strokeWidth={2} />
        <Seam d="M190 308H240" p={p} />
        <Seam d="M188 140V410" p={p} />
      </>
    ),
  },
};

const DAYPACK_BODY = "M112 176Q112 96 200 96Q288 96 288 176V382Q288 422 248 422H152Q112 422 112 382Z";
const DAYPACK_BOTTOM = "M112 380H288V382Q288 422 248 422H152Q112 422 112 382Z";

const daypack: SilhouetteDef = {
  detailFocus: [238, 324],
  front: {
    body: [DAYPACK_BODY],
    shadow: { rx: 100 },
    draw: (p) => (
      <>
        <Strap d="M186 98Q186 80 200 80Q214 80 214 98" p={p} w={6} color={p.shade} />
        <Shade d={DAYPACK_BOTTOM} p={p} />
        <Light d="M124 176Q124 110 194 104Q144 126 140 176Z" p={p} />
        <Line d="M130 296V178Q130 114 200 114Q270 114 270 178V296" p={p} />
        <Hw d={R(125, 290, 10, 20, 3)} p={p} />
        <Hw d={R(265, 290, 10, 20, 3)} p={p} />
        <path d={R(140, 312, 120, 84, 18)} fill={p.base} stroke={p.line} strokeWidth={2} />
        <Line d="M148 326H252" p={p} />
        <Hw d={R(234, 318, 9, 18, 3)} p={p} />
        <Patch x={187} y={244} />
      </>
    ),
  },
  back: {
    body: [DAYPACK_BODY],
    shadow: { rx: 100 },
    draw: (p) => (
      <>
        <Strap d="M186 98Q186 80 200 80Q214 80 214 98" p={p} w={6} color={p.shade} />
        <path d="M128 182Q128 118 200 118Q272 118 272 182V384Q272 400 256 400H144Q128 400 128 384Z" fill={p.shade} />
        <Part d="M156 112C146 190 138 270 146 392L164 392C158 270 164 190 174 112Z" p={p} />
        <Part d="M244 112C254 190 262 270 254 392L236 392C242 270 236 190 226 112Z" p={p} />
        <Shade d={DAYPACK_BOTTOM} p={p} />
      </>
    ),
  },
  side: {
    body: ["M160 166Q160 100 200 100Q240 100 240 166V392Q240 422 210 422H190Q160 422 160 392Z"],
    shadow: { rx: 54 },
    draw: (p) => (
      <>
        <Strap d="M160 130C134 190 132 300 160 394" p={p} w={9} color={p.shade} />
        <Shade d="M180 104Q160 112 160 166V392Q160 422 186 422H176V108Z" p={p} />
        <Light d="M172 160Q174 116 196 106Q184 130 184 160Z" p={p} />
        <path d={R(192, 300, 44, 104, 12)} fill={p.shade} stroke={p.line} strokeWidth={2} />
        <Seam d="M194 312H234" p={p} />
        <Line d="M200 104V300" p={p} w={1.75} />
      </>
    ),
  },
};

const ROLL_BODY = "M108 135H292V377Q292 425 244 425H156Q108 425 108 377Z";
const ROLL_TOP = R(100, 82, 200, 58, 22);

const rollTop: SilhouetteDef = {
  detailFocus: [200, 241],
  front: {
    body: [ROLL_BODY, ROLL_TOP],
    shadow: { rx: 108 },
    draw: (p) => (
      <>
        <Shade d="M108 370H292V377Q292 425 244 425H156Q108 425 108 377Z" p={p} />
        <Light d="M108 140H150V370H108Z" p={p} />
        <Line d="M112 101H288M112 121H288" p={p} w={1.75} />
        <path d={ROLL_TOP} fill="none" stroke={p.line} strokeWidth={2} />
        <path d={R(190, 92, 20, 150, 6)} fill={p.shade} stroke={p.line} strokeWidth={1.5} />
        <Hw d={R(183, 230, 34, 22, 5)} p={p} />
        <path d={R(135, 280, 130, 110, 20)} fill="none" stroke={p.line} strokeWidth={2} />
        <Line d="M143 300H257" p={p} />
        <Hw d={R(244, 293, 9, 18, 3)} p={p} />
        <Patch x={187} y={340} />
      </>
    ),
  },
  back: {
    body: [ROLL_BODY, ROLL_TOP],
    shadow: { rx: 108 },
    draw: (p) => (
      <>
        <Line d="M112 101H288M112 121H288" p={p} w={1.75} />
        <path d={ROLL_TOP} fill="none" stroke={p.line} strokeWidth={2} />
        <Shade d={R(124, 160, 152, 225, 30)} p={p} />
        <Seam d="M132 240H268M132 310H268" p={p} />
        <Part d="M155 150C146 220 138 300 146 392L164 392C158 300 164 220 174 150Z" p={p} />
        <Part d="M245 150C254 220 262 300 254 392L236 392C242 300 236 220 226 150Z" p={p} />
        <Hw d={R(141, 382, 28, 12, 3)} p={p} />
        <Hw d={R(231, 382, 28, 12, 3)} p={p} />
        <Shade d="M108 395H292V377Q292 425 244 425H156Q108 425 108 377Z" p={p} />
      </>
    ),
  },
  side: {
    body: ["M160 135H240V389Q240 425 204 425H196Q160 425 160 389Z", "M156 110a44 30 0 1 0 88 0a44 30 0 1 0 -88 0Z"],
    shadow: { rx: 56 },
    draw: (p) => (
      <>
        <Shade d="M160 400H240V389Q240 425 204 425H196Q160 425 160 389Z" p={p} />
        <Light d="M160 140H178V400H160Z" p={p} />
        <path d="M156 110a44 30 0 1 0 88 0a44 30 0 1 0 -88 0Z" fill="none" stroke={p.line} strokeWidth={2} />
        <path d="M172 110a28 18 0 1 0 56 0a28 18 0 1 0 -56 0" fill="none" stroke={p.line} strokeWidth={1.75} />
        <path d="M188 110a12 7 0 1 0 24 0a12 7 0 1 0 -24 0" fill="none" stroke={p.line} strokeWidth={1.5} />
        <path d={R(232, 112, 12, 130, 5)} fill={p.shade} stroke={p.line} strokeWidth={1.5} />
        <Hw d={R(228, 232, 20, 18, 4)} p={p} />
        <Seam d="M166 150V400" p={p} />
      </>
    ),
  },
};

const TOTE_BODY = "M95 175H305L290 420Q289 428 280 428H120Q111 428 110 420Z";

const tote: SilhouetteDef = {
  detailFocus: [141, 192],
  front: {
    body: [TOTE_BODY],
    shadow: { rx: 104 },
    under: (p) => <Strap d="M165 178C165 100 235 100 235 178" p={p} w={10} color={p.shade} />,
    draw: (p) => (
      <>
        <Strap d="M141 182C141 72 259 72 259 182" p={p} w={12} />
        <Shade d="M106 400H294L290 420Q289 428 280 428H120Q111 428 110 420Z" p={p} />
        <Light d="M95 175H142L134 400H106Z" p={p} />
        <Seam d="M98 196H302" p={p} />
        <path d={R(131, 172, 20, 36, 4)} fill={p.shade} stroke={p.line} strokeWidth={1.5} />
        <path d={R(249, 172, 20, 36, 4)} fill={p.shade} stroke={p.line} strokeWidth={1.5} />
        <circle cx={141} cy={182} r={3.5} fill={p.hw} />
        <circle cx={141} cy={198} r={3.5} fill={p.hw} />
        <circle cx={259} cy={182} r={3.5} fill={p.hw} />
        <circle cx={259} cy={198} r={3.5} fill={p.hw} />
        <path d={R(142, 250, 116, 104, 6)} fill="none" stroke={p.line} strokeWidth={2} />
        <Seam d="M146 262H254" p={p} />
        <Patch x={187} y={370} />
      </>
    ),
  },
  back: {
    body: [TOTE_BODY],
    shadow: { rx: 104 },
    under: (p) => <Strap d="M141 182C141 72 259 72 259 182" p={p} w={12} color={p.shade} />,
    draw: (p) => (
      <>
        <Strap d="M165 180C165 100 235 100 235 180" p={p} w={10} />
        <Shade d="M106 400H294L290 420Q289 428 280 428H120Q111 428 110 420Z" p={p} />
        <Light d="M258 175H305L294 400H266Z" p={p} />
        <Seam d="M98 196H302" p={p} />
        <path d={R(155, 172, 20, 34, 4)} fill={p.shade} stroke={p.line} strokeWidth={1.5} />
        <path d={R(225, 172, 20, 34, 4)} fill={p.shade} stroke={p.line} strokeWidth={1.5} />
        <Seam d="M118 205L110 395M282 205L290 395" p={p} />
      </>
    ),
  },
  side: {
    body: ["M165 175H235L228 420Q228 428 220 428H180Q172 428 172 420Z"],
    shadow: { rx: 52 },
    draw: (p) => (
      <>
        <Strap d="M178 178C176 100 224 100 222 178" p={p} w={10} />
        <Shade d="M200 175H235L228 420Q228 428 220 428H200Z" p={p} />
        <Line d="M200 178V426" p={p} w={1.75} />
        <Seam d="M167 196H233" p={p} />
        <path d={R(170, 170, 16, 30, 4)} fill={p.shade} stroke={p.line} strokeWidth={1.5} />
        <circle cx={178} cy={185} r={3} fill={p.hw} />
      </>
    ),
  },
};

const DUFFEL_BODY = "M50 300Q50 230 120 230H280Q350 230 350 300V340Q350 400 290 400H110Q50 400 50 340Z";
const DUFFEL_END_L = "M120 230Q50 230 50 300V340Q50 400 110 400H120Q92 360 92 315Q92 262 120 230Z";
const DUFFEL_END_R = "M280 230Q350 230 350 300V340Q350 400 290 400H280Q308 360 308 315Q308 262 280 230Z";

function duffelCommon(p: Palette) {
  return (
    <>
      <Strap d="M165 236C165 176 235 176 235 236" p={p} w={12} />
      <path d={R(184, 174, 32, 16, 6)} fill={p.shade} stroke={p.line} strokeWidth={1.5} />
      <Shade d={DUFFEL_END_L} p={p} />
      <Shade d={DUFFEL_END_R} p={p} />
      <path d="M120 230Q92 262 92 315Q92 360 120 400M280 230Q308 262 308 315Q308 360 280 400" fill="none" stroke={p.line} strokeWidth={2} />
      <Light d="M120 230H280Q290 238 292 256H108Q110 238 120 230Z" p={p} />
      <Line d="M122 246H278" p={p} />
      <circle cx={130} cy={262} r={7} fill="none" stroke={p.hw} strokeWidth={3.5} />
      <circle cx={270} cy={262} r={7} fill="none" stroke={p.hw} strokeWidth={3.5} />
      <Seam d="M110 386H290" p={p} />
    </>
  );
}

const duffel: SilhouetteDef = {
  detailFocus: [262, 250],
  front: {
    body: [DUFFEL_BODY],
    shadow: { rx: 150, y: 414 },
    draw: (p) => (
      <>
        {duffelCommon(p)}
        <Seam d="M122 254H278" p={p} />
        <Hw d={R(256, 240, 9, 20, 3)} p={p} />
        <path d={R(146, 288, 108, 76, 12)} fill="none" stroke={p.line} strokeWidth={2} />
        <Line d="M154 304H246" p={p} />
        <Hw d={R(234, 296, 9, 18, 3)} p={p} />
        <Patch x={187} y={330} />
      </>
    ),
  },
  back: {
    body: [DUFFEL_BODY],
    shadow: { rx: 150, y: 414 },
    draw: (p) => (
      <>
        {duffelCommon(p)}
        <path d={R(136, 280, 128, 90, 8)} fill={p.shade} stroke={p.line} strokeWidth={2} />
        <Seam d="M136 292H264M136 358H264" p={p} />
      </>
    ),
  },
  side: {
    body: ["M120 315Q120 230 200 230Q280 230 280 315Q280 400 200 400Q120 400 120 315Z"],
    shadow: { rx: 84, y: 414 },
    under: (p) => <Strap d="M180 236C180 190 220 190 220 236" p={p} w={12} />,
    draw: (p) => (
      <>
        <path d="M140 315Q140 250 200 250Q260 250 260 315Q260 380 200 380Q140 380 140 315Z" fill={p.shade} />
        <Seam d="M140 315Q140 250 200 250Q260 250 260 315Q260 380 200 380Q140 380 140 315Z" p={p} />
        <Light d="M146 290Q160 254 200 252L200 266Q170 268 158 296Z" p={p} />
        <circle cx={200} cy={240} r={7} fill="none" stroke={p.hw} strokeWidth={3.5} />
        <Patch x={187} y={330} />
      </>
    ),
  },
};

const SLING_BODY = "M90 310Q90 230 170 225H230Q310 230 310 310Q310 395 230 400H170Q90 395 90 310Z";

const sling: SilhouetteDef = {
  detailFocus: [272, 284],
  front: {
    body: [SLING_BODY],
    shadow: { rx: 110, y: 414 },
    under: (p) => <Strap d="M110 330L-10 470M290 288L410 60" p={p} w={11} color={p.shade} />,
    draw: (p) => (
      <>
        <Hw d="M338 188L356 158L370 166L352 196Z" p={p} />
        <Shade d="M96 345Q115 395 170 400H230Q285 395 304 345Z" p={p} />
        <Light d="M104 270Q125 232 170 230H230Q275 232 296 270Z" p={p} />
        <Line d="M112 290Q200 255 288 290" p={p} />
        <Hw d={R(267, 276, 10, 20, 3)} p={p} />
        <Line d="M128 345Q200 378 272 345" p={p} />
        <Seam d="M118 300Q200 268 282 300" p={p} />
        <Patch x={187} y={312} />
      </>
    ),
  },
  back: {
    body: [SLING_BODY],
    shadow: { rx: 110, y: 414 },
    under: (p) => <Strap d="M110 330L-10 470M290 288L410 60" p={p} w={11} color={p.shade} />,
    draw: (p) => (
      <>
        <Hw d="M338 188L356 158L370 166L352 196Z" p={p} />
        <Light d="M104 270Q125 232 170 230H230Q275 232 296 270Z" p={p} />
        <path d="M120 312Q120 258 175 255H225Q280 258 280 312Q280 366 225 370H175Q120 366 120 312Z" fill={p.shade} />
        <Seam d="M150 270L250 360M250 270L150 360" p={p} />
        <Seam d="M120 312Q120 258 175 255H225Q280 258 280 312Q280 366 225 370H175Q120 366 120 312Z" p={p} />
      </>
    ),
  },
  side: {
    body: ["M168 310Q168 232 200 228Q232 232 232 310Q232 396 200 400Q168 396 168 310Z"],
    shadow: { rx: 44, y: 414 },
    under: (p) => <Strap d="M200 240L232 -10M200 396L172 510" p={p} w={11} color={p.shade} />,
    draw: (p) => (
      <>
        <path d="M200 228Q232 232 232 310Q232 396 200 400Z" fill={p.shade} />
        <Light d="M176 280Q178 240 196 234L196 280Z" p={p} />
        <Line d="M200 230V398" p={p} w={1.75} />
        <Hw d="M213 130L229 132L226 158L210 156Z" p={p} />
      </>
    ),
  },
};

const HIP_BODY = "M110 300Q110 240 175 236H225Q290 240 290 300Q290 365 225 370H175Q110 365 110 300Z";

const hipPack: SilhouetteDef = {
  detailFocus: [262, 283],
  front: {
    body: [HIP_BODY],
    shadow: { rx: 100, y: 398 },
    under: (p) => <Strap d="M48 296H352" p={p} w={16} color={p.shade} />,
    draw: (p) => (
      <>
        <Hw d={R(318, 284, 28, 24, 5)} p={p} />
        <Shade d="M114 330Q130 365 175 370H225Q270 365 286 330Z" p={p} />
        <Light d="M120 272Q135 240 175 240H225Q265 240 280 272Z" p={p} />
        <Line d="M126 284Q200 258 274 284" p={p} />
        <Hw d={R(257, 275, 10, 20, 3)} p={p} />
        <Line d="M140 330Q200 354 260 330" p={p} />
        <Patch x={187} y={300} />
      </>
    ),
  },
  back: {
    body: [HIP_BODY],
    shadow: { rx: 100, y: 398 },
    under: (p) => <Strap d="M48 296H352" p={p} w={16} color={p.shade} />,
    draw: (p) => (
      <>
        <Hw d={R(54, 284, 28, 24, 5)} p={p} />
        <path d={R(136, 270, 128, 60, 20)} fill={p.shade} stroke={p.line} strokeWidth={1.5} />
        <Seam d="M140 300H260" p={p} />
        <Light d="M120 272Q135 240 175 240H225Q265 240 280 272Z" p={p} />
      </>
    ),
  },
  side: {
    body: ["M174 300Q174 240 200 236Q226 240 226 300Q226 365 200 370Q174 365 174 300Z"],
    shadow: { rx: 40, y: 398 },
    under: (p) => <Strap d="M120 268H280" p={p} w={14} color={p.shade} />,
    draw: (p) => (
      <>
        <path d="M200 236Q226 240 226 300Q226 365 200 370Z" fill={p.shade} />
        <Light d="M180 280Q182 246 196 242L196 280Z" p={p} />
        <Line d="M200 238V368" p={p} w={1.75} />
      </>
    ),
  },
};

const SLEEVE_BODY = R(95, 110, 210, 310, 18);

const sleeve: SilhouetteDef = {
  detailFocus: [298, 150],
  front: {
    body: [SLEEVE_BODY],
    shadow: { rx: 110 },
    draw: (p) => (
      <>
        <Shade d="M95 395H305V402Q305 420 287 420H113Q95 420 95 402Z" p={p} />
        <Light d="M95 128Q95 110 113 110H128V395H95Z" p={p} />
        <Line d="M108 122H293V408" p={p} />
        <Seam d={R(104, 119, 192, 292, 12)} p={p} />
        <Hw d={R(295, 134, 10, 24, 3)} p={p} />
        <path d={R(122, 250, 156, 128, 10)} fill="none" stroke={p.line} strokeWidth={2} />
        <Seam d="M126 262H274" p={p} />
        <Patch x={187} y={200} />
      </>
    ),
  },
  back: {
    body: [SLEEVE_BODY],
    shadow: { rx: 110 },
    draw: (p) => (
      <>
        <Shade d="M95 395H305V402Q305 420 287 420H113Q95 420 95 402Z" p={p} />
        <Light d="M272 110H287Q305 110 305 128V395H272Z" p={p} />
        <Line d="M107 408V122H292" p={p} />
        <path d="M95 240H305V290H95Z" fill={p.shade} />
        <Seam d="M98 246H302M98 284H302" p={p} />
      </>
    ),
  },
  side: {
    body: [R(170, 110, 60, 310, 26)],
    shadow: { rx: 38 },
    draw: (p) => (
      <>
        <path d="M200 110H204Q230 110 230 136V394Q230 420 204 420H200Z" fill={p.shade} />
        <Light d="M176 140H186V390H176Z" p={p} />
        <Line d="M200 114V416" p={p} />
        <Hw d={R(195, 124, 10, 24, 3)} p={p} />
      </>
    ),
  },
};

// ---------- apparel ----------

const jacket: SilhouetteDef = {
  detailFocus: [205, 165],
  front: {
    body: [TORSO],
    shadow: { rx: 126 },
    under: (p) => <Shade d="M160 98Q156 48 200 44Q244 48 240 98Z" p={p} />,
    draw: (p) => (
      <>
        {longSleeveExtras(p)}
        <Light d={TORSO_LIGHT} p={p} />
        <Part d="M160 95Q180 112 200 112Q220 112 240 95L238 76Q220 90 200 90Q180 90 162 76Z" p={p} />
        <Line d="M200 112V428" p={p} />
        <Hw d={R(196, 132, 8, 22, 2)} p={p} />
        <Line d="M214 176L254 166" p={p} />
        <Hw d={R(250, 162, 6, 14, 2)} p={p} />
        <Line d="M150 300L162 360M250 300L238 360" p={p} />
        <Seam d="M204 112V404" p={p} />
      </>
    ),
  },
  back: {
    body: [TORSO],
    shadow: { rx: 126 },
    draw: (p) => (
      <>
        {longSleeveExtras(p)}
        <Light d={TORSO_LIGHT_BACK} p={p} />
        <Line d="M134 178Q200 194 266 178" p={p} />
        <Part d="M158 100Q152 40 200 36Q248 40 242 100Q222 126 200 126Q178 126 158 100Z" p={p} />
        <Seam d="M200 40V124" p={p} />
        <Shade d="M170 104Q200 116 230 104Q220 120 200 120Q180 120 170 104Z" p={p} />
      </>
    ),
  },
  side: {
    body: [SIDE_TORSO],
    shadow: { rx: 60 },
    under: (p) => <Shade d="M178 98Q166 46 210 42Q248 48 242 102Z" p={p} />,
    draw: (p) => (
      <>
        <Line d="M250 140L254 426" p={p} />
        {sideApparel(p)}
        <Part d="M178 95Q200 104 222 95L226 78Q200 88 178 78Z" p={p} />
      </>
    ),
  },
};

const fleece: SilhouetteDef = {
  detailFocus: [200, 150],
  front: {
    body: [TORSO],
    shadow: { rx: 126 },
    draw: (p) => (
      <>
        {longSleeveExtras(p, true)}
        <Light d={TORSO_LIGHT} p={p} />
        <Part d="M160 95Q180 112 200 112Q220 112 240 95L238 78Q220 92 200 92Q180 92 162 78Z" p={p} />
        <Line d="M200 92V210" p={p} />
        <Seam d="M196 112V210H204V112" p={p} />
        <Hw d={R(195, 120, 10, 22, 3)} p={p} />
        <path d={R(222, 168, 40, 46, 6)} fill="none" stroke={p.line} strokeWidth={1.75} />
        <Line d="M226 178H258" p={p} w={1.5} />
        <Seam d="M140 250H260M140 300H260M140 350H260" p={p} />
      </>
    ),
  },
  back: {
    body: [TORSO],
    shadow: { rx: 126 },
    draw: (p) => (
      <>
        {longSleeveExtras(p, true)}
        <Light d={TORSO_LIGHT_BACK} p={p} />
        <Part d="M160 95Q180 104 200 104Q220 104 240 95L238 78Q220 86 200 86Q180 86 162 78Z" p={p} />
        <Line d="M136 176Q200 190 264 176" p={p} />
        <Seam d="M140 250H260M140 300H260M140 350H260" p={p} />
      </>
    ),
  },
  side: {
    body: [SIDE_TORSO],
    shadow: { rx: 60 },
    draw: (p) => (
      <>
        {sideApparel(p, true)}
        <Part d="M178 95Q200 104 222 95L226 80Q200 90 178 80Z" p={p} />
        <Seam d="M152 260H182M152 320H184" p={p} />
      </>
    ),
  },
};

const VEST_BODY =
  "M158 92L120 102Q100 110 104 140Q128 170 124 215L122 420Q122 428 130 428H270Q278 428 278 420L276 215Q272 170 296 140Q300 110 280 102L242 92Q222 108 200 108Q178 108 158 92Z";
const VEST_BAFFLES = [160, 205, 250, 295, 340, 385]
  .map((y) => `M126 ${y}Q200 ${y + 8} 274 ${y}`)
  .join("");

const vest: SilhouetteDef = {
  detailFocus: [200, 140],
  front: {
    body: [VEST_BODY],
    shadow: { rx: 104 },
    draw: (p) => (
      <>
        <Shade d="M122 404H278V420Q278 428 270 428H130Q122 428 122 420Z" p={p} />
        <Light d="M156 109Q130 115 127 140Q139 158 149 176Q156 140 186 111Z" p={p} />
        <Line d={VEST_BAFFLES} p={p} w={1.75} />
        <Part d="M158 92Q178 108 200 108Q222 108 242 92L240 76Q222 90 200 90Q178 90 160 76Z" p={p} />
        <Line d="M200 108V428" p={p} />
        <Hw d={R(196, 122, 8, 22, 2)} p={p} />
        <Line d="M140 300L150 350M260 300L250 350" p={p} />
        <Line d="M104 140Q128 170 124 215M296 140Q272 170 276 215" p={p} w={3} />
      </>
    ),
  },
  back: {
    body: [VEST_BODY],
    shadow: { rx: 104 },
    draw: (p) => (
      <>
        <Shade d="M122 404H278V420Q278 428 270 428H130Q122 428 122 420Z" p={p} />
        <Light d="M244 109Q270 115 273 140Q261 158 251 176Q244 140 214 111Z" p={p} />
        <Line d={VEST_BAFFLES} p={p} w={1.75} />
        <Part d="M158 92Q178 100 200 100Q222 100 242 92L240 76Q222 84 200 84Q178 84 160 76Z" p={p} />
        <Line d="M104 140Q128 170 124 215M296 140Q272 170 276 215" p={p} w={3} />
      </>
    ),
  },
  side: {
    body: ["M180 95Q160 100 162 140L158 420Q158 428 166 428H234Q242 428 242 420L238 140Q240 100 220 95Q200 102 180 95Z"],
    shadow: { rx: 50 },
    draw: (p) => (
      <>
        <Shade d="M158.2 404H241.8L242 420Q242 428 234 428H166Q158 428 158 420Z" p={p} />
        <Line d={[160, 205, 250, 295, 340, 385].map((y) => `M161 ${y}Q200 ${y + 6} 239 ${y}`).join("")} p={p} w={1.75} />
        <ellipse cx={200} cy={158} rx={20} ry={42} fill={p.shade} stroke={p.line} strokeWidth={3} />
        <Part d="M180 95Q200 102 220 95L222 80Q200 88 178 80Z" p={p} />
      </>
    ),
  },
};

const TEE_FRONT =
  "M165 90L120 102Q100 108 92 125L62 190L108 212L132 172L132 364Q132 372 140 372H260Q268 372 268 364L268 172L292 212L338 190L308 125Q300 108 280 102L235 90Q225 116 200 116Q175 116 165 90Z";
const TEE_BACK =
  "M165 90L120 102Q100 108 92 125L62 190L108 212L132 172L132 364Q132 372 140 372H260Q268 372 268 364L268 172L292 212L338 190L308 125Q300 108 280 102L235 90Q220 100 200 100Q180 100 165 90Z";

function teeCommon(p: Palette) {
  return (
    <>
      <Seam d="M68 180L112 202M332 180L288 202" p={p} />
      <Seam d="M134 356H266" p={p} />
      <Line d="M120 102Q138 140 132 172M280 102Q262 140 268 172" p={p} w={1.75} />
    </>
  );
}

const tee: SilhouetteDef = {
  detailFocus: [200, 112],
  front: {
    body: [TEE_FRONT],
    shadow: { rx: 112, y: 392 },
    draw: (p) => (
      <>
        <Shade d="M168 92Q178 108 200 108Q222 108 232 92Q216 99 200 99Q184 99 168 92Z" p={p} />
        <Light d="M137 180Q135 260 138 350Q148 270 152 190Z" p={p} />
        <path d="M165 90Q175 116 200 116Q225 116 235 90" fill="none" stroke={p.line} strokeWidth={5} opacity={0.5} />
        <Line d="M165 90Q175 116 200 116Q225 116 235 90" p={p} />
        {teeCommon(p)}
      </>
    ),
  },
  back: {
    body: [TEE_BACK],
    shadow: { rx: 112, y: 392 },
    draw: (p) => (
      <>
        <Light d="M263 180Q265 260 262 350Q252 270 248 190Z" p={p} />
        <path d="M165 90Q180 100 200 100Q220 100 235 90" fill="none" stroke={p.line} strokeWidth={5} opacity={0.5} />
        <Line d="M165 90Q180 100 200 100Q220 100 235 90" p={p} />
        <path d={R(192, 104, 16, 9, 2)} fill="#EAE4D9" stroke="#B8B0A3" strokeWidth={1} />
        {teeCommon(p)}
      </>
    ),
  },
  side: {
    body: ["M185 92Q165 96 160 120L156 364Q156 372 164 372H236Q244 372 244 364L240 120Q235 96 215 92Q200 98 185 92Z"],
    shadow: { rx: 50, y: 392 },
    draw: (p) => (
      <>
        <Light d="M163 140Q160 240 162 350Q168 250 170 146Z" p={p} />
        <Part d="M180 100Q215 96 228 120L238 200L190 214Q178 170 180 100Z" p={p} />
        <Seam d="M234 190L193 203" p={p} />
        <Line d="M185 92Q200 98 215 92" p={p} />
        <Seam d="M158 356H242" p={p} />
      </>
    ),
  },
};

const SHORTS_BODY =
  "M112 150H288L306 360Q307 370 297 371L215 378Q206 379 205 370L200 250L195 370Q194 379 185 378L103 371Q93 370 94 360Z";

const shorts: SilhouetteDef = {
  detailFocus: [200, 175],
  front: {
    body: [SHORTS_BODY],
    shadow: { rx: 110, y: 404 },
    draw: (p) => (
      <>
        <Light d="M112 160H150L136 368L103 371Q93 370 94 360Z" p={p} />
        <path d={R(110, 130, 180, 28, 6)} fill={p.shade} stroke={p.line} strokeWidth={1.5} />
        <Rib x0={112} x1={288} y0={135} y1={153} p={p} step={12} />
        <Line d="M196 158Q190 182 184 198M204 158Q210 182 216 198" p={p} w={1.75} />
        <circle cx={184} cy={200} r={3.5} fill={p.hw} />
        <circle cx={216} cy={200} r={3.5} fill={p.hw} />
        <Seam d="M200 160Q206 205 200 250" p={p} />
        <Line d="M118 160Q144 200 128 232M282 160Q256 200 272 232" p={p} />
        <Seam d="M98 352L194 360M302 352L206 360" p={p} />
      </>
    ),
  },
  back: {
    body: [SHORTS_BODY],
    shadow: { rx: 110, y: 404 },
    draw: (p) => (
      <>
        <Light d="M250 160H288L306 360Q307 370 297 371L262 368Z" p={p} />
        <path d={R(110, 130, 180, 28, 6)} fill={p.shade} stroke={p.line} strokeWidth={1.5} />
        <Rib x0={112} x1={288} y0={135} y1={153} p={p} step={12} />
        <Line d="M114 205Q200 222 286 205" p={p} />
        <Seam d="M200 158V250" p={p} />
        <path d={R(222, 226, 48, 42, 6)} fill="none" stroke={p.line} strokeWidth={1.75} />
        <Line d="M228 238H264" p={p} w={1.5} />
        <Hw d={R(259, 233, 6, 12, 2)} p={p} />
        <Seam d="M98 352L194 360M302 352L206 360" p={p} />
      </>
    ),
  },
  side: {
    body: ["M168 150H232L242 370Q242 378 234 378H166Q158 378 158 370Z"],
    shadow: { rx: 50, y: 404 },
    draw: (p) => (
      <>
        <Shade d="M200 158H232L242 370Q242 378 234 378H202Z" p={p} />
        <path d={R(166, 130, 68, 28, 6)} fill={p.shade} stroke={p.line} strokeWidth={1.5} />
        <Seam d="M200 160L202 376" p={p} />
        <Line d="M184 170Q176 210 190 240" p={p} />
        <Seam d="M161 360H239" p={p} />
      </>
    ),
  },
};

const TROUSERS_BODY =
  "M128 76H272L282 426Q283 436 273 436L217 438Q208 438 207 429L200 190L193 429Q192 438 183 438L127 436Q117 436 118 426Z";

const trousers: SilhouetteDef = {
  detailFocus: [124, 398],
  front: {
    body: [TROUSERS_BODY],
    shadow: { rx: 92, y: 446 },
    draw: (p) => (
      <>
        <Light d="M128 86H156L146 434L127 436Q117 436 118 426Z" p={p} />
        <path d={R(126, 56, 148, 26, 6)} fill={p.shade} stroke={p.line} strokeWidth={1.5} />
        <Rib x0={128} x1={272} y0={61} y1={77} p={p} step={12} />
        <Seam d="M200 84Q206 140 200 190" p={p} />
        <Line d="M134 86Q156 120 142 150M266 86Q244 120 258 150" p={p} />
        <Line d="M122 280Q156 290 194 282M206 282Q244 290 278 280" p={p} w={1.75} />
        <Line d="M124 372L122 428M276 372L278 428" p={p} />
        <Hw d={R(120, 370, 8, 16, 2)} p={p} />
        <Hw d={R(272, 370, 8, 16, 2)} p={p} />
      </>
    ),
  },
  back: {
    body: [TROUSERS_BODY],
    shadow: { rx: 92, y: 446 },
    draw: (p) => (
      <>
        <Light d="M244 86H272L282 426Q283 436 273 436L254 434Z" p={p} />
        <path d={R(126, 56, 148, 26, 6)} fill={p.shade} stroke={p.line} strokeWidth={1.5} />
        <Rib x0={128} x1={272} y0={61} y1={77} p={p} step={12} />
        <Line d="M130 130Q200 146 270 130" p={p} />
        <Seam d="M200 84V190" p={p} />
        <Line d="M122 280Q156 290 194 282M206 282Q244 290 278 280" p={p} w={1.75} />
      </>
    ),
  },
  side: {
    body: ["M174 76H226L232 430Q232 438 224 438H176Q168 438 168 430Z"],
    shadow: { rx: 42, y: 446 },
    draw: (p) => (
      <>
        <Shade d="M200 82H226L232 430Q232 438 224 438H202Z" p={p} />
        <path d={R(170, 56, 60, 26, 6)} fill={p.shade} stroke={p.line} strokeWidth={1.5} />
        <Seam d="M200 84L202 436" p={p} />
        <Line d="M170 290Q186 296 200 292" p={p} w={1.75} />
        <Line d="M174 372L172 430" p={p} />
        <Hw d={R(170, 370, 8, 16, 2)} p={p} />
      </>
    ),
  },
};

const hoodie: SilhouetteDef = {
  detailFocus: [200, 150],
  front: {
    body: [TORSO],
    shadow: { rx: 126 },
    under: (p) => <Shade d="M158 100Q152 42 200 38Q248 42 242 100Z" p={p} />,
    draw: (p) => (
      <>
        {longSleeveExtras(p, true)}
        <Light d={TORSO_LIGHT} p={p} />
        <Part d="M156 96Q164 140 200 142Q236 140 244 96Q222 114 200 114Q178 114 156 96Z" p={p} />
        <Line d="M188 132L184 196M212 132L216 196" p={p} w={1.75} />
        <circle cx={184} cy={199} r={3.5} fill={p.hw} />
        <circle cx={216} cy={199} r={3.5} fill={p.hw} />
        <path d="M148 296H252L264 376H136Z" fill="none" stroke={p.line} strokeWidth={2} />
        <Line d="M150 304L140 368M250 304L260 368" p={p} w={1.5} />
      </>
    ),
  },
  back: {
    body: [TORSO],
    shadow: { rx: 126 },
    draw: (p) => (
      <>
        {longSleeveExtras(p, true)}
        <Light d={TORSO_LIGHT_BACK} p={p} />
        <Part d="M156 98Q148 30 200 26Q252 30 244 98Q224 140 200 140Q176 140 156 98Z" p={p} />
        <Seam d="M200 30V138" p={p} />
      </>
    ),
  },
  side: {
    body: [SIDE_TORSO],
    shadow: { rx: 60 },
    under: (p) => <Shade d="M174 100Q160 40 212 36Q252 44 246 106Z" p={p} />,
    draw: (p) => (
      <>
        {sideApparel(p, true)}
        <Line d="M244 300L252 376" p={p} w={1.75} />
        <Part d="M176 96Q200 108 224 96L230 86Q200 98 172 86Z" p={p} />
      </>
    ),
  },
};

const shirt: SilhouetteDef = {
  detailFocus: [234, 190],
  front: {
    body: [TORSO],
    shadow: { rx: 126 },
    draw: (p) => (
      <>
        {longSleeveExtras(p)}
        <Light d={TORSO_LIGHT} p={p} />
        <Shade d="M160 95Q180 108 200 108Q220 108 240 95Q220 100 200 100Q180 100 160 95Z" p={p} />
        <Line d="M200 112V428" p={p} />
        <Seam d="M192 112V404M208 112V404" p={p} />
        {[150, 200, 250, 300, 350].map((y) => (
          <circle key={y} cx={200} cy={y} r={3.5} fill={p.hw} />
        ))}
        <Part d="M160 95L180 142L200 112Z" p={p} />
        <Part d="M240 95L220 142L200 112Z" p={p} />
        <path d={R(146, 176, 40, 46, 4)} fill="none" stroke={p.line} strokeWidth={1.75} />
        <path d={R(214, 176, 40, 46, 4)} fill="none" stroke={p.line} strokeWidth={1.75} />
        <Part d="M144 170H188V186L166 192L144 186Z" p={p} />
        <Part d="M212 170H256V186L234 192L212 186Z" p={p} />
        <circle cx={166} cy={185} r={2.5} fill={p.hw} />
        <circle cx={234} cy={185} r={2.5} fill={p.hw} />
      </>
    ),
  },
  back: {
    body: [TORSO],
    shadow: { rx: 126 },
    draw: (p) => (
      <>
        {longSleeveExtras(p)}
        <Light d={TORSO_LIGHT_BACK} p={p} />
        <Line d="M134 162Q200 176 266 162" p={p} />
        <Line d="M194 170V196M206 170V196" p={p} w={1.5} />
        <Part d="M160 95Q200 116 240 95L238 82Q200 102 162 82Z" p={p} fill={p.shade} />
      </>
    ),
  },
  side: {
    body: [SIDE_TORSO],
    shadow: { rx: 60 },
    draw: (p) => (
      <>
        <Line d="M250 140L254 426" p={p} />
        <circle cx={247} cy={160} r={3} fill={p.hw} />
        {sideApparel(p)}
        <Part d="M222 95L240 132L216 112Z" p={p} />
        <Part d="M178 95Q200 104 222 95L224 82Q200 92 178 82Z" p={p} fill={p.shade} />
      </>
    ),
  },
};

// ---------- accessories ----------

const BEANIE_CROWN = "M100 320Q94 150 200 140Q306 150 300 320Z";
const BEANIE_CUFF = R(90, 290, 220, 100, 20);

function beanieDraw(p: Palette, front: boolean) {
  return (
    <>
      <Light d="M118 290Q118 182 188 152Q144 190 140 290Z" p={p} />
      <Line d="M150 290Q146 200 186 148M250 290Q254 200 214 148M200 142V290" p={p} w={1.5} />
      {!front && <Seam d="M178 150Q172 220 174 290" p={p} />}
      <path d={BEANIE_CUFF} fill={p.base} stroke={p.line} strokeWidth={2} />
      <Shade d="M90 370H310V370Q310 390 290 390H110Q90 390 90 370Z" p={p} />
      <Rib x0={92} x1={308} y0={300} y1={380} p={p} step={12} />
      {front && <Patch x={187} y={326} />}
    </>
  );
}

const beanie: SilhouetteDef = {
  detailFocus: [200, 330],
  front: {
    body: [BEANIE_CROWN, BEANIE_CUFF],
    shadow: { rx: 114, y: 404 },
    draw: (p) => beanieDraw(p, true),
  },
  back: {
    body: [BEANIE_CROWN, BEANIE_CUFF],
    shadow: { rx: 114, y: 404 },
    draw: (p) => beanieDraw(p, false),
  },
  side: {
    body: [BEANIE_CROWN, BEANIE_CUFF],
    shadow: { rx: 76, y: 404 },
    transform: SQUASH(0.68),
    draw: (p) => beanieDraw(p, false),
  },
};

const CAP_CROWN = "M100 300Q100 150 200 145Q300 150 300 300Z";
const CAP_BRIM = "M86 298Q200 268 314 298Q324 330 292 340Q200 322 108 340Q76 330 86 298Z";

const cap: SilhouetteDef = {
  detailFocus: [200, 210],
  front: {
    body: [CAP_CROWN],
    shadow: { rx: 118, y: 372 },
    draw: (p) => (
      <>
        <Light d="M112 290Q112 168 196 150Q138 190 136 290Z" p={p} />
        <Line d="M200 147V296M200 147Q150 196 144 296M200 147Q250 196 256 296" p={p} w={1.75} />
        <circle cx={160} cy={205} r={3} fill="none" stroke={p.line} strokeWidth={1.5} />
        <circle cx={240} cy={205} r={3} fill="none" stroke={p.line} strokeWidth={1.5} />
        <circle cx={200} cy={147} r={6} fill={p.base} stroke={p.line} strokeWidth={2} />
        <Patch x={187} y={232} />
        <Part d={CAP_BRIM} p={p} />
        <Shade d="M108 340Q200 322 292 340Q200 352 108 340Z" p={p} />
        <Seam d="M98 304Q200 280 302 304" p={p} />
      </>
    ),
  },
  back: {
    body: [CAP_CROWN],
    shadow: { rx: 104, y: 372 },
    under: (p) => <Shade d="M116 298Q200 330 284 298Q200 346 116 298Z" p={p} />,
    draw: (p) => (
      <>
        <Light d="M288 290Q288 168 204 150Q262 190 264 290Z" p={p} />
        <Line d="M200 147Q150 196 144 296M200 147Q250 196 256 296" p={p} w={1.75} />
        <circle cx={200} cy={147} r={6} fill={p.base} stroke={p.line} strokeWidth={2} />
        <path d="M168 300Q168 252 200 252Q232 252 232 300Z" fill="#ECE7DF" stroke={p.line} strokeWidth={2} />
        <path d={R(160, 282, 80, 12, 4)} fill={p.shade} stroke={p.line} strokeWidth={1.5} />
        <Hw d={R(212, 279, 14, 18, 3)} p={p} />
        <Seam d="M102 292H166M234 292H298" p={p} />
      </>
    ),
  },
  side: {
    body: ["M124 300Q120 160 216 150Q292 158 292 300Z"],
    shadow: { rx: 112, y: 372 },
    draw: (p) => (
      <>
        <Light d="M136 290Q136 176 206 158Q156 196 156 290Z" p={p} />
        <Line d="M214 152Q186 210 196 298" p={p} w={1.75} />
        <circle cx={218} cy={151} r={6} fill={p.base} stroke={p.line} strokeWidth={2} />
        <Part d="M128 300Q76 300 50 318Q58 334 92 332Q118 324 150 306Z" p={p} />
        <Seam d="M126 296H290" p={p} />
      </>
    ),
  },
};

// Slim card wallet: small, landscape, cards peeking out of the top.
const WALLET_BODY = R(112, 206, 176, 124, 14);

const wallet: SilhouetteDef = {
  detailFocus: [200, 268],
  front: {
    body: [WALLET_BODY],
    shadow: { rx: 92, y: 348 },
    under: () => (
      <>
        <path d={R(136, 188, 92, 50, 5)} fill="#D9D2C6" stroke="#B8B0A3" strokeWidth={1} />
        <path d={R(150, 194, 92, 50, 5)} fill="#C9C2B7" stroke="#B8B0A3" strokeWidth={1} />
      </>
    ),
    draw: (p) => (
      <>
        <Light d="M126 206H170V228Q140 232 112 228V220Q112 206 126 206Z" p={p} />
        <Line d="M112 248Q200 264 288 248" p={p} />
        <Shade d="M112 276Q200 292 288 276V316Q288 330 274 330H126Q112 330 112 316Z" p={p} />
        <Line d="M112 276Q200 292 288 276" p={p} />
        <Seam d={R(119, 213, 162, 110, 10)} p={p} />
        <Patch x={187} y={300} />
      </>
    ),
  },
  back: {
    body: [WALLET_BODY],
    shadow: { rx: 92, y: 348 },
    draw: (p) => (
      <>
        <Light d="M126 206H170V228Q140 232 112 228V220Q112 206 126 206Z" p={p} />
        <Shade d="M112 290H288V316Q288 330 274 330H126Q112 330 112 316Z" p={p} />
        <Line d="M112 290H288" p={p} />
        <Seam d={R(119, 213, 162, 110, 10)} p={p} />
        <circle cx={200} cy={254} r={13} fill="none" stroke={p.line} strokeWidth={1.5} opacity={0.7} />
        <path d="M192 256q4 -3.5 8 0t8 0" fill="none" stroke={p.line} strokeWidth={1.5} opacity={0.7} />
      </>
    ),
  },
  side: {
    body: ["M150 218L240 202V320L150 336Z"],
    shadow: { rx: 72, y: 348 },
    under: () => <path d="M166 206L228 194V226L166 238Z" fill="#D9D2C6" stroke="#B8B0A3" strokeWidth={1} />,
    draw: (p) => (
      <>
        <Shade d="M240 202L252 208V326L240 320Z" p={p} />
        <Light d="M150 218L184 212V236L150 242Z" p={p} />
        <Line d="M150 254L240 238M150 284L240 268" p={p} />
        <Seam d="M156 225L234 211V314L156 328Z" p={p} />
      </>
    ),
  },
};

// Travel wallet: tall zip-around passport wallet with a wrist strap.
const ZIP_WALLET_BODY = R(114, 120, 172, 270, 22);

const zipWallet: SilhouetteDef = {
  detailFocus: [272, 140],
  front: {
    body: [ZIP_WALLET_BODY],
    shadow: { rx: 96, y: 410 },
    under: (p) => <Strap d="M120 150C70 150 64 230 116 236" p={p} w={8} color={p.shade} />,
    draw: (p) => (
      <>
        <Light d="M136 120H200V150H114V142Q114 120 136 120Z" p={p} />
        <Shade d="M114 360H286V368Q286 390 264 390H136Q114 390 114 368Z" p={p} />
        <Line d="M130 134H262Q272 134 272 144V376" p={p} />
        <Seam d="M130 142H264V376" p={p} />
        <Hw d={R(266, 140, 24, 12, 4)} p={p} />
        <path d={R(136, 250, 128, 92, 8)} fill="none" stroke={p.line} strokeWidth={1.75} />
        <Seam d="M140 262H260" p={p} />
        <Patch x={187} y={190} />
      </>
    ),
  },
  back: {
    body: [ZIP_WALLET_BODY],
    shadow: { rx: 96, y: 410 },
    under: (p) => <Strap d="M280 150C330 150 336 230 284 236" p={p} w={8} color={p.shade} />,
    draw: (p) => (
      <>
        <Light d="M200 120H264Q286 120 286 142V150H200Z" p={p} />
        <Shade d="M114 360H286V368Q286 390 264 390H136Q114 390 114 368Z" p={p} />
        <Line d="M128 376V144Q128 134 138 134H270" p={p} />
        <Line d="M114 214H286" p={p} />
        <Seam d={R(122, 222, 156, 128, 10)} p={p} />
      </>
    ),
  },
  side: {
    body: [R(176, 120, 48, 270, 18)],
    shadow: { rx: 36, y: 410 },
    draw: (p) => (
      <>
        <path d="M200 120H206Q224 120 224 138V372Q224 390 206 390H200Z" fill={p.shade} />
        <Line d="M200 124V386" p={p} />
        <Seam d="M193 128V382" p={p} />
        <Hw d={R(194, 132, 12, 24, 4)} p={p} />
      </>
    ),
  },
};

const POUCH_BODY = R(90, 170, 220, 180, 30);

const pouch: SilhouetteDef = {
  detailFocus: [292, 190],
  front: {
    body: [POUCH_BODY],
    shadow: { rx: 112, y: 372 },
    under: (p) => <Strap d="M96 222C46 222 46 300 96 300" p={p} w={9} color={p.shade} />,
    draw: (p) => (
      <>
        <Light d="M120 170H280Q300 170 306 186Q200 176 94 186Q100 170 120 170Z" p={p} />
        <Shade d="M90 310H310V320Q310 350 280 350H120Q90 350 90 320Z" p={p} />
        <Line d="M108 192Q200 178 292 192" p={p} />
        <Seam d="M108 200Q200 186 292 200" p={p} />
        <Hw d={R(284, 184, 26, 12, 4)} p={p} />
        <Patch x={187} y={260} />
      </>
    ),
  },
  back: {
    body: [POUCH_BODY],
    shadow: { rx: 112, y: 372 },
    under: (p) => <Strap d="M304 222C354 222 354 300 304 300" p={p} w={9} color={p.shade} />,
    draw: (p) => (
      <>
        <Light d="M120 170H280Q300 170 306 186Q200 176 94 186Q100 170 120 170Z" p={p} />
        <Shade d="M90 310H310V320Q310 350 280 350H120Q90 350 90 320Z" p={p} />
        <Line d="M108 192Q200 178 292 192" p={p} />
        <Seam d={R(100, 210, 200, 120, 20)} p={p} />
      </>
    ),
  },
  side: {
    body: ["M162 250Q162 170 200 168Q238 170 238 250V328Q238 350 216 350H184Q162 350 162 328Z"],
    shadow: { rx: 50, y: 372 },
    draw: (p) => (
      <>
        <path d="M200 168Q238 170 238 250V328Q238 350 216 350H200Z" fill={p.shade} />
        <Light d="M170 230Q172 184 196 176L196 230Z" p={p} />
        <Line d="M200 170V348" p={p} w={1.75} />
        <Hw d={R(194, 162, 12, 22, 4)} p={p} />
      </>
    ),
  },
};

const BOTTLE_BODY =
  "M170 138Q170 125 183 125H217Q230 125 230 138L232 165Q270 178 270 215V403Q270 425 248 425H152Q130 425 130 403V215Q130 178 168 165Z";

function bottleDraw(p: Palette, front: boolean) {
  return (
    <>
      <Shade d="M244 196Q270 204 270 215V403Q270 425 248 425H244Z" p={p} />
      <Light d={R(144, 215, 14, 180, 7)} p={p} />
      <Seam d="M132 394H268" p={p} />
      <Line d="M170 150H230" p={p} w={1.5} />
      <path d="M182 72Q200 38 218 72" fill="none" stroke={p.hw} strokeWidth={7} strokeLinecap="round" />
      <Hw d={R(164, 62, 72, 68, 14)} p={p} />
      <path d="M176 76V118M188 76V118M200 76V118M212 76V118M224 76V118" stroke={p.base} strokeWidth={1.5} opacity={0.35} />
      {front && <Patch x={187} y={300} />}
    </>
  );
}

const bottle: SilhouetteDef = {
  detailFocus: [200, 140],
  front: {
    body: [BOTTLE_BODY],
    shadow: { rx: 76 },
    draw: (p) => bottleDraw(p, true),
  },
  back: {
    body: [BOTTLE_BODY],
    shadow: { rx: 76 },
    draw: (p) => bottleDraw(p, false),
  },
  side: {
    body: [BOTTLE_BODY],
    shadow: { rx: 70 },
    transform: SQUASH(0.9),
    draw: (p) => bottleDraw(p, false),
  },
};

const CUBE_BIG = R(85, 170, 230, 170, 18);
const CUBE_SMALL = R(115, 275, 170, 148, 16);

const cube: SilhouetteDef = {
  detailFocus: [262, 300],
  front: {
    body: [CUBE_BIG, CUBE_SMALL],
    shadow: { rx: 118 },
    draw: (p) => (
      <>
        <path d={R(103, 186, 194, 68, 10)} fill={p.shade} />
        <path
          d="M110 196L150 246M140 190L190 248M175 190L225 248M210 190L260 248M245 190L290 244M110 236L150 190M140 248L190 190M175 248L225 190M210 248L260 190M245 248L290 194"
          stroke={p.line}
          strokeWidth={1}
          opacity={0.45}
        />
        <Line d="M103 196Q103 186 113 186H287Q297 186 297 196V244Q297 254 287 254H113Q103 254 103 244Z" p={p} />
        <Light d="M131 275H200V300H115V291Q115 275 131 275Z" p={p} />
        <path d={CUBE_SMALL} fill="none" stroke={p.line} strokeWidth={2} />
        <Shade d="M115 400H285V407Q285 423 269 423H131Q115 423 115 407Z" p={p} />
        <Line d="M128 300H272" p={p} />
        <Seam d="M128 308H272" p={p} />
        <Hw d={R(257, 292, 10, 20, 3)} p={p} />
        <Strap d="M285 330Q300 345 285 360" p={p} w={6} color={p.shade} />
        <Patch x={187} y={352} />
      </>
    ),
  },
  back: {
    body: [R(85, 200, 230, 220, 18)],
    shadow: { rx: 118 },
    draw: (p) => (
      <>
        <Strap d="M176 202Q200 180 224 202" p={p} w={8} color={p.shade} />
        <Light d="M103 200H200V230H85V218Q85 200 103 200Z" p={p} />
        <Shade d="M85 392H315V402Q315 420 297 420H103Q85 420 85 402Z" p={p} />
        <Line d="M98 226H302" p={p} />
        <Seam d={R(94, 209, 212, 202, 12)} p={p} />
      </>
    ),
  },
  side: {
    body: ["M130 232L170 196H306L270 232Z", R(130, 228, 140, 190, 12), "M270 232L306 196V384L270 418Z"],
    shadow: { rx: 104 },
    draw: (p) => (
      <>
        <Light d="M130 232L170 196H306L270 232Z" p={p} />
        <Shade d="M270 232L306 196V384L270 418Z" p={p} />
        <path d="M130 232L170 196H306L270 232ZM270 232L306 196V384L270 418Z" fill="none" stroke={p.line} strokeWidth={2} strokeLinejoin="round" />
        <path d={R(146, 244, 108, 60, 8)} fill={p.shade} />
        <Line d="M146 252Q146 244 154 244H246Q254 244 254 252V296Q254 304 246 304H154Q146 304 146 296Z" p={p} />
        <Seam d="M140 316H262" p={p} />
        <Strap d="M286 270Q300 290 286 310" p={p} w={6} color={p.shade} />
      </>
    ),
  },
};

const KEY_WEB = `${R(158, 168, 84, 232, 42)}${R(178, 188, 44, 192, 22)}`;

function keyClipDraw(p: Palette, front: boolean) {
  return (
    <>
      <Seam d={R(166, 176, 68, 216, 34)} p={p} />
      <path d={R(158, 214, 84, 26, 0)} fill={p.shade} />
      <Line d="M158 214H242M158 240H242" p={p} w={1.5} />
      <path
        d="M182 230V120Q182 80 212 80Q242 80 242 120V170"
        fill="none"
        stroke={p.hw}
        strokeWidth={10}
        strokeLinecap="round"
      />
      <path d="M224 118V164" stroke={p.hw} strokeWidth={4} strokeLinecap="round" />
      <circle cx={200} cy={414} r={22} fill="none" stroke={p.hw} strokeWidth={6} />
      {front && <Patch x={187} y={300} />}
    </>
  );
}

const KEY_SCALE = "translate(200 440) scale(0.7) translate(-200 -440)";

const keyClip: SilhouetteDef = {
  detailFocus: [204, 254],
  front: {
    body: [KEY_WEB],
    shadow: { rx: 40, y: 446 },
    transform: KEY_SCALE,
    draw: (p) => keyClipDraw(p, true),
  },
  back: {
    body: [KEY_WEB],
    shadow: { rx: 40, y: 446 },
    transform: KEY_SCALE,
    draw: (p) => keyClipDraw(p, false),
  },
  side: {
    body: [R(186, 168, 28, 232, 12)],
    shadow: { rx: 28, y: 446 },
    transform: KEY_SCALE,
    draw: (p) => (
      <>
        <path d="M200 168V400" stroke={p.line} strokeWidth={1.5} strokeDasharray="4 4" />
        <path d={R(186, 214, 28, 26, 0)} fill={p.shade} />
        <path d="M200 214V120Q200 80 206 80Q212 80 212 120V170" fill="none" stroke={p.hw} strokeWidth={10} strokeLinecap="round" />
        <ellipse cx={200} cy={414} rx={7} ry={22} fill="none" stroke={p.hw} strokeWidth={6} />
      </>
    ),
  },
};

export const SILHOUETTES: Record<Silhouette, SilhouetteDef> = {
  backpack,
  daypack,
  "zip-wallet": zipWallet,
  "roll-top": rollTop,
  tote,
  duffel,
  sling,
  "hip-pack": hipPack,
  sleeve,
  jacket,
  fleece,
  vest,
  tee,
  shorts,
  trousers,
  hoodie,
  shirt,
  beanie,
  cap,
  wallet,
  pouch,
  bottle,
  cube,
  keyclip: keyClip,
};
