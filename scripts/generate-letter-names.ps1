param([string]$MonsterRescue=$env:MONSTER_RESCUE_PATH, [string]$Dotnet=$env:DOTNET_PATH)
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'tool-paths.ps1')
$MonsterRescue=Resolve-LegacySpeechRoot $MonsterRescue
$Dotnet=Resolve-DotnetPath $Dotnet
$root=Split-Path -Parent $PSScriptRoot
Push-Location $root
try {
 & node scripts/prepare-letter-names.mjs
 if($LASTEXITCODE -ne 0){throw 'Letter-name plan failed'}
 & $Dotnet (Join-Path $MonsterRescue 'GeneratedSpeech/Tools/SpeechGenerator.dll') '.speech-letter-cache/plan.json' 4
 if($LASTEXITCODE -ne 0){throw 'Letter-name synthesis failed'}
 $plan=Get-Content '.speech-letter-cache/plan.json' -Raw | ConvertFrom-Json
 $library=Join-Path $plan.cacheRoot ('Libraries/'+$plan.corpus)
 $manifest=Get-Content (Join-Path $library 'manifest.json') -Raw | ConvertFrom-Json
 $index=Get-Content audio/index.json -Raw | ConvertFrom-Json -AsHashtable
 foreach($entry in $manifest.entries){$name=Split-Path $entry.file -Leaf;Copy-Item (Join-Path $library $entry.file) (Join-Path $root ('audio/'+$name)) -Force;$index.clips['letter:'+$entry.text.Replace('bertletter','')]='audio/'+$name}
 $index | ConvertTo-Json -Depth 4 | Set-Content audio/index.json -Encoding utf8
 Write-Host 'Published 26 explicit alphabet letter-name recordings.'
}finally{Pop-Location}
