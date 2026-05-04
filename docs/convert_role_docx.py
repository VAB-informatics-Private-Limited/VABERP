"""Convert any ERP_<role>.md → ERP_<role>.docx.

Usage:
    python docs/convert_role_docx.py <role>

<role> ∈ superadmin, reseller, employee, enterprise (case-insensitive). Without arg → all four.
"""
import importlib.util
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

ROLES = {
    "enterprise": "ERP_Enterprise",
    "employee":   "ERP_Employee",
    "superadmin": "ERP_SuperAdmin",
    "reseller":   "ERP_Reseller",
}

# Reuse the parser + writer from convert_erp_enterprise
spec = importlib.util.spec_from_file_location("erp_conv", os.path.join(HERE, "convert_erp_enterprise.py"))
mod = importlib.util.module_from_spec(spec)
sys.modules["erp_conv"] = mod
spec.loader.exec_module(mod)


def run(role: str):
    if role not in ROLES:
        raise SystemExit(f"Unknown role '{role}'. Use one of: {', '.join(ROLES)}")
    base = ROLES[role]
    src = os.path.join(HERE, f"{base}.md")
    out = os.path.join(HERE, f"{base}.docx")
    blocks = mod.parse_markdown(src)
    mod.write_docx(blocks, out)
    n_h2 = sum(1 for b in blocks if b.kind == "h2")
    n_tab = sum(1 for b in blocks if b.kind == "table")
    print(f"[{role}] {len(blocks)} blocks · {n_h2} sections · {n_tab} tables -> {out}")


def main():
    if len(sys.argv) < 2:
        for k in ROLES:
            run(k)
    else:
        run(sys.argv[1].lower())


if __name__ == "__main__":
    main()
