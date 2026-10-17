$root = 'c:\Users\wilia\OneDrive\Documentos\VOLTQ\DRA ANA MORONG\Controle de Estoque\Controle de Estoque'
$src = Join-Path $root 'MODELO CONTRATO FINANCEIRO DRA ANA (3).docx'
$dst = Join-Path $root 'tmp\docx_inspect'
if (Test-Path $dst) { Remove-Item $dst -Recurse -Force }
Add-Type -AssemblyName System.IO.Compression.FileSystem
[IO.Compression.ZipFile]::ExtractToDirectory($src, $dst)

Get-ChildItem $dst -Recurse -File | ForEach-Object {
  '{0,10}  {1}' -f $_.Length, $_.FullName.Substring($dst.Length)
}

$xml = [IO.File]::ReadAllText((Join-Path $dst 'word\document.xml'))
'xml length: ' + $xml.Length
$intact = [regex]::Matches($xml, '\{\{[^}]*\}\}') | ForEach-Object { $_.Value } | Sort-Object -Unique
'tags intact in raw xml: ' + @($intact).Count
$intact -join ' '

$plain = [regex]::Replace($xml, '<[^>]+>', '')
$inText = [regex]::Matches($plain, '\{\{[^}]*\}\}') | ForEach-Object { $_.Value } | Sort-Object -Unique
'tags in plain text: ' + @($inText).Count
$inText -join ' '

$drawings = ([regex]::Matches($xml, '<w:drawing>')).Count
$picts = ([regex]::Matches($xml, '<w:pict>')).Count
'drawings: ' + $drawings + ' picts: ' + $picts
$sect = [regex]::Match($xml, '<w:sectPr[\s\S]*?</w:sectPr>').Value
$sect
