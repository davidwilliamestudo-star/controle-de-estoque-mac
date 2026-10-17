$dst = 'c:\Users\wilia\OneDrive\Documentos\VOLTQ\DRA ANA MORONG\Controle de Estoque\Controle de Estoque\tmp\docx_inspect'
$xml = [IO.File]::ReadAllText((Join-Path $dst 'word\document.xml'), [Text.Encoding]::UTF8)
$ps = [regex]::Matches($xml, '<w:p[ >][\s\S]*?</w:p>')
$out = New-Object System.Collections.Generic.List[string]
$n = 0
foreach ($p in $ps) {
  $t = [regex]::Replace($p.Value, '<[^>]+>', '')
  $c = if ($p.Value -match '<w:jc w:val="center"') { 'C' } else { ' ' }
  $out.Add(('{0,3} {1} [{2}]' -f $n, $c, $t))
  $n++
}
$out | Out-File -Encoding utf8 (Join-Path $dst 'all_paragraphs.txt')
'paragraph count: ' + $n
$h2 = [IO.File]::ReadAllText((Join-Path $dst 'word\header2.xml'), [Text.Encoding]::UTF8)
'header2 paragraphs: ' + ([regex]::Matches($h2, '<w:p[ >]')).Count
$h3 = [IO.File]::ReadAllText((Join-Path $dst 'word\header3.xml'), [Text.Encoding]::UTF8)
'header3 paragraphs: ' + ([regex]::Matches($h3, '<w:p[ >]')).Count
$f1 = [IO.File]::ReadAllText((Join-Path $dst 'word\footer1.xml'), [Text.Encoding]::UTF8)
$f2 = [IO.File]::ReadAllText((Join-Path $dst 'word\footer2.xml'), [Text.Encoding]::UTF8)
'footer1 paragraphs: ' + ([regex]::Matches($f1, '<w:p[ >]')).Count + '  footer2 paragraphs: ' + ([regex]::Matches($f2, '<w:p[ >]')).Count
'footer2 plain: [' + ([regex]::Replace($f2, '<[^>]+>', '')) + ']'
'header rels:'
[IO.File]::ReadAllText((Join-Path $dst 'word\_rels\header2.xml.rels'))
[IO.File]::ReadAllText((Join-Path $dst 'word\_rels\header3.xml.rels'))
