$dst = 'c:\Users\wilia\OneDrive\Documentos\VOLTQ\DRA ANA MORONG\Controle de Estoque\Controle de Estoque\tmp\docx_inspect'
$xml = [IO.File]::ReadAllText((Join-Path $dst 'word\document.xml'), [Text.Encoding]::UTF8)
$plain = [regex]::Replace($xml, '</w:p>', "`n")
$plain = [regex]::Replace($plain, '<[^>]+>', '')
$lines = $plain -split "`n"
$out = New-Object System.Collections.Generic.List[string]
for ($i = 0; $i -lt $lines.Count; $i++) {
  if ($lines[$i] -match '\{\{') { $out.Add(('{0,3}: {1}' -f $i, $lines[$i].Trim())) }
}
$out | Out-File -Encoding utf8 (Join-Path $dst 'tag_lines.txt')
'total paragraphs: ' + $lines.Count
'paragraphs with tags: ' + $out.Count
Get-Content (Join-Path $dst 'tag_lines.txt') -Encoding UTF8
