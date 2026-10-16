import base64

with open('scratch/word/media/image3.png', 'rb') as f:
    b64_p1 = base64.b64encode(f.read()).decode('ascii')

with open('scratch/word/media/image1.png', 'rb') as f:
    b64_p2 = base64.b64encode(f.read()).decode('ascii')

out_path = r'c:\Users\wilia\OneDrive\Documentos\VOLTQ\DRA ANA MORONG\Controle de Estoque\Controle de Estoque\app\src\assets\contractLetterheadBase64.ts'

with open(out_path, 'w', encoding='utf-8') as f:
    f.write('// Papel Timbrado Oficial Dra. Ana Carla Morong (Extraído do Modelo DOCX Oficial)\n')
    f.write(f'export const LETTERHEAD_PAGE1_BASE64 = "{b64_p1}";\n\n')
    f.write(f'export const LETTERHEAD_PAGE2_BASE64 = "{b64_p2}";\n')

print('Generated contractLetterheadBase64.ts successfully!')
