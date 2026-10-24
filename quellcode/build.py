#!/usr/bin/env python3
"""Baut Merkwerk: fügt CSS, JS und KaTeX (inkl. Schriften) in eine einzige index.html ein
und erzeugt daraus die PWA (dist/merkwerk-app) sowie die Offline-Einzeldatei."""
import base64, json, re, shutil, sys
from pathlib import Path

ROOT = Path(__file__).parent
SRC = ROOT / "src"
DIST = ROOT / "dist"
KATEX = Path("/opt/npm-tools/node_modules/katex/dist")

def katex_css_inlined():
    css = (KATEX / "katex.min.css").read_text(encoding="utf-8")
    def repl(m):
        decl = m.group(0)
        woff2 = re.search(r"url\(fonts/([^)]+?\.woff2)\)", decl)
        if not woff2:
            return decl
        data = base64.b64encode((KATEX / "fonts" / woff2.group(1)).read_bytes()).decode()
        src = f"src:url(data:font/woff2;base64,{data}) format(\"woff2\")"
        return re.sub(r"src:[^;}]+", src, decl)
    return re.sub(r"@font-face\{[^}]+\}", repl, css)

def build():
    version = json.loads((SRC / "version.json").read_text())["version"]
    template = (SRC / "index.template.html").read_text(encoding="utf-8")
    css = "\n".join(p.read_text(encoding="utf-8") for p in sorted((SRC / "css").glob("*.css")))
    js_files = sorted((SRC / "js").glob("*.js"))
    js = "\n".join(f"/* ---- {p.name} ---- */\n" + p.read_text(encoding="utf-8") for p in js_files)
    js = js.replace("__APP_VERSION__", version)
    katex_js = (KATEX / "katex.min.js").read_text(encoding="utf-8")
    html = (template
            .replace("/*__KATEX_CSS__*/", katex_css_inlined())
            .replace("/*__APP_CSS__*/", css)
            .replace("/*__KATEX_JS__*/", katex_js)
            .replace("/*__APP_JS__*/", "(() => {\n" + js + "\n})();"))
    app = DIST / "merkwerk-app"
    (app / "icons").mkdir(parents=True, exist_ok=True)
    (app / "index.html").write_text(html, encoding="utf-8")
    shutil.copy(SRC / "manifest.webmanifest", app / "manifest.webmanifest")
    sw = (SRC / "sw.js").read_text(encoding="utf-8").replace("__APP_VERSION__", version)
    (app / "sw.js").write_text(sw, encoding="utf-8")
    for icon in (SRC / "icons").glob("*.png"):
        shutil.copy(icon, app / "icons" / icon.name)
    (DIST / "Merkwerk-Offline.html").write_text(html, encoding="utf-8")
    print(f"Build {version}: index.html {len(html)/1024:.0f} KB, {len(js_files)} JS-Dateien")

if __name__ == "__main__":
    build()
