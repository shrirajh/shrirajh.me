const fs = require("fs");
const pubs = JSON.parse(fs.readFileSync("pubs.json", "utf-8"));

const entries = Object.values(pubs).sort((a, b) => {
    const ya = a.year || "0";
    const yb = b.year || "0";
    if (ya !== yb) return yb.localeCompare(ya);
    return (a.title || "").localeCompare(b.title || "");
});

let html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>shrirajh.me</title>
<meta name="description" content="shrirajh — I write code and prescriptions. Asking which parts of healthcare need AI, and which just need better software.">
<link rel="canonical" href="https://shrirajh.me">
<noscript><meta http-equiv="refresh" content="0;url=/"></noscript>
<script>window.location.replace("/");<\/script>
</head>
<body>
<h1>shrirajh — publications</h1>
<p>This page is a static rendering of <a href="/pubs.json">pubs.json</a> for machines and crawlers. <a href="/">Back to shrirajh.me</a></p>
<hr>
`;

for (const pub of entries) {
    html += `<article>\n`;
    html += `<h2>${esc(pub.title)}</h2>\n`;
    if (pub.journal) html += `<p>${esc(pub.journal)}`;
    if (pub.year) html += ` (${esc(pub.year)})`;
    if (pub.journal) html += `</p>\n`;
    if (pub.doi) html += `<p>DOI: <a href="https://doi.org/${encodeURIComponent(pub.doi)}">${esc(pub.doi)}</a></p>\n`;
    if (pub.summary) html += `<p>${esc(pub.summary)}</p>\n`;
    html += `</article>\n<hr>\n`;
}

html += `</body>\n</html>\n`;

fs.writeFileSync("pubs.html", html);
console.log(`Built pubs.html with ${entries.length} publications.`);

function esc(s) {
    return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
