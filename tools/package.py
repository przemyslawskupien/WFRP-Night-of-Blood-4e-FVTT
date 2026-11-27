"""Build the installable module archive using only Python's standard library."""
import json
from pathlib import Path
import zipfile

root = Path(__file__).resolve().parents[1]
manifest = json.loads((root / "module.json").read_text())
destination = root / "dist" / f"{manifest['id']}-{manifest['version']}.zip"
destination.parent.mkdir(exist_ok=True)
files = [root / name for name in ("module.json", "init.js", "README.md", "LICENSE", "CHANGELOG.md")]
files += sorted(p for p in (root / "assets").rglob("*") if p.is_file())
files += sorted(p for p in (root / "packs").rglob("*") if p.is_file() and p.name not in {"LOCK", "LOG", "LOG.old"})
assert any(p.suffix == ".ldb" for p in files), "Run npm run build before packaging"
with zipfile.ZipFile(destination, "w", compression=zipfile.ZIP_DEFLATED) as archive:
    for file in files:
        archive.write(file, Path(manifest["id"]) / file.relative_to(root))
with zipfile.ZipFile(destination) as archive:
    assert archive.testzip() is None
    assert json.loads(archive.read(f"{manifest['id']}/module.json")) == manifest
print(f"{destination.name}: {len(files)} files, {destination.stat().st_size:,} bytes; archive integrity OK")
