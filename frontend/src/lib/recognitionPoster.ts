import type { DonationRecognition } from "../types/recognition";

export type PosterTheme = "garden" | "midnight";
export const escapeXml = (value: string) => value.replace(/[<>&"']/g, c => ({"<":"&lt;",">":"&gt;","&":"&amp;",'"':"&quot;","'":"&apos;"}[c]!));

function lines(value: string, width: number) {
  const words = value.replace(/\s+/g, " ").trim().split(" ").flatMap(word => word.match(new RegExp(`.{1,${width}}`, "g")) ?? []);
  const result: string[] = [];
  let line = "";
  for (const word of words) {
    if (line && line.length + word.length + 1 > width) { result.push(line); line = ""; }
    line += `${line ? " " : ""}${word}`;
  }
  if (line) result.push(line);
  return result;
}

export function verificationUrl(record: DonationRecognition, origin = window.location.origin) {
  return `${origin}/recognition/verify/${record.public_token}`;
}

/** Editorial artwork, with no external images or printed links. */
export function recognitionPosterSvg(record: DonationRecognition, theme: PosterTheme, _origin: string, audience: "donor" | "receiver" = "donor") {
  return storyPoster({
    name: audience === "donor" ? record.donor_name : record.receiver_name,
    title: audience === "donor" ? "Generosity, served." : "Every meal matters.",
    eyebrow: audience === "donor" ? "RECEIVER-ISSUED APPRECIATION" : "RECEIVER CONTRIBUTION RECORD",
    amount: record.delivered_servings.toLocaleString("en-IN"), unit: "MEALS SHARED WITH THE COMMUNITY",
    secondary: record.people_served === null ? "Not counted" : `${record.people_served} people served`,
    secondaryNote: "Recipients reported for this delivery only",
    third: record.food_rating === null ? "Not rated" : `${record.food_rating} / 5 food feedback`,
    thirdNote: "Receiver opinion, not a safety assessment",
    quote: audience === "donor" ? record.message || "Good food deserves a place at the table. Thank you for sharing yours." : "You turned surplus into shared meals. Receiving with care is an act of community leadership.",
    issuer: record.issuer_role === "ADMIN" ? "Certificate issued by RescueRelay"
      : audience === "donor" ? `Confirmed & issued by ${record.receiver_name}` : `Food contributed by ${record.donor_name}`,
    footer: `${record.display_id} · ${new Date(record.issued_at).toLocaleDateString("en-IN",{timeZone:"UTC"})} UTC`,
    badge: "WITH CARE", theme,
    disclaimer: "Acknowledgement of contribution, not food-safety, tax or legal certification.",
  });
}

export interface StoryPosterData {
  name:string; title:string; eyebrow:string; amount:string; unit:string; secondary:string;
  secondaryNote:string; third:string; thirdNote:string; quote:string; issuer:string;
  footer:string; badge:string; theme:PosterTheme; disclaimer:string;
}

export function storyPoster(d: StoryPosterData) {
  const dark=d.theme === "midnight";
  const bg=dark?"#123d31":"#faf2df", ink=dark?"#fff7df":"#153f32", muted=dark?"#c9d9bd":"#536549";
  const gold=dark?"#efc875":"#a76a22", accent=dark?"#264e3a":"#ebd8ac";
  const clean=(v:string)=>v.replace(/(?:https?:\/\/|www\.)\S+/gi,"");
  const text=(v:string,x:number,y:number,size:number,color=ink,weight=400,anchor="start")=>`<text x="${x}" y="${y}" font-size="${size}" fill="${color}" font-weight="${weight}" text-anchor="${anchor}">${escapeXml(clean(v))}</text>`;
  const block=(v:string,width:number,x:number,y:number,size:number,color=ink,weight=400)=>lines(clean(v),width).map((l,i)=>text(l,x,y+i*(size+8),size,color,weight)).join("");
  const nameSize=d.name.length>100?27:39;
  const stars=Array.from({length:14},(_,i)=>{const a=i*Math.PI*2/14;return `<circle cx="${874+Math.cos(a)*74}" cy="${214+Math.sin(a)*74}" r="3" fill="${gold}"/>`;}).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350" role="img" aria-label="${escapeXml(d.eyebrow)}">
  <defs><linearGradient id="paper" x2="1" y2="1"><stop stop-color="${bg}"/><stop offset="1" stop-color="${dark?"#1d4c38":"#f5e4c1"}"/></linearGradient></defs>
  <rect width="1080" height="1350" fill="url(#paper)"/>
  <circle cx="1090" cy="720" r="410" fill="${accent}" opacity=".45"/>
  <path d="M-120 1100 Q270 900 550 1130 T1200 1070 L1200 1350 H-120Z" fill="${accent}" opacity=".7"/>
  <rect x="27" y="27" width="1026" height="1296" rx="28" fill="none" stroke="${gold}" opacity=".65"/>
  <g font-family="Arial, Helvetica, sans-serif">
  ${text("RescueRelay",72,98,29,ink,800)}${text("THE COMMUNITY TABLE",1008,96,18,gold,700,"end")}
  ${text(d.eyebrow,72,178,18,gold,700)}
  ${block(d.title,22,72,250,57,ink,800)}
  <path d="M839 263 L819 327 L873 299 L928 327 L910 263" fill="${gold}" opacity=".7"/>
  <circle cx="874" cy="214" r="88" fill="${accent}"/>${stars}
  <circle cx="874" cy="214" r="62" fill="none" stroke="${gold}" stroke-width="2"/>
  <path d="M874 165 L885 195 L918 196 L893 216 L902 247 L874 229 L846 247 L855 216 L830 196 L863 195Z" fill="${gold}"/>
  ${text(d.badge,874,277,12,ink,700,"middle")}
  ${text("A TRIBUTE TO",72,370,17,muted,700)}
  ${block(d.name,d.name.length>100?59:38,72,419,nameSize,ink,700)}
  <path d="M72 553 H1008" stroke="${gold}" opacity=".5"/>
  ${text(d.amount,72,710,d.amount.length>8?79:112,ink,800)}
  ${text(d.unit,77,755,20,gold,700)}
  <g transform="translate(715 555)">
    <ellipse cx="121" cy="189" rx="137" ry="22" fill="${ink}" opacity=".08"/>
    <path d="M-12 64 Q120 99 254 64 Q239 180 121 185 Q3 180 -12 64" fill="${gold}"/>
    <ellipse cx="121" cy="66" rx="133" ry="31" fill="${bg}" stroke="${gold}" stroke-width="7"/>
    <path d="M13 56 Q47 -6 92 49 Q130 -23 169 47 Q210 5 231 55" fill="${accent}" stroke="${muted}" stroke-width="3"/>
    <path d="M104 47 Q61 -23 94 -61 Q151 -41 104 47 M112 24 Q141 -53 183 -38 Q189 12 112 24" fill="${dark?"#afc88d":"#476949"}"/>
    <path d="M121 41 L147 -19" stroke="${bg}" stroke-width="3"/>
  </g>
  ${text(d.secondary,76,836,27,ink,700)}${text(d.secondaryNote,76,866,17,muted)}
  ${text(d.third,580,836,27,ink,700)}${text(d.thirdNote,580,866,17,muted)}
  <path d="M72 907 H1008" stroke="${gold}" opacity=".5"/>
  ${text("“",65,987,87,gold,700)}
  ${block(d.quote,72,110,958,23,ink)}
  ${block(d.issuer,82,76,1120,20,ink,700)}
  ${text(d.footer,76,1220,18,muted)}
  ${text(d.disclaimer,76,1261,16,muted)}
  ${text("RESCUERELAY · CONTRIBUTION RECOGNITION",76,1292,16,gold,700)}
  </g></svg>`;
}

export async function downloadPoster(svg: string, filename: string) {
  const image = new Image();
  const source = URL.createObjectURL(new Blob([svg], {type:"image/svg+xml;charset=utf-8"}));
  try {
    await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("Poster could not render. Please try printing instead.")); image.src = source; });
    const canvas = document.createElement("canvas");
    canvas.width = 1080; canvas.height = 1350;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Image export is unavailable in this browser. Use Print instead.");
    context.drawImage(image,0,0);
    const blob = await new Promise<Blob>((resolve,reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error("Image export failed.")), "image/png"));
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.href=url; link.download=filename; link.click();
    setTimeout(() => URL.revokeObjectURL(url),1000);
    return canvas.toDataURL("image/png");
  } finally { URL.revokeObjectURL(source); }
}
