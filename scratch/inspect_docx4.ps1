$dst = 'c:\Users\wilia\OneDrive\Documentos\VOLTQ\DRA ANA MORONG\Controle de Estoque\Controle de Estoque\tmp\docx_inspect'
$xml = [IO.File]::ReadAllText((Join-Path $dst 'word\document.xml'), [Text.Encoding]::UTF8)
'explicit page breaks (w:br page): ' + ([regex]::Matches($xml, '<w:br [^>]*w:type="page"')).Count
'lastRenderedPageBreak: ' + ([regex]::Matches($xml, 'lastRenderedPageBreak')).Count
'pageBreakBefore: ' + ([regex]::Matches($xml, 'pageBreakBefore')).Count
'sectPr count: ' + ([regex]::Matches($xml, '<w:sectPr')).Count
'keepNext: ' + ([regex]::Matches($xml, 'keepNext')).Count
foreach ($h in 'header1','header2','header3','footer1','footer2') {
  $t = [IO.File]::ReadAllText((Join-Path $dst "word\$h.xml"), [Text.Encoding]::UTF8)
  $txt = [regex]::Replace($t, '<[^>]+>', '')
  '--- ' + $h + ' len=' + $t.Length + ' drawing=' + ([regex]::Matches($t, '<w:drawing')).Count + ' pict=' + ([regex]::Matches($t, '<w:pict')).Count + ' text=[' + $txt.Trim() + ']'
}
'--- document.xml.rels'
[IO.File]::ReadAllText((Join-Path $dst 'word\_rels\document.xml.rels'))
'--- header1 xml'
[IO.File]::ReadAllText((Join-Path $dst 'word\header1.xml'), [Text.Encoding]::UTF8).Substring(1500)
