import os
import sys
import pypdf

# Ensure output encoding is UTF-8
sys.stdout.reconfigure(encoding='utf-8')

workspace = r"c:\Users\Admin\Desktop\BHI"
pdf_files = {
    'economics': 'Economics 2015 - April 2026 Past Papers (1).pdf',
    'fa': 'FA-2015-December-2025-Past-Papers (1).pdf',
    'qa': 'Quantitative-Analysis-2015-April-2026-Past-Papers_260603_082758 (1).pdf'
}

data_dir = os.path.join(workspace, 'data')
os.makedirs(data_dir, exist_ok=True)

for subject, filename in pdf_files.items():
    pdf_path = os.path.join(workspace, filename)
    txt_path = os.path.join(data_dir, f"{subject}_raw.txt")
    print(f"Extracting {filename} to {txt_path}...")
    
    try:
        reader = pypdf.PdfReader(pdf_path)
        with open(txt_path, 'w', encoding='utf-8') as out_f:
            for idx, page in enumerate(reader.pages):
                text = page.extract_text()
                # Write page delimiter
                out_f.write(f"\n--- PAGE {idx + 1} ---\n")
                out_f.write(text)
        print(f"Successfully extracted {len(reader.pages)} pages for {subject}.")
    except Exception as e:
        print(f"Error extracting {filename}: {e}")
