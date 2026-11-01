function Resolve-DotnetPath([string]$Configured) {
    if ($Configured) {
        if (-not (Test-Path -LiteralPath $Configured -PathType Leaf)) { throw 'Dotnet executable not found. Set DOTNET_PATH or pass -Dotnet.' }
        return (Resolve-Path -LiteralPath $Configured).Path
    }
    $command = Get-Command dotnet -ErrorAction SilentlyContinue
    if (-not $command) { throw 'Install .NET on PATH, set DOTNET_PATH, or pass -Dotnet.' }
    return $command.Source
}
function Resolve-LegacySpeechRoot([string]$Configured) {
    if (-not $Configured -or -not (Test-Path -LiteralPath (Join-Path $Configured 'GeneratedSpeech/Tools/SpeechGenerator.dll'))) {
        throw 'Legacy speech tools require an explicit MonsterRescue installation. Set MONSTER_RESCUE_PATH or pass -MonsterRescue. Current Roger generation does not use this dependency.'
    }
    return (Resolve-Path -LiteralPath $Configured).Path
}
