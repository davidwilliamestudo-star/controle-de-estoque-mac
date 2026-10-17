$dst = 'c:\Users\wilia\OneDrive\Documentos\VOLTQ\DRA ANA MORONG\Controle de Estoque\Controle de Estoque\tmp\docx_inspect'
$xml = [IO.File]::ReadAllText((Join-Path $dst 'word\document.xml'))
foreach ($tag in '{{chk_mapa}}','{{chk_avista}}','{{nome}}','{{valor_plano}}') {
  $i = $xml.IndexOf($tag)
  '--- ' + $tag + ' @ ' + $i
  $s = [Math]::Max(0, $i - 380)
  $xml.Substring($s, [Math]::Min(820, $xml.Length - $s))
}
'--- fontTable rels'
[IO.File]::ReadAllText((Join-Path $dst 'word\_rels\fontTable.xml.rels'))
'--- fontTable'
[IO.File]::ReadAllText((Join-Path $dst 'word\fontTable.xml'))
'--- settings'
[IO.File]::ReadAllText((Join-Path $dst 'word\settings.xml'))
