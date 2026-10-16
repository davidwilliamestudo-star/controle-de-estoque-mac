import zipfile
import re

with zipfile.ZipFile('MODELO CONTRATO FINANCEIRO DRA ANA (3).docx', 'r') as z:
    xml = z.read('word/document.xml').decode('utf-8')
    header_refs = re.findall(r'<w:headerReference[^>]+/>', xml)
    print('Header references in document.xml:')
    for hr in header_refs:
        print(hr)
    
    footer_refs = re.findall(r'<w:footerReference[^>]+/>', xml)
    print('Footer references in document.xml:')
    for fr in footer_refs:
        print(fr)
    
    rels = z.read('word/_rels/document.xml.rels').decode('utf-8')
    print('Document relationships:')
    for r in re.findall(r'<Relationship[^>]+/>', rels):
        if 'header' in r or 'footer' in r:
            print(r)
