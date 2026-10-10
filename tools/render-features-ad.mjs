import sharp from 'sharp';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
const root=process.cwd(),dir=path.join(root,'livrables/ads-ia');
function run(args){const r=spawnSync('ffmpeg',['-y','-hide_banner','-loglevel','error',...args],{stdio:'inherit'});if(r.status!==0)throw new Error('Le rendu a échoué');}
const xml=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;');
const scenes=[
 {image:'accueil',tag:'PARA BEAUREGARD',lines:['Vos soins.','Un choix plus simple.'],sub:'Découvrez une nouvelle façon de choisir',time:5.2,dark:false},
 {image:'assistant',tag:'01 • ASSISTANT INTELLIGENT',lines:['Votre besoin.','Votre budget.'],sub:'Décrivez ce que vous recherchez',time:7,dark:true},
 {image:'conseils',tag:'DES RÉPONSES UTILES',lines:['Des produits adaptés','à votre recherche.'],sub:'Des suggestions issues du catalogue',time:7,dark:true},
 {image:'comparateur',tag:'02 • COMPARATEUR PRODUITS',lines:['Comparez avant','de choisir.'],sub:'Prix • Caractéristiques • Disponibilité',time:7.8,tablet:true,dark:false},
 {image:'favoris',tag:'03 • VOS FAVORIS',lines:['Gardez vos','coups de cœur.'],sub:'Enregistrez les soins qui vous plaisent',time:5.5,dark:false},
 {image:'accueil',tag:'UNE BOUTIQUE PENSÉE POUR VOUS',lines:['Vos marques.','Vos préférences.'],sub:'Beauté • Soins • Bien-être',time:4.8,dark:false},
 {image:'accueil',tag:'PARA BEAUREGARD',lines:['Découvrez','votre nouvelle boutique.'],sub:'Choisissez vos soins en toute simplicité',time:6,dark:true}
];
for(let i=0;i<scenes.length;i++){
 const s=scenes[i],bg=s.dark?'#123f36':'#f6f2e8',ink=s.dark?'#fffaf0':'#123f36',muted=s.dark?'#d8e2cb':'#596b58';
 const screenW=s.tablet?900:540,screenH=s.tablet?1040:1080,left=(1080-screenW)/2,top=s.tablet?500:445;
 const raw=sharp(path.join(dir,s.image+'.png'));
 const input=s.tablet?await raw.extract({left:0,top:400,width:1640,height:1780}).toBuffer():await raw.toBuffer();
 const mask=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${screenW}" height="${screenH}"><rect width="${screenW}" height="${screenH}" rx="32" fill="white"/></svg>`);
 const screen=await sharp(input).resize(screenW,screenH,{fit:'contain',background:'#f6f2e8'}).ensureAlpha().composite([{input:mask,blend:'dest-in'}]).png().toBuffer();
 const svg=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920"><rect width="1080" height="1920" fill="${bg}"/><circle cx="1080" cy="850" r="800" fill="${s.dark?'#739072':'#dce4cb'}" opacity=".09"/><circle cx="-40" cy="1840" r="740" fill="${s.dark?'#e6d6b7':'#dbcbaa'}" opacity=".08"/><rect x="110" y="137" width="860" height="44" rx="22" fill="${s.dark?'#d8e2cb':'#dce4cb'}" opacity=".15"/><text x="540" y="169" text-anchor="middle" font-family="Segoe UI" letter-spacing="3" font-size="24" font-weight="bold" fill="${muted}">${xml(s.tag)}</text><text x="540" y="258" text-anchor="middle" font-family="Georgia" font-size="64" fill="${ink}">${xml(s.lines[0])}</text><text x="540" y="331" text-anchor="middle" font-family="Georgia" font-size="64" fill="${ink}">${xml(s.lines[1])}</text><text x="540" y="391" text-anchor="middle" font-family="Segoe UI" font-size="31" fill="${muted}">${xml(s.sub)}</text><ellipse cx="540" cy="${top+screenH+36}" rx="${screenW*.55}" ry="22" fill="#04190d" opacity=".12"/><rect x="${left-16}" y="${top-16}" width="${screenW+32}" height="${screenH+32}" rx="49" fill="#172820"/><rect x="190" y="1590" width="700" height="84" rx="42" fill="${s.dark?'#f6f2e8':'#123f36'}"/><text x="540" y="1644" text-anchor="middle" font-family="Segoe UI" font-size="38" fill="${s.dark?'#123f36':'#f6f2e8'}">parabeauregard.com →</text><text x="540" y="1720" text-anchor="middle" font-family="Segoe UI" font-size="25" fill="${muted}">Votre parapharmacie en ligne au Maroc</text>${scenes.map((_,j)=>`<rect x="${420+j*35}" y="1760" width="24" height="5" rx="2" fill="${ink}" opacity="${i===j?1:.25}"/>`).join('')}</svg>`);
 const png=path.join(dir,`pub-${i}.png`);await sharp(svg).composite([{input:screen,left,top}]).png().toFile(png);
 const frames=Math.round(s.time*30);
 run(['-i',png,'-vf',`zoompan=z='1+0.022*on/${frames}':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=${frames}:s=1080x1920:fps=30`,'-frames:v',String(frames),'-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p',path.join(dir,`pub-${i}.mp4`)]);
 console.log(`Séquence ${i+1}/${scenes.length} prête`);
}
let elapsed=scenes[0].time;const filters=[];
for(let i=1;i<scenes.length;i++){const from=i===1?'0:v':`v${i-1}`;filters.push(`[${from}][${i}:v]xfade=transition=${i===3?'smoothleft':'fade'}:duration=0.3:offset=${(elapsed-.3).toFixed(2)}[v${i}]`);elapsed+=scenes[i].time-.3;}
filters.push('[7:a]loudnorm=I=-16:TP=-1.5:LRA=11,apad[a]');
run([...scenes.flatMap((_,i)=>['-i',path.join(dir,`pub-${i}.mp4`)]),'-i',path.join(dir,'voix-off.mp3'),'-filter_complex_threads','1','-filter_complex',filters.join(';'),'-map','[v6]','-map','[a]','-t','41.5','-r','30','-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-movflags','+faststart',path.join(root,'livrables','para-beauregard-ads-fonctionnalites-pro.mp4')]);
console.log('Montage final exporté');
