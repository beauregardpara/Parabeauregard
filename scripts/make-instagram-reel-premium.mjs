import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import sharp from "sharp";
import ffmpegPath from "ffmpeg-static";

const root = process.cwd();
const sourceDir = path.join(root, "artifacts", "instagram-reel", "mobile-scenes");
const outDir = path.join(root, "artifacts", "instagram-reel-premium");
await fs.rm(outDir, { recursive: true, force: true });
await fs.mkdir(outDir, { recursive: true });

const scenes = [
  { id: "01", duration: 3.2, kicker: "PARAPHARMACIE EN LIGNE", title: "Votre parapharmacie maintenant en ligne ✨" },
  { id: "02", duration: 3.7, kicker: "SOINS • BEAUTÉ • BIEN-ÊTRE", title: "Découvrez Para Beauregard" },
  { id: "03", duration: 3.8, kicker: "UNE SÉLECTION POUR VOUS", title: "Vos soins & marques préférés" },
  { id: "04", duration: 3.8, kicker: "RECHERCHE • CATÉGORIES", title: "Trouvez facilement vos produits" },
  { id: "05", duration: 4.2, kicker: "PRODUIT • PRIX • PROMOTION", title: "Choisissez votre produit" },
  { id: "06", duration: 3.8, kicker: "EN QUELQUES CLICS", title: "Commandez simplement" },
  { id: "07", duration: 5.6, kicker: "LIVRAISON AU MAROC 🇲🇦", title: "PARA BEAUREGARD", subtitle: "Votre parapharmacie en ligne", cta: "Découvrez la boutique →" },
];

const esc = (text) => text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const wrap = (text, max = 34) => {
  const lines = []; let line = "";
  for (const word of text.split(" ")) {
    if ((`${line} ${word}`).trim().length > max && line) { lines.push(line); line = word; }
    else line = (`${line} ${word}`).trim();
  }
  if (line) lines.push(line);
  return lines;
};

for (const scene of scenes) {
  const screenshot = await sharp(path.join(sourceDir, `${scene.id}.png`))
    .resize(600, 1298, { fit: "cover", position: "top" })
    .png().toBuffer();
  const lines = wrap(scene.title, scene.id === "01" ? 36 : 34);
  const isFinal = scene.id === "07";
  const background = Buffer.from(`<svg width="1080" height="1920" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fbf7f1"/><stop offset="1" stop-color="#dfeee8"/></linearGradient>
      <filter id="shadow" x="-40%" y="-30%" width="180%" height="180%"><feGaussianBlur stdDeviation="30"/><feColorMatrix values="0 0 0 0 0.02 0 0 0 0 0.16 0 0 0 0 0.13 0 0 0 .28 0"/></filter>
    </defs>
    <rect width="1080" height="1920" fill="url(#bg)"/>
    <circle cx="920" cy="260" r="300" fill="#ffffff" opacity=".26"/>
    <circle cx="80" cy="1660" r="360" fill="#b9ded3" opacity=".22"/>
    <text x="80" y="105" fill="#0b4038" font-family="Arial" font-size="22" font-weight="700" letter-spacing="5">PARA BEAUREGARD</text>
    <text x="1000" y="105" text-anchor="end" fill="#58736c" font-family="Arial" font-size="20">${scene.id}/07</text>
    <text x="80" y="174" fill="#35665b" font-family="Arial" font-size="18" font-weight="700" letter-spacing="3">${esc(scene.kicker)}</text>
    ${isFinal
      ? `<text x="80" y="245" fill="#0b302b" font-family="Georgia" font-size="51" font-weight="700">${esc(scene.title)}</text><text x="80" y="296" fill="#42635c" font-family="Arial" font-size="27">${esc(scene.subtitle)}</text><rect x="650" y="218" width="350" height="74" rx="37" fill="#0b4038"/><text x="825" y="265" text-anchor="middle" fill="#ffffff" font-family="Arial" font-size="23" font-weight="700">${esc(scene.cta)}</text>`
      : lines.map((line, i) => `<text x="80" y="${235 + i * 48}" fill="#0b302b" font-family="Arial" font-size="42" font-weight="700">${esc(line)}</text>`).join("")}
    <rect x="176" y="340" width="728" height="1390" rx="84" fill="#0b1717" opacity=".30" filter="url(#shadow)"/>
    <rect x="200" y="320" width="680" height="1415" rx="78" fill="#101818"/>
    <rect x="240" y="378" width="600" height="1298" rx="48" fill="#fffaf5"/>
    <rect x="456" y="342" width="168" height="38" rx="19" fill="#101818"/>
    <circle cx="784" cy="360" r="8" fill="#a7dbce"/>
  </svg>`);
  await sharp(background).composite([{ input: screenshot, left: 240, top: 378 }]).png().toFile(path.join(outDir, `${scene.id}.png`));
}

const transition = 0.35;
const cmd = ["-y", "-hide_banner", "-loglevel", "error"];
for (const scene of scenes) cmd.push("-loop", "1", "-t", String(scene.duration), "-i", path.join(outDir, `${scene.id}.png`));
const filters = [];
for (let i = 0; i < scenes.length; i++) {
  const frames = Math.ceil(scenes[i].duration * 30);
  const increment = i % 2 === 0 ? "0.00010" : "0.00008";
  filters.push(`[${i}:v]scale=1188:2112,zoompan=z='min(zoom+${increment},1.018)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=1080x1920:fps=30,trim=duration=${scenes[i].duration},setpts=PTS-STARTPTS[v${i}]`);
}
let previous = "v0";
let elapsed = scenes[0].duration;
const transitions = ["fade", "smoothleft", "fade", "smoothup", "fade", "smoothleft"];
for (let i = 1; i < scenes.length; i++) {
  const offset = elapsed - transition * i;
  const output = i === scenes.length - 1 ? "vout" : `x${i}`;
  filters.push(`[${previous}][v${i}]xfade=transition=${transitions[i - 1]}:duration=${transition}:offset=${offset.toFixed(2)}[${output}]`);
  previous = output;
  elapsed += scenes[i].duration;
}
const visualPath = path.join(outDir, "reel-visual.mp4");
cmd.push("-filter_complex", filters.join(";"), "-map", "[vout]", "-r", "30", "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart", visualPath);
let result = spawnSync(ffmpegPath, cmd, { stdio: "inherit" });
if (result.status !== 0) throw new Error(`Montage vidéo échoué (${result.status})`);

// Musique originale : nappe douce et pulsation légère, pensée pour rester sous la voix.
const seconds = 26, rate = 44100, samples = rate * seconds, channels = 2;
const pcm = Buffer.alloc(samples * channels * 2);
const chords = [[220, 277.18, 329.63], [174.61, 220, 261.63], [196, 246.94, 293.66], [164.81, 207.65, 246.94]];
for (let i = 0; i < samples; i++) {
  const t = i / rate, chord = chords[Math.floor(t / 6.5) % chords.length];
  const fade = Math.max(0, Math.min(1, t / 1.4, (seconds - t) / 2.2));
  const pulse = 0.72 + 0.28 * Math.sin(2 * Math.PI * 0.5 * t) ** 2;
  let signal = 0;
  chord.forEach((f, n) => { signal += Math.sin(2 * Math.PI * f * t + n * 0.7) * (n === 0 ? 0.052 : 0.025); });
  signal += Math.sin(2 * Math.PI * 659.25 * t) * 0.007 * Math.max(0, Math.sin(2 * Math.PI * 0.25 * t));
  const sample = Math.max(-1, Math.min(1, signal * pulse * fade));
  const value = Math.round(sample * 32767);
  pcm.writeInt16LE(value, i * 4); pcm.writeInt16LE(value, i * 4 + 2);
}
const wav = Buffer.alloc(44 + pcm.length);
wav.write("RIFF", 0); wav.writeUInt32LE(36 + pcm.length, 4); wav.write("WAVE", 8); wav.write("fmt ", 12); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(2, 22); wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate * 4, 28); wav.writeUInt16LE(4, 32); wav.writeUInt16LE(16, 34); wav.write("data", 36); wav.writeUInt32LE(pcm.length, 40); pcm.copy(wav, 44);
const musicPath = path.join(outDir, "premium-music.wav");
await fs.writeFile(musicPath, wav);

const voicePath = path.join(outDir, "voiceover-fr.wav");
result = spawnSync("powershell", ["-NoProfile", "-STA", "-ExecutionPolicy", "Bypass", "-File", path.join(root, "scripts", "make-french-voiceover.ps1"), "-OutputPath", voicePath], { stdio: "inherit" });
if (result.status !== 0) throw new Error(`Voix off échouée (${result.status})`);

const finalPath = path.join(outDir, "para-beauregard-reel-premium-mobile.mp4");
result = spawnSync(ffmpegPath, ["-y", "-hide_banner", "-loglevel", "error", "-i", visualPath, "-i", voicePath, "-i", musicPath,
  "-filter_complex", "[1:a]volume=1.25[voice];[2:a]volume=0.32[music];[music][voice]sidechaincompress=threshold=0.02:ratio=8:attack=20:release=300[ducked];[voice][ducked]amix=inputs=2:duration=longest:normalize=0,loudnorm=I=-15:LRA=7:TP=-1.5[aout]",
  "-map", "0:v", "-map", "[aout]", "-t", "26", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", finalPath], { stdio: "inherit" });
if (result.status !== 0) throw new Error(`Mixage final échoué (${result.status})`);
console.log(finalPath);
