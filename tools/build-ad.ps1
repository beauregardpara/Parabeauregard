$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$assets = Join-Path $root 'ad-assets'
$outDir = Join-Path $root 'livrables'
New-Item -ItemType Directory -Force $outDir | Out-Null
$font = 'C\:/Windows/Fonts/segoeui.ttf'
$fontBold = 'C\:/Windows/Fonts/segoeuib.ttf'

function Invoke-Scene {
  param(
    [string]$InputFile,
    [string]$OutputFile,
    [string]$Background,
    [string]$MainText,
    [string]$SubText,
    [switch]$UseLogo
  )

  $logo = Join-Path $assets 'logo.png'
    $filter = @"
[0:v]scale=1080:1920:force_original_aspect_ratio=decrease,format=rgba,zoompan=z='min(zoom+0.0008,1.08)':d=105:s=1080x1920:fps=30[visual];
color=c=${Background}:s=1080x1920:r=30:d=3.5[bg];
[bg][visual]overlay=(W-w)/2:(H-h)/2:format=auto[base];
[base]drawbox=x=30:y=1280:w=1020:h=260:color=123f36@0.72:t=fill[panel];
[panel]drawtext=fontfile='${fontBold}':text='${MainText}':fontcolor=white:fontsize=58:line_spacing=8:x=(w-text_w)/2:y=1360:alpha='if(lt(t,0.5),t*2,1)'[t1];
[t1]drawtext=fontfile='${font}':text='${SubText}':fontcolor=white:fontsize=30:x=(w-text_w)/2:y=1470:alpha='if(lt(t,0.6),t*1.67,1)'[v]
"@
  if ($UseLogo) {
    $filter = @"
color=c=${Background}:s=1080x1920:r=30:d=3.5[bg];
[0:v]scale=700:-1[logo];
[bg][logo]overlay=(W-w)/2:280:format=auto[base];
[base]null[withlogo];
[withlogo]drawtext=fontfile='${fontBold}':text='${MainText}':fontcolor=white:fontsize=58:line_spacing=8:x=(w-text_w)/2:y=1180:alpha='if(lt(t,0.5),t*2,1)'[t1];
[t1]drawtext=fontfile='${font}':text='${SubText}':fontcolor=white:fontsize=30:x=(w-text_w)/2:y=1290:alpha='if(lt(t,0.6),t*1.67,1)'[v]
"@
    & ffmpeg -y -hide_banner -loglevel error -loop 1 -i $logo -filter_complex $filter -map '[v]' -t 3.5 -r 30 -c:v libx264 -pix_fmt yuv420p -an $OutputFile
  } else {
    & ffmpeg -y -hide_banner -loglevel error -loop 1 -i $InputFile -filter_complex $filter -map '[v]' -t 3.5 -r 30 -c:v libx264 -pix_fmt yuv420p -an $OutputFile
  }
}

$scenes = @(
  @{file=(Join-Path $assets 'logo.png'); out=(Join-Path $outDir 'scene1.mp4'); bg='123f36'; main='La beaute qui vous ressemble'; sub='Une selection premium au Maroc'; logo=$true},
  @{file=(Join-Path $assets 'product1.jpg'); out=(Join-Path $outDir 'scene2.mp4'); bg='f4f1e7'; main='Skincare. Cheveux. Bebe.'; sub='Des essentiels choisis avec soin'; logo=$false},
  @{file=(Join-Path $assets 'product2.jpg'); out=(Join-Path $outDir 'scene3.mp4'); bg='9caf91'; main='Des marques que vous aimez'; sub='Produits authentiques et livraison partout au Maroc'; logo=$false},
  @{file=(Join-Path $assets 'logo.png'); out=(Join-Path $outDir 'scene4.mp4'); bg='123f36'; main='Decouvrez notre selection'; sub='parabeauregard.com'; logo=$true}
)

foreach ($s in $scenes) {
  Invoke-Scene -InputFile $s.file -OutputFile $s.out -Background $s.bg -MainText $s.main -SubText $s.sub -UseLogo:$s.logo
}

$list = Join-Path $outDir 'concat.txt'
Set-Content -Path $list -Encoding ascii -Value ($scenes | ForEach-Object { "file '$($_.out.Replace("'", "'\''"))'" })
$silent = Join-Path $outDir 'ad-silent.mp4'
& ffmpeg -y -hide_banner -loglevel error -f concat -safe 0 -i $list -c copy $silent

# Soft, unobtrusive sound bed generated locally so the deliverable is self-contained.
$music = Join-Path $outDir 'music.wav'
& ffmpeg -y -hide_banner -loglevel error -f lavfi -i "aevalsrc=0.035*sin(2*PI*220*t)+0.018*sin(2*PI*329.63*t):s=44100:d=14" -c:a pcm_s16le $music
$final = Join-Path $outDir 'para-beauregard-meta-ad-vertical.mp4'
& ffmpeg -y -hide_banner -loglevel error -i $silent -i $music -filter_complex "[1:a]afade=t=in:st=0:d=1,afade=t=out:st=13:d=1,volume=0.65[a]" -map 0:v -map '[a]' -t 14 -c:v copy -c:a aac -b:a 128k -shortest $final

Remove-Item -Force ($scenes | ForEach-Object { $_.out }) -ErrorAction SilentlyContinue
Remove-Item -Force $list, $silent, $music -ErrorAction SilentlyContinue
Write-Output $final
