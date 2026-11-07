const http = require("http"), fs = require("fs"), url = require("url");
const { cleanUrls, cleanInternalUrl, discoverPages } = require("./miss-mister-vote/server/urls.js");
const mw = cleanUrls();
// Shim minimal des API Express utilisees par le middleware
const srv = http.createServer((req, res) => {
  const u = new url.URL(req.url, "http://x");
  req.originalUrl = req.url; req.path = req.url.split("?")[0];
  res.redirect = (code, loc) => { res.writeHead(code, { Location: loc }); res.end(); };
  res.sendFile = (f, cb) => { res.writeHead(200, {"X-File": require("path").basename(f)}); res.end(req.method==="HEAD"?undefined:fs.readFileSync(f)); cb && cb(); };
  mw(req, res, () => { res.writeHead(404, {"X-Next":"1"}); res.end("next()"); });
});
const get = (method, p) => new Promise(r => { const q = http.request({ host:"127.0.0.1", port:srv.address().port, path:p, method }, s => { s.resume(); s.on("end", () => r(s)); }); q.end(); });
const cases = [
  // [methode, chemin, statut attendu, Location attendue | fichier servi | "next"]
  ["GET","/",200,"file:index.html"],
  ["GET","/?utm=a",200,"file:index.html"],
  ["GET","/index.html",301,"/"],
  ["GET","/index.html?x=1",301,"/?x=1"],
  ["GET","/index",301,"/"],
  ["GET","/candidats",200,"file:candidats.html"],
  ["GET","/candidats.html",301,"/candidats"],
  ["GET","/candidat.html?id=7",301,"/candidat?id=7"],
  ["GET","/candidat?id=7",200,"file:candidat.html"],
  ["GET","/candidats.html?vote=12",301,"/candidats?vote=12"],
  ["GET","/merci.html?tx=5&status=approved",301,"/merci?tx=5&status=approved"],
  ["GET","/profil.html?id=3",301,"/profil?id=3"],
  ["GET","/candidats/",301,"/candidats"],
  ["GET","/candidats.html/",301,"/candidats"],
  ["GET","/CANDIDATS",301,"/candidats"],
  ["GET","/Candidats.HTML?id=1",301,"/candidats?id=1"],
  ["GET","/a-propos",200,"file:a-propos.html"],
  ["GET","/a-propos.html",301,"/a-propos"],
  ["GET","/admin",200,"file:admin.html"],
  ["GET","/admin.html",301,"/admin"],
  ["GET","/inscription-suivi",200,"file:inscription-suivi.html"],
  ["HEAD","/faq",200,"file:faq.html"],
  ["HEAD","/faq.html",301,"/faq"],
  // doit etre ignore (next)
  ["POST","/api/votes/initiate",404,"next"],
  ["POST","/candidats.html",404,"next"],
  ["GET","/api/candidates",404,"next"],
  ["GET","/api/admin/homepage",404,"next"],
  ["GET","/css/style.css",404,"next"],
  ["GET","/js/nav.js",404,"next"],
  ["GET","/img/logo.png",404,"next"],
  ["GET","/health",404,"next"],
  ["GET","/inexistante",404,"next"],
  ["GET","/inexistante.html",404,"next"],
  ["GET","/api.html",404,"next"],
  // securite : pas de redirection ouverte
  ["GET","//evil.com/index.html",404,"next"],
  ["GET","/\\evil.com",404,"next"],
  ["GET","/candidats.html//evil.com",404,"next"],
  ["GET","/..%2f..%2fetc%2fpasswd",404,"next"],
];
srv.listen(0, async () => {
  let fail = 0;
  for (const [m,p,st,exp] of cases) {
    const s = await get(m,p);
    let ok = s.statusCode === st;
    if (exp === "next") ok = ok && s.headers["x-next"] === "1";
    else if (exp.startsWith("file:")) ok = ok && s.headers["x-file"] === exp.slice(5);
    else ok = ok && s.headers.location === exp;
    if (!ok) fail++;
    console.log((ok?"PASS ":"FAIL ")+m.padEnd(5)+p.padEnd(40)+"-> "+s.statusCode+" "+(s.headers.location||s.headers["x-file"]||(s.headers["x-next"]?"next()":"")));
  }
  console.log("\ncleanInternalUrl:");
  const t = [["/candidats.html","/candidats"],["/index.html#presentation-candidats","/#presentation-candidats"],["/candidat.html?id=2#x","/candidat?id=2#x"],["#objectifs","#objectifs"],["https://exemple.com/a.html","https://exemple.com/a.html"],["/candidats","/candidats"],["","" ],["/api.html","/api.html"]];
  for (const [i,e] of t) { const o = cleanInternalUrl(i); const ok = o===e; if(!ok) fail++; console.log((ok?"PASS ":"FAIL ")+JSON.stringify(i)+" -> "+JSON.stringify(o)); }
  console.log("\nPages decouvertes:", [...discoverPages().keys()].join(", "));
  console.log(fail ? `\n${fail} ECHEC(S)` : "\nTOUS LES TESTS PASSENT");
  srv.close(); process.exit(fail?1:0);
});
