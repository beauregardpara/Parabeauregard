import sharp from 'sharp';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
const root=process.cwd();
const dir=path.join(root,'livrables','nouveau-design');
function run(args){const r=spawnSync('ffmpeg',['-y','-hide_banner','-loglevel','error',...args],{stdio:'inherit'});if(r.status!==0)throw new Error('Échec du rendu vidéo');}
const scenes=[
 ['accueil','Votre parapharmacie','maintenant en ligne','Beauté • Soins • Bien-être'],
 ['selection','Découvrez Para Beauregard','Une sélection pour votre quotidien','Visage • Corps • Cheveux'],
 ['produits','Vos essentiels, en ligne','Découvrez nos marques et nos soins','Parcourez notre sélection'],
 ['catalogue','Vos soins préférés','À portée de main','Livraison partout au Maroc'],
 ['accueil','Prenez soin de vous','avec Para Beauregard','Découvrez la boutique en ligne']
];
for(let i=0;i<scenes.length;i++){
 const [name,title,subtitle,label]=scenes[i];
 const bg=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920"><defs><radialGradient id="g"><stop stop-color="#dde4cf"/><stop offset="1" stop-color="#f6f2e8"/></radialGradient></defs><rect width="1080" height="1920" fill="url(#g)"/><ellipse cx="540" cy="1695" rx="355" ry="36" fill="#123f36" opacity=".12"/><rect x="192" y="312" width="696" height="1356" rx="62" fill="#172820"/><rect x="185" y="610" width="7" height="130" rx="3" fill="#324139"/><rect x="888" y="550" width="7" height="85" rx="3" fill="#324139"/><text x="540" y="170" text-anchor="middle" font-family="Georgia" font-size="52" fill="#123f36">${title}</text><text x="540" y="238" text-anchor="middle" font-family="Segoe UI" font-size="38" fill="#123f36">${subtitle}</text><text x="540" y="1750" text-anchor="middle" font-family="Segoe UI" font-size="32" fill="#4a6053">${label}</text><rect x="160" y="1790" width="760" height="76" rx="38" fill="#123f36"/><text x="540" y="1841" text-anchor="middle" font-family="Segoe UI" font-size="38" fill="#fff">parabeauregard.com →</text></svg>`);
 const mask=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="660" height="1320"><rect width="660" height="1320" rx="46" fill="white"/></svg>');
 const screen=await sharp(path.join(dir,`${name}.png`)).resize(660,1320).ensureAlpha().composite([{input:mask,blend:'dest-in'}]).png().toBuffer();
 const png=path.join(dir,`scene-${i}.png`);
 await sharp(bg).composite([{input:screen,left:210,top:330}]).png().toFile(png);
 run(['-i',png,'-vf',"zoompan=z='1+0.018*on/180':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=180:s=1080x1920:fps=30",'-frames:v','180','-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p',path.join(dir,`scene-${i}.mp4`)]);
 console.log(`Scène ${i+1}/5 créée`);
}
const inputs=scenes.flatMap((_,i)=>['-i',path.join(dir,`scene-${i}.mp4`)]);
const filters=['[0:v][1:v]xfade=transition=fade:duration=0.35:offset=5.65[v1]','[v1][2:v]xfade=transition=fade:duration=0.35:offset=11.30[v2]','[v2][3:v]xfade=transition=fade:duration=0.35:offset=16.95[v3]','[v3][4:v]xfade=transition=fade:duration=0.35:offset=22.60[v]','[5:a]loudnorm=I=-16:TP=-1.5:LRA=11,apad[a]'].join(';');
run([...inputs,'-i',path.join(root,'livrables','para-beauregard-voiceover.mp3'),'-filter_complex_threads','1','-filter_complex',filters,'-map','[v]','-map','[a]','-t','28.6','-r','30','-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-movflags','+faststart',path.join(root,'livrables','para-beauregard-nouveau-site-ads.mp4')]);
console.log('Vidéo finale créée');
