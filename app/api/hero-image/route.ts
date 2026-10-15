// slowHero friction: the same hero art as /images/hero.svg, bulked up with thousands of tiny detail
// strokes (~1.7 MB) and served after a ~3 s delay. Only requested when slowHero is ON.
export const dynamic = "force-dynamic";

const DELAY_MS = 3000;
const DETAIL_COUNT = 12000;

// Same bands as public/images/hero.svg: [top y, bottom y, stroke colours].
const BANDS: [number, number, string[]][] = [
  [400, 560, ["#C9BDA9", "#E4D9C4", "#FAF8F5"]],
  [545, 660, ["#7F9F98", "#B8C9C3", "#FAF8F5"]],
  [640, 780, ["#4B6E68", "#7F9F98", "#FAF8F5"]],
  [700, 960, ["#164642", "#2F6E68", "#5E7F78"]],
];

function buildSvg(): string {
  let seed = 20260514;
  const rand = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const f = (n: number) => n.toFixed(2);
  const details: string[] = [];
  for (let i = 0; i < DETAIL_COUNT; i++) {
    const [top, bottom, colours] = BANDS[Math.floor(rand() * BANDS.length)];
    const x = rand() * 1200;
    const y = top + rand() * (bottom - top);
    const len = 6 + rand() * 22;
    const lift = 1 + rand() * 3;
    const colour = colours[Math.floor(rand() * colours.length)];
    const opacity = (0.08 + rand() * 0.14).toFixed(2);
    details.push(
      `<path d="M${f(x)} ${f(y)}c${f(len / 3)} ${f(-lift)} ${f(len / 1.5)} ${f(-lift)} ${f(len)} 0" fill="none" stroke="${colour}" stroke-width="${f(0.6 + rand() * 1.2)}" stroke-linecap="round" opacity="${opacity}"/>`,
    );
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 960" width="1200" height="960">
<rect width="1200" height="960" fill="#ECE7DF"/>
<circle cx="860" cy="250" r="110" fill="#F4EBDD"/>
<path d="M0 470C140 420 260 400 400 430S640 470 780 420 1040 360 1200 400V960H0Z" fill="#D9CFBF"/>
<path d="M0 560C180 530 330 540 500 560S820 590 1000 560 1140 540 1200 545V960H0Z" fill="#9DB3AC"/>
<path d="M0 660C160 630 320 640 480 668S800 700 960 668 1120 640 1200 650V960H0Z" fill="#5E7F78"/>
<path d="M0 780C120 720 260 700 420 730S700 800 860 760 1100 700 1200 720V960H0Z" fill="#1F5C57"/>
<g fill="none" stroke="#FAF8F5" stroke-width="4" stroke-linecap="round" opacity="0.6">
<path d="M120 600c40-14 80-14 120 0s80 14 120 0"/>
<path d="M620 620c40-14 80-14 120 0s80 14 120 0"/>
<path d="M380 700c30-10 60-10 90 0s60 10 90 0"/>
</g>
<g>
${details.join("\n")}
</g>
</svg>`;
}

let cached: string | null = null;

export async function GET() {
  cached ??= buildSvg();
  await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
  return new Response(cached, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
