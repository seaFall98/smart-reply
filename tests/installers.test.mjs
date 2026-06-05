import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const installPath = "installers/install.ps1";
const uninstallPath = "installers/uninstall.ps1";

async function readScripts() {
  const install = await readFile(installPath, "utf8");
  const uninstall = await readFile(uninstallPath, "utf8");
  return { install, uninstall, combined: `${install}\n${uninstall}` };
}

test("installers never reference protected configuration files", async () => {
  const { combined } = await readScripts();
  assert.doesNotMatch(combined, /\.codex|config\.toml|settings\.json/i);
});

test("install uses only native Claude marketplace and plugin commands", async () => {
  const { install } = await readScripts();
  assert.match(install, /claude plugin validate --strict/);
  assert.match(install, /claude plugin marketplace add/);
  assert.match(install, /claude plugin install/);
  assert.doesNotMatch(install, /Set-Content|Add-Content|Out-File|Remove-Item/);
});

test("uninstall uses only native Claude plugin and marketplace commands", async () => {
  const { uninstall } = await readScripts();
  assert.match(uninstall, /claude plugin uninstall/);
  assert.match(uninstall, /claude plugin marketplace remove/);
  assert.doesNotMatch(uninstall, /Set-Content|Add-Content|Out-File|Remove-Item/);
});

test("both scripts stop on errors and support WhatIf", async () => {
  const { install, uninstall } = await readScripts();
  for (const script of [install, uninstall]) {
    assert.match(script, /\$ErrorActionPreference\s*=\s*"Stop"/);
    assert.match(script, /\[switch\]\$WhatIf/);
    assert.match(script, /if\s*\(\$WhatIf\)/);
  }
});
