param(
  [Parameter(Mandatory = $true)]
  [string]$OutputPath
)

$voice = New-Object -ComObject SAPI.SpVoice
$frenchVoice = @($voice.GetVoices()) | Where-Object { $_.GetDescription() -match "Hortense|Julie" } | Select-Object -First 1
if ($null -ne $frenchVoice) { $voice.Voice = $frenchVoice }
$voice.Rate = 2
$voice.Volume = 100

$stream = New-Object -ComObject SAPI.SpFileStream
$format = New-Object -ComObject SAPI.SpAudioFormat
$format.Type = 22
$stream.Format = $format
$stream.Open($OutputPath, 3, $true)
$voice.AudioOutputStream = $stream

$text = "Vos produits de parapharmacie préférés, maintenant à portée de main. Découvrez Para Beauregard. Soins du visage, protections solaires, anti-taches, beauté et bien-être. Trouvez facilement votre produit, découvrez nos offres et commandez en quelques clics. Para Beauregard, votre parapharmacie en ligne."
[void]$voice.Speak($text, 0)
$stream.Close()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($format) | Out-Null
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($stream) | Out-Null
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($voice) | Out-Null
Write-Output $OutputPath
