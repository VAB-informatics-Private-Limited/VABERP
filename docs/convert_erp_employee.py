"""Convert docs/ERP_Employee.md → ERP_Employee.docx (faithful Word version).

Reuses the parser logic from convert_erp_enterprise.py.
"""
import importlib.util, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

# Import the existing module directly (must register in sys.modules
# for dataclasses to resolve cls.__module__ on Python 3.14)
spec = importlib.util.spec_from_file_location("erp_conv", os.path.join(HERE, "convert_erp_enterprise.py"))
mod = importlib.util.module_from_spec(spec)
sys.modules["erp_conv"] = mod
spec.loader.exec_module(mod)

SRC = os.path.join(HERE, "ERP_Employee.md")
DOCX = os.path.join(HERE, "ERP_Employee.docx")

if __name__ == "__main__":
    blocks = mod.parse_markdown(SRC)
    mod.write_docx(blocks, DOCX)
    n_h2 = sum(1 for b in blocks if b.kind == "h2")
    n_tab = sum(1 for b in blocks if b.kind == "table")
    print(f"Parsed {len(blocks)} blocks · {n_h2} sections · {n_tab} tables")
    print(f"Wrote: {DOCX}")
