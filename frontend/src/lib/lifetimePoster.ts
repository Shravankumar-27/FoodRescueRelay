import type { Contribution } from "../types/contribution";
import { escapeXml, type PosterTheme } from "./recognitionPoster";

/** Standalone, link-free artwork using the same lifetime totals as the wallet. */
export function lifetimePosterSvg(data: Contribution, theme: PosterTheme) {
  const dark = theme === "midnight";
  const ink = dark ? "#fff5dc" : "#163c32";
  const paper = dark ? "#123a30" : "#faf3e3";
  const gold = dark ? "#e9c680" : "#916426";
  const muted = dark ? "#c3d1b9" : "#596c56";
  const n = (value: number) => value.toLocaleString("en-IN", { maximumFractionDigits: 1 });
  const text = (value: string, x: number, y: number, size: number, color = ink, weight = 400, anchor = "middle") =>
    `<text x="${x}" y="${y}" font-size="${size}" fill="${color}" font-weight="${weight}" text-anchor="${anchor}">${escapeXml(value.replace(/(?:https?:\/\/|www\.)\S+/gi, ""))}</text>`;
  const nameSize = data.organization_name.length > 90 ? 26 : 38;
  const width = data.organization_name.length > 90 ? 58 : 37;
  const words = data.organization_name.split(/\s+/).flatMap(word => word.match(new RegExp(`.{1,${width}}`, "g")) ?? []);
  const nameLines: string[] = [];
  for (const word of words) {
    const last = nameLines.length - 1;
    if (last < 0 || nameLines[last].length + word.length + 1 > width) nameLines.push(word);
    else nameLines[last] += ` ${word}`;
  }
  const receiver = data.role === "RECEIVER";
  const leaves = Array.from({ length: 7 }, (_, i) => {
    const y = 600 + i * 21, x = 146 - Math.sin(i / 6 * Math.PI) * 35;
    return `<ellipse cx="${x}" cy="${y}" rx="10" ry="22" transform="rotate(-42 ${x} ${y})"/><ellipse cx="${1080 - x}" cy="${y}" rx="10" ry="22" transform="rotate(42 ${1080 - x} ${y})"/>`;
  }).join("");
  const stats = [
    [n(data.impact.completed_rescues), "COMPLETED RESCUES"],
    [`${n(data.impact.food_kg_estimate)} kg`, "ESTIMATED FOOD WEIGHT"],
    [`${n(data.impact.co2e_kg_estimate)} kg`, "ESTIMATED CO₂e AVOIDED"],
  ];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350" role="img" aria-label="Overall appreciation for ${escapeXml(data.organization_name)}">
    <defs>
      <linearGradient id="lifetime-paper" x2="1" y2="1"><stop stop-color="${paper}"/><stop offset="1" stop-color="${dark ? "#214b39" : "#eddfbe"}"/></linearGradient>
      <radialGradient id="lifetime-glow"><stop stop-color="${gold}" stop-opacity=".14"/><stop offset="1" stop-color="${gold}" stop-opacity="0"/></radialGradient>
    </defs>
    <rect width="1080" height="1350" fill="url(#lifetime-paper)"/>
    <circle cx="540" cy="660" r="530" fill="url(#lifetime-glow)"/>
    <path d="M-80 1230 Q280 930 600 1130 T1180 1050 V1350 H-80Z" fill="${gold}" opacity=".06"/>
    <rect x="28" y="28" width="1024" height="1294" rx="25" fill="none" stroke="${gold}" opacity=".65"/>
    <rect x="39" y="39" width="1002" height="1272" rx="18" fill="none" stroke="${gold}" opacity=".22"/>
    <g font-family="Arial, Helvetica, sans-serif">
      ${text("Food Rescue Relay",72,98,27,ink,800,"start")}
      ${text("THE COMMUNITY TABLE",1008,96,16,gold,700,"end")}
      ${text("OVERALL APPRECIATION",72,177,18,gold,700,"start")}
      <g font-family="Georgia, serif">
        ${text(receiver ? "Care that brings" : "Generosity that",72,250,58,ink,400,"start")}
        ${text(receiver ? "us together." : "keeps growing.",72,315,58,ink,400,"start")}
      </g>
      <g transform="translate(882 240)">
        <path d="M-39 48 L-54 120 L0 91 L54 120 L39 48" fill="${gold}" opacity=".7"/>
        <circle r="83" fill="${paper}" stroke="${gold}" stroke-width="2"/>
        <circle r="68" fill="none" stroke="${gold}" stroke-dasharray="2 9" stroke-width="3"/>
        <path d="M0 -43 L12 -13 L44 -11 L19 10 L27 41 L0 24 L-27 41 L-19 10 L-44 -11 L-12 -13Z" fill="${gold}"/>
      </g>
      ${text("WITH GRATITUDE TO",540,397,17,muted,700)}
      ${nameLines.map((line,i) => text(line,540,444+i*(nameSize+8),nameSize,ink,700)).join("")}
      <path d="M220 557 H860" stroke="${gold}" opacity=".5"/>
      <g fill="${gold}" opacity=".65">${leaves}</g>
      ${text(n(data.impact.total_meals_rescued),540,691,112,ink,800)}
      ${text(receiver ? "MEALS RECEIVED & PUT TO USE" : "MEALS SHARED WITH THE COMMUNITY",540,740,21,gold,700)}
      ${text("All-time receiver-confirmed delivered servings",540,775,18,muted)}
      ${stats.map(([value,label], i) => text(value,205+i*335,861,32,ink,700)+text(label,205+i*335,893,14,muted,700)).join("")}
      <path d="M72 933 H1008" stroke="${gold}" opacity=".5"/>
      ${text(data.medal.toUpperCase(),540,987,28,gold,700)}
      ${text(`${n(data.coins)} KINDNESS COINS  ·  ${n(data.impact.community_partners)} COMMUNITY PARTNERS`,540,1023,18,ink,700)}
      <g font-family="Georgia, serif" font-style="italic">
        ${text(receiver ? "A place at the table begins with those who welcome." : "Every shared meal is a small act of lasting kindness.",540,1090,25)}
        ${text(receiver ? "Thank you for receiving with care, again and again." : "Thank you for choosing community, again and again.",540,1126,25)}
      </g>
      ${text("Issued by Food Rescue Relay · Lifetime platform contribution record",540,1194,18,ink,700)}
      ${text(`As of ${new Date(data.generated_at).toLocaleDateString("en-IN",{timeZone:"UTC"})} UTC · Meal servings, not unique people`,540,1226,16,muted)}
      ${text("Estimates: meals × 0.4 kg food; food kg × 2.5 kg CO₂e. Not measured emissions.",540,1261,15,muted)}
      ${text("Synthetic demo data. Appreciation only. Not a food-safety certification.",540,1287,15,muted)}
    </g>
  </svg>`;
}
