// Sets the LUNARA icon + version info on the Windows .exe without Wine (pure JS via resedit).
const fs = require("node:fs");
const path = require("node:path");
exports.default = async function (ctx) {
  if (ctx.electronPlatformName !== "win32") return;
  const ResEdit = await import("resedit");
  const R = ResEdit.default ?? ResEdit;
  const exe = path.join(ctx.appOutDir, `${ctx.packager.appInfo.productFilename}.exe`);
  const data = fs.readFileSync(exe);
  const res = R.NtExecutableResource.from(R.NtExecutable.from(data, { ignoreCert: true }));
  const nt = R.NtExecutable.from(data, { ignoreCert: true });
  const resource = R.NtExecutableResource.from(nt);
  const iconFile = R.Data.IconFile.from(fs.readFileSync(path.join(__dirname, "..", "build", "icon.ico")));
  R.Resource.IconGroupEntry.replaceIconsForResource(resource.entries, 1, 1033, iconFile.icons.map((i) => i.data));
  const vi = R.Resource.VersionInfo.fromEntries(resource.entries)[0];
  if (vi) {
    vi.setStringValues({ lang: 1033, codepage: 1200 }, { ProductName: "LUNARA MUSIC", FileDescription: "LUNARA MUSIC", CompanyName: "LUNARA MUSIC", OriginalFilename: "LUNARA MUSIC.exe" });
    vi.outputToResourceEntries(resource.entries);
  }
  resource.outputResource(nt);
  fs.writeFileSync(exe, Buffer.from(nt.generate()));
  void res;
  console.log("  • LUNARA icon applied to", path.basename(exe));
};
