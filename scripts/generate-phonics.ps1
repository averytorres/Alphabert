param([string]$MonsterRescue=$env:MONSTER_RESCUE_PATH, [string]$Dotnet=$env:DOTNET_PATH, [int]$Workers=4)
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'tool-paths.ps1')
$MonsterRescue=Resolve-LegacySpeechRoot $MonsterRescue
$Dotnet=Resolve-DotnetPath $Dotnet
$root=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
& node (Join-Path $PSScriptRoot 'prepare-phonics.mjs')
if($LASTEXITCODE -ne 0){throw 'Phonics plan failed'}
$planPath=Join-Path $root '.speech-phonics-cache/plan.json'
& $dotnet (Join-Path $MonsterRescue 'GeneratedSpeech/Tools/SpeechGenerator.dll') $planPath $Workers
if($LASTEXITCODE -ne 0){throw 'Phonics synthesis failed'}
$plan=Get-Content $planPath -Raw | ConvertFrom-Json
$library=Join-Path $plan.cacheRoot ('Libraries/'+$plan.corpus)
$manifest=Get-Content (Join-Path $library 'manifest.json') -Raw | ConvertFrom-Json
$audio=Join-Path $root 'audio'
$indexPath=Join-Path $audio 'index.json'
$index=Get-Content $indexPath -Raw | ConvertFrom-Json -AsHashtable
foreach($entry in $manifest.entries){
 $name=Split-Path $entry.file -Leaf
 Copy-Item -LiteralPath (Join-Path $library $entry.file) -Destination (Join-Path $audio $name) -Force
 $index.clips['phoneme:'+$entry.text.Replace('bertphonics','')]='audio/'+$name
}
$index.Remove('phonicsTimingVersion') | Out-Null
$index.Remove('phonicsTiming') | Out-Null
$index | ConvertTo-Json -Depth 4 | Set-Content $indexPath -Encoding utf8
Write-Host ('Published '+$manifest.entries.Count+' sound clips. Listening review is still needed.')
