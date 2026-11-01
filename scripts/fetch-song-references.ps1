$ErrorActionPreference='Stop'
$sources=@{
 'jack-jill'='https://www.mfiles.co.uk/scores/jack-and-jill.htm'
 'twinkle'='https://www.mfiles.co.uk/scores/twinkle-twinkle-little-star.htm'
 'macdonald'='https://www.mfiles.co.uk/scores/old-macdonald-had-a-farm.htm'
 'farmer'='https://www.mfiles.co.uk/scores/the-farmers-in-his-den.htm'
 'bus'='https://www.mfiles.co.uk/scores/the-wheels-on-the-bus.htm'
 'frere'='https://www.mfiles.co.uk/scores/frere-jacques.htm'
 'london'='https://www.mfiles.co.uk/scores/london-bridge-is-falling-down.htm'
 'sixpence'='https://www.mfiles.co.uk/scores/sing-a-song-of-sixpence.htm'
 'muffet'='https://www.mfiles.co.uk/scores/little-miss-muffet.htm'
 'row'='https://www.mfiles.co.uk/scores/row-row-row-your-boat.htm'
}
$manifest=@()
foreach($id in $sources.Keys){
 $url=$sources[$id];$html=(Invoke-WebRequest -Uri $url).Content
 $links=[regex]::Matches($html,'href=["'']([^"'']+\.(?:mid|pdf))["'']') | ForEach-Object {$_.Groups[1].Value} | Select-Object -Unique
 foreach($link in $links){$asset=[uri]::new([uri]$url,$link).AbsoluteUri;$ext=[IO.Path]::GetExtension($link);$file=Join-Path '.music-review' ($id+$ext);Invoke-WebRequest -Uri $asset -OutFile $file;$manifest+=@{id=$id;url=$url;asset=$asset;file=$file}}
}
$manifest|ConvertTo-Json|Set-Content .music-review/manifest.json
Write-Host ('Downloaded '+$manifest.Count+' score/MIDI references')
