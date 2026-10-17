$dst = 'c:\Users\wilia\OneDrive\Documentos\VOLTQ\DRA ANA MORONG\Controle de Estoque\Controle de Estoque\tmp\docx_inspect'
$xml = [IO.File]::ReadAllText((Join-Path $dst 'word\document.xml'), [Text.Encoding]::UTF8)
function Count($p, $s) { ([regex]::Matches($s, $p)).Count }
'tables: ' + (Count '<w:tbl>' $xml) + ' tabs: ' + (Count '<w:tab/>' $xml) + ' numPr: ' + (Count '<w:numPr>' $xml) + ' br: ' + (Count '<w:br' $xml) + ' fldChar: ' + (Count 'fldChar' $xml)
'drawings in body: ' + (Count '<w:drawing' $xml) + ' hyperlinks: ' + (Count '<w:hyperlink' $xml) + ' highlight: ' + (Count '<w:highlight' $xml)
'--- distinct jc'
[regex]::Matches($xml, '<w:jc w:val="([^"]+)"') | ForEach-Object { $_.Groups[1].Value } | Group-Object | ForEach-Object { $_.Name + '=' + $_.Count }
'--- distinct sz'
[regex]::Matches($xml, '<w:sz w:val="([^"]+)"') | ForEach-Object { $_.Groups[1].Value } | Group-Object | ForEach-Object { $_.Name + '=' + $_.Count }
'--- distinct fonts'
[regex]::Matches($xml, 'w:ascii="([^"]+)"') | ForEach-Object { $_.Groups[1].Value } | Group-Object | ForEach-Object { $_.Name + '=' + $_.Count }
'--- distinct colors'
[regex]::Matches($xml, '<w:color w:val="([^"]+)"') | ForEach-Object { $_.Groups[1].Value } | Group-Object | ForEach-Object { $_.Name + '=' + $_.Count }
'--- distinct spacing'
[regex]::Matches($xml, '<w:spacing [^>]*/>') | ForEach-Object { $_.Value } | Group-Object | Sort-Object Count -Descending | Select-Object -First 8 | ForEach-Object { $_.Count.ToString() + 'x ' + $_.Name }
'--- distinct ind'
[regex]::Matches($xml, '<w:ind [^>]*/>') | ForEach-Object { $_.Value } | Group-Object | Sort-Object Count -Descending | Select-Object -First 8 | ForEach-Object { $_.Count.ToString() + 'x ' + $_.Name }
'--- pBdr / shd / ptab / caps / smallCaps / underline'
'pBdr non-nil: ' + (Count '<w:(top|left|bottom|right) [^>]*w:val="(single|double|dashed|dotted)"' $xml) + ' shd fill non-auto: ' + (Count '<w:shd w:fill="(?!auto)' $xml) + ' u single: ' + (Count '<w:u w:val="single"' $xml) + ' caps: ' + (Count '<w:caps w:val="1"' $xml)
'--- header drawings'
foreach ($h in 'header2','header3') {
  $t = [IO.File]::ReadAllText((Join-Path $dst "word\$h.xml"), [Text.Encoding]::UTF8)
  $i = $t.IndexOf('<w:drawing')
  '### ' + $h
  $t.Substring($i, [Math]::Min(1700, $t.Length - $i))
}
'--- footer1 (default) paragraph props'
$f = [IO.File]::ReadAllText((Join-Path $dst 'word\footer1.xml'), [Text.Encoding]::UTF8)
$f.Substring($f.IndexOf('<w:p '))
'--- styles'
[IO.File]::ReadAllText((Join-Path $dst 'word\styles.xml'), [Text.Encoding]::UTF8).Substring(1400)
'--- soffice / word installed?'
Get-Command soffice -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source
Test-Path 'C:\Program Files\LibreOffice\program\soffice.exe'
Test-Path 'C:\Program Files\Microsoft Office\root\Office16\WINWORD.EXE'
Test-Path 'C:\Program Files (x86)\Microsoft Office\root\Office16\WINWORD.EXE'
