/**
 * Example: a "bento" dashboard — Tailwind (`tw`) syntax, no table in sight.
 * Difficult bits: CSS Grid with spanning cells (`col-span-2 row-span-2`), a
 * conic-gradient donut ring as a dynamic arbitrary value, and an SVG sparkline
 * embedded as a data-URI `<img>`.
 */
import { render } from "takumi-js";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import { canvas, hex, tw } from "../tokens.js";
import { loadFonts } from "../fonts.js";
import { outDir } from "../gallery.js";

/** Build a smooth sparkline as a standalone SVG string, then data-URI it. */
function sparkline(values: number[], w = 360, h = 96): string {
  const min = Math.min(...values);
  const span = Math.max(...values) - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / span) * (h - 12) - 6;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const line = pts.join(" ");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${hex.brand}" stop-opacity="0.55"/>
      <stop offset="1" stop-color="${hex.brand}" stop-opacity="0"/>
    </linearGradient></defs>
    <polygon points="0,${h} ${line} ${w},${h}" fill="url(#g)"/>
    <polyline points="${line}" fill="none" stroke="#818cf8" stroke-width="3"
      stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const card = `flex flex-col rounded-[20px] border p-6 ${tw.surface} ${tw.border}`;

function Stat({ label, value, delta }: { label: string; value: string; delta: string }) {
  return (
    <div tw={card}>
      <div tw={`text-[15px] ${tw.textMuted}`}>{label}</div>
      <div tw={`text-[46px] font-bold mt-1.5 ${tw.text}`}>{value}</div>
      <div tw={`text-[15px] mt-1 text-[${hex.success}]`}>{delta}</div>
    </div>
  );
}

/** Conic-gradient donut: colored ring for `pct`, muted for the rest, hole in the middle. */
function Donut({ pct }: { pct: number }) {
  const deg = Math.round(pct * 3.6);
  // Arbitrary value; underscores become spaces in Tailwind's arbitrary syntax.
  const ring = `bg-[conic-gradient(${hex.brand}_${deg}deg,${hex.border}_${deg}deg_360deg)]`;
  return (
    <div tw={`${card} items-center justify-center`}>
      <div tw={`flex items-center justify-center w-[190px] h-[190px] rounded-full ${ring}`}>
        {/* inner mask turns the disc into a ring */}
        <div tw={`flex flex-col items-center justify-center w-[138px] h-[138px] rounded-full ${tw.surface}`}>
          <div tw={`text-[40px] font-bold ${tw.text}`}>{pct}%</div>
          <div tw={`text-[15px] ${tw.textMuted}`}>uptime SLA</div>
        </div>
      </div>
    </div>
  );
}

export async function bento() {
  const fonts = await loadFonts();
  const series = [12, 18, 15, 22, 19, 28, 26, 34, 31, 40, 38, 52];

  const png = await render(
    <div tw={`flex flex-col w-full h-full font-[Inter] p-10 ${tw.pageBg}`}>
      <div tw={`text-3xl font-bold ${tw.text}`}>Platform Overview</div>
      <div tw={`text-lg mt-1 mb-6 ${tw.textMuted}`}>Last 12 weeks</div>

      {/* CSS grid: 4 columns × 2 rows; the chart cell spans 2×2. */}
      <div tw="grid grid-cols-4 grid-rows-2 gap-4 grow">
        <div tw={`col-span-2 row-span-2 ${card}`}>
          <div tw={`text-[15px] ${tw.textMuted}`}>Weekly signups</div>
          <div tw={`text-[46px] font-bold mt-1.5 ${tw.text}`}>2,481</div>
          <div tw="flex grow items-end">
            <img src={sparkline(series)} width={360} height={96} />
          </div>
        </div>

        <Stat label="MRR" value="$48.2k" delta="+12.4% MoM" />
        <div tw="col-span-1 row-span-2">
          <Donut pct={99} />
        </div>
        <Stat label="Active orgs" value="312" delta="+8 this week" />
        <Stat label="Churn" value="1.9%" delta="-0.3pp" />
      </div>
    </div>,
    { ...canvas.og, fonts },
  );

  await writeFile(join(outDir, "bento.png"), png);
  console.log(`✓ bento.png (${png.length.toLocaleString()} bytes)`);
}
