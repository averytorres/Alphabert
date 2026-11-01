param(
    [string]$AndroidPlayer = $env:ANDROID_PLAYER_HOME,
    [string]$Sdk = $env:ANDROID_HOME,
    [string]$Jdk = $env:JAVA_HOME
)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
if (-not $Sdk) { $Sdk = $env:ANDROID_SDK_ROOT }
if (-not $Sdk -and $AndroidPlayer) { $Sdk = Join-Path $AndroidPlayer 'SDK' }
if (-not $Jdk -and $AndroidPlayer) { $Jdk = Join-Path $AndroidPlayer 'OpenJDK' }
if (-not $Sdk) { throw 'Set ANDROID_HOME/ANDROID_SDK_ROOT, pass -Sdk, or configure ANDROID_PLAYER_HOME.' }
if (-not $Jdk) {
    $compiler = Get-Command javac -ErrorAction SilentlyContinue
    if ($compiler) {
        $compilerFile = Get-Item -LiteralPath $compiler.Source
        if ($compilerFile.LinkType) { $compilerFile = $compilerFile.ResolveLinkTarget($true) }
        $Jdk = Split-Path -Parent (Split-Path -Parent $compilerFile.FullName)
    }
}
if (-not $Jdk) { throw 'Set JAVA_HOME, pass -Jdk, or configure ANDROID_PLAYER_HOME.' }
if (-not (Test-Path -LiteralPath $Sdk -PathType Container)) { throw 'Android SDK folder not found; check -Sdk or ANDROID_HOME.' }
if (-not (Test-Path -LiteralPath $Jdk -PathType Container)) { throw 'JDK folder not found; check -Jdk or JAVA_HOME.' }
$toolSuffix = if ($IsWindows) { '.exe' } else { '' }
$buildTools = Get-ChildItem -LiteralPath (Join-Path $Sdk 'build-tools') -Directory | Sort-Object { [version]$_.Name } -Descending | Select-Object -First 1
$platform = Get-ChildItem -LiteralPath (Join-Path $Sdk 'platforms') -Directory | Sort-Object { [int]($_.Name -replace 'android-','') } -Descending | Select-Object -First 1
if (-not $buildTools -or -not $platform) { throw 'Android SDK build-tools and a platform are required.' }
$androidJar = Join-Path $platform.FullName 'android.jar'
$java = Join-Path $Jdk ('bin/java' + $toolSuffix)
$javac = Join-Path $Jdk ('bin/javac' + $toolSuffix)
$jar = Join-Path $Jdk ('bin/jar' + $toolSuffix)
$keytool = Join-Path $Jdk ('bin/keytool' + $toolSuffix)
$aapt = Join-Path $buildTools.FullName ('aapt2' + $toolSuffix)
$zipalign = Join-Path $buildTools.FullName ('zipalign' + $toolSuffix)
$d8 = Join-Path $buildTools.FullName 'lib/d8.jar'
$signer = Join-Path $buildTools.FullName 'lib/apksigner.jar'
foreach ($tool in @($java,$javac,$jar,$keytool,$aapt,$zipalign,$d8,$signer,$androidJar)) {
    if (-not (Test-Path -LiteralPath $tool)) { throw "Missing Android build dependency: $tool" }
}
function Invoke-Checked([string]$Exe, [string[]]$Arguments) {
    & $Exe @Arguments
    if ($LASTEXITCODE -ne 0) { throw "$Exe failed (exit $LASTEXITCODE)." }
}
$build = Join-Path $projectRoot ('android/build/' + [guid]::NewGuid().ToString('N'))
$assets = Join-Path $build 'assets'
$classes = Join-Path $build 'classes'
$dex = Join-Path $build 'dex'
$generated = Join-Path $build 'generated'
New-Item -ItemType Directory -Force $assets,$classes,$dex,$generated | Out-Null
foreach ($required in @('index.html','app.js','styles.css','content/words.json','content/lessons.json')) {
    if (-not (Test-Path -LiteralPath (Join-Path $projectRoot $required))) { throw "Game asset missing: $required" }
}
# Package only runtime web files, never project tooling, source APKs, or the old VTech ISO.
Get-ChildItem -LiteralPath $projectRoot -File | Where-Object { $_.Extension -in '.html','.css','.js','.webmanifest' } | Copy-Item -Destination $assets
foreach ($folder in @('content','assets','images','fonts')) {
    $source = Join-Path $projectRoot $folder
    if (Test-Path -LiteralPath $source) { Copy-Item -LiteralPath $source -Destination $assets -Recurse }
}
# Ship indexed recordings rather than obsolete cached takes from earlier builds.
$audioSource = Join-Path $projectRoot 'audio'
$audioTarget = Join-Path $assets 'audio'
New-Item -ItemType Directory -Force $audioTarget | Out-Null
Get-ChildItem -LiteralPath $audioSource -File | Where-Object Extension -NotIn '.ogg','.mp3','.wav' | Copy-Item -Destination $audioTarget
if(Test-Path (Join-Path $audioSource 'licenses')){Copy-Item (Join-Path $audioSource 'licenses') $audioTarget -Recurse}
$audioIndex=Get-Content (Join-Path $audioSource 'index.json') -Raw | ConvertFrom-Json -AsHashtable
$recordings=@($audioIndex.clips.Values | ForEach-Object {if($_ -is [string]){$_}else{$_.file}})
$wordContent=Get-Content (Join-Path $projectRoot 'content/words.json') -Raw | ConvertFrom-Json
$recordings+=@($wordContent.words | Where-Object audio | ForEach-Object audio)
foreach($recording in ($recordings | Select-Object -Unique)){
    if(-not $recording.StartsWith('audio/') -or $recording.Contains('..') -or $recording.Contains('\')){throw "Invalid recording path: $recording"}
    $destination=Join-Path $assets $recording
    New-Item -ItemType Directory -Force (Split-Path -Parent $destination) | Out-Null
    Copy-Item -LiteralPath (Join-Path $projectRoot $recording) -Destination $destination
}
$resources = Join-Path $build 'resources.zip'
$unsigned = Join-Path $build 'unsigned.apk'
$aligned = Join-Path $build 'aligned.apk'
Invoke-Checked $aapt @('compile','--dir',(Join-Path $projectRoot 'android/res'),'-o',$resources)
Invoke-Checked $aapt @('link','-o',$unsigned,'-I',$androidJar,'--manifest',(Join-Path $projectRoot 'android/AndroidManifest.xml'),'--java',$generated,'--min-sdk-version','26','--target-sdk-version','35',$resources)
$sources = @(Get-ChildItem -LiteralPath (Join-Path $projectRoot 'android/src'),$generated -Recurse -Filter '*.java' | ForEach-Object FullName)
Invoke-Checked $javac (@('--release','8','-encoding','UTF-8','-classpath',$androidJar,'-d',$classes) + $sources)
$classesJar = Join-Path $build 'classes.jar'
Invoke-Checked $jar @('cf',$classesJar,'-C',$classes,'.')
Invoke-Checked $java @('-cp',$d8,'com.android.tools.r8.D8','--lib',$androidJar,'--min-api','26','--output',$dex,$classesJar)
Invoke-Checked $jar @('uf',$unsigned,'-C',$dex,'classes.dex','-C',$build,'assets')
# aapt2 on Windows can emit backslashes inside nested asset ZIP names.
# Add assets through the JDK archive tool and guard Android's exact lookup paths.
$entries = @(& $jar tf $unsigned)
if ($LASTEXITCODE -ne 0 -or ($entries | Where-Object { $_.Contains('\') })) { throw 'APK contains invalid Windows path separators.' }
foreach ($requiredEntry in @('assets/content/words.json','assets/content/lessons.json','assets/audio/index.json')) {
    if ($entries -notcontains $requiredEntry) { throw "Missing packaged asset: $requiredEntry" }
}
Invoke-Checked $zipalign @('-f','4',$unsigned,$aligned)
$key = Join-Path $projectRoot 'android/debug.keystore'
if (-not (Test-Path -LiteralPath $key)) {
    Invoke-Checked $keytool @('-genkeypair','-keystore',$key,'-storepass','android','-keypass','android','-alias','androiddebugkey','-dname','CN=Android Debug,O=Android,C=US','-keyalg','RSA','-keysize','2048','-validity','10000')
}
$out = Join-Path $projectRoot 'android/AlphabertWordLab.apk'
Invoke-Checked $java @('-jar',$signer,'sign','--ks',$key,'--ks-key-alias','androiddebugkey','--ks-pass','pass:android','--key-pass','pass:android','--out',$out,$aligned)
Invoke-Checked $java @('-jar',$signer,'verify','--verbose',$out)
Write-Host "Built $out"
Get-FileHash -LiteralPath $out -Algorithm SHA256


