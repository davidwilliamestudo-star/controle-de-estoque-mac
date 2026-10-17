$dst = 'c:\Users\wilia\OneDrive\Documentos\VOLTQ\DRA ANA MORONG\Controle de Estoque\Controle de Estoque\tmp\docx_inspect'
$xml = [IO.File]::ReadAllText((Join-Path $dst 'word\document.xml'), [Text.Encoding]::UTF8)
# remove noisy attributes
$x = [regex]::Replace($xml, ' w:rsid\w*="[^"]*"', '')
$x = [regex]::Replace($x, ' w14:paraId="[^"]*"', '')
$x = [regex]::Replace($x, '<w:rtl w:val="0"/>', '')
$x = [regex]::Replace($x, '<w:rFonts w:ascii="EB Garamond" w:cs="EB Garamond" w:eastAsia="EB Garamond" w:hAnsi="EB Garamond"/>', '<GAR/>')
$b = $x.IndexOf('<w:body>')
$x.Substring($b, 5200) | Out-File -Encoding utf8 (Join-Path $dst 'body_start.txt')
# bold/italic stats
'w:b runs val=1 (any): ' + ([regex]::Matches($x, '<w:b w:val="1"/>')).Count + '  <w:b/>: ' + ([regex]::Matches($x, '<w:b/>')).Count
'w:i: ' + ([regex]::Matches($x, '<w:i w:val="1"/>')).Count + '  w:sz tags: ' + ([regex]::Matches($x, '<w:sz ')).Count
'jc values: ' + (([regex]::Matches($x, '<w:jc w:val="[^"]+"') | ForEach-Object { $_.Value } | Group-Object | ForEach-Object { $_.Name + ' x' + $_.Count }) -join '; ')
'empty paragraphs: ' + ([regex]::Matches($x, '<w:p><w:pPr>(?:(?!</w:p>).)*?</w:pPr></w:p>')).Count
# a sample centered paragraph + first 'CONTRATO' title
$i = $x.IndexOf('w:val="center"')
$x.Substring([Math]::Max(0,$i-300), 1500) | Out-File -Encoding utf8 (Join-Path $dst 'center_sample.txt')
