import zipfile
import re

with zipfile.ZipFile('MODELO CONTRATO FINANCEIRO DRA ANA (3).docx', 'r') as z:
    for h in ['word/header1.xml', 'word/header2.xml', 'word/header3.xml']:
        xml = z.read(h).decode('utf-8')
        rels_name = f'word/_rels/{h.split("/")[1]}.rels'
        rels = z.read(rels_name).decode('utf-8') if rels_name in z.namelist() else ''
        print(f'=== {h} ===')
        print('RELS:', rels)
        blips = re.findall(r'embed="([^"]+)"', xml)
        print('Blip IDs:', blips)
