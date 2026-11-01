param([string]$MonsterRescue=$env:MONSTER_RESCUE_PATH, [string]$Dotnet=$env:DOTNET_PATH, [int]$Workers=4)
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'tool-paths.ps1')
$MonsterRescue=Resolve-LegacySpeechRoot $MonsterRescue
$Dotnet=Resolve-DotnetPath $Dotnet
$root=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
& node (Join-Path $PSScriptRoot 'prepare-speech.mjs') $MonsterRescue
if($LASTEXITCODE -ne 0){throw 'Speech plan failed'}
$generator=Join-Path $MonsterRescue 'GeneratedSpeech/Tools/SpeechGenerator.dll'
$planPath=Join-Path $root '.speech-cache/plan.json'
& $dotnet $generator $planPath $Workers
if($LASTEXITCODE -ne 0){throw 'Speech synthesis failed'}
$plan=Get-Content -LiteralPath $planPath -Raw | ConvertFrom-Json
$library=Join-Path $plan.cacheRoot ('Libraries/'+$plan.corpus)
$manifest=Get-Content (Join-Path $library 'manifest.json') -Raw | ConvertFrom-Json
$audio=Join-Path $root 'audio'
New-Item $audio -ItemType Directory -Force | Out-Null
$index=@{}
$indexPath=Join-Path $audio 'index.json'
if(Test-Path -LiteralPath $indexPath){
  $previous=Get-Content -LiteralPath $indexPath -Raw | ConvertFrom-Json -AsHashtable
  foreach($key in $previous.clips.Keys){
    $clip=$previous.clips[$key]
    if($clip -is [string] -and (Test-Path -LiteralPath (Join-Path $root $clip))){$index[$key]=$clip}
  }
}
$displayByKey=@{}
foreach($job in $plan.jobs){$displayByKey[$job.key]=$job.displayText}
foreach($entry in $manifest.entries){
  $name=Split-Path $entry.file -Leaf
  Copy-Item -LiteralPath (Join-Path $library $entry.file) -Destination (Join-Path $audio $name) -Force
  $displayText=$displayByKey[$entry.key]
  if(-not $displayText){$displayText=$entry.text}
  $index[$displayText.ToLowerInvariant()]='audio/'+$name
}
$published=@{version=1; letterNamePronunciation=2; voice='Kokoro local, voice 0'; clips=$index}
foreach($property in @('phonicsTimingVersion','phonicsTiming','phonicsSource')){if($previous -and $previous.ContainsKey($property)){$published[$property]=$previous[$property]}}
$published | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $audio 'index.json') -Encoding utf8
$licenses=Join-Path $audio 'licenses'
New-Item $licenses -ItemType Directory -Force | Out-Null
$licenseModelRoot=$plan.modelRoot
if(-not(Test-Path (Join-Path $licenseModelRoot 'LICENSE'))){$licenseModelRoot=(Get-Content (Join-Path $MonsterRescue 'GeneratedSpeech/plan.json') -Raw | ConvertFrom-Json).modelRoot}
Copy-Item -LiteralPath (Join-Path $licenseModelRoot 'LICENSE') -Destination (Join-Path $licenses 'Kokoro-LICENSE.txt') -Force
Get-ChildItem (Join-Path $licenseModelRoot 'licenses') -File | Where-Object Extension -ne '.meta' | Copy-Item -Destination $licenses -Force
Get-ChildItem (Join-Path $MonsterRescue 'Tools/PreparedSpeech/Licenses') -File | Copy-Item -Destination $licenses -Force
"Speech generated locally with MonsterRescue's Kokoro/Sherpa-ONNX preparation tools. No server, key or speech model is required for playback. New content uses the device voice until regenerated. Phoneme hints are approximate synthesized speech; replace with reviewed recordings for phonics instruction." | Set-Content (Join-Path $audio 'NOTICE.txt')
Write-Host ('Published '+$manifest.entries.Count+' prepared offline clips.')
