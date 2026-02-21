#!/usr/bin/env node

// Fetches publications from ORCID and merges with existing pubs.json metadata.
// pubs.json is NOT the source of truth for publication data — ORCID is.
// pubs.json stores custom metadata: role overrides and summaries.
//
// Usage: node fetch-pubs.js

const fs = require("fs");
const path = require("path");

const ORCID = "0009-0005-8604-3750";
const API = "https://pub.orcid.org/v3.0";
const AUTHOR_NAME = "shrirajh";
const PUBS_FILE = path.join(__dirname, "pubs.json");

async function main() {
    // Load existing metadata
    var existing = {};
    if (fs.existsSync(PUBS_FILE)) {
        existing = JSON.parse(fs.readFileSync(PUBS_FILE, "utf-8"));
    }

    // Fetch work summaries
    console.log("Fetching work summaries...");
    var summaryRes = await fetch(`${API}/${ORCID}/works`, {
        headers: { Accept: "application/vnd.orcid+json" }
    });
    if (!summaryRes.ok) throw new Error("Failed to fetch works: " + summaryRes.statusText);
    var summaryData = await summaryRes.json();

    var putCodes = [];
    for (var group of summaryData.group || []) {
        var s = group["work-summary"] && group["work-summary"][0];
        if (s) putCodes.push(s["put-code"]);
    }

    console.log("Found " + putCodes.length + " works. Fetching full details...");

    // Batch fetch full details
    var fullRes = await fetch(`${API}/${ORCID}/works/${putCodes.join(",")}`, {
        headers: { Accept: "application/vnd.orcid+json" }
    });
    if (!fullRes.ok) throw new Error("Failed to fetch work details: " + fullRes.statusText);
    var fullData = await fullRes.json();

    var result = {};
    var newCount = 0;

    for (var entry of fullData.bulk || []) {
        var w = entry.work;
        if (w == null) continue;

        var title = w.title?.title?.value || "Untitled";
        var year = w["publication-date"]?.year?.value || "";
        var journal = w["journal-title"]?.value || "";
        var extIds = w["external-ids"]?.["external-id"] || [];
        var doi = "";
        for (var id of extIds) {
            if (id["external-id-type"] === "doi") { doi = id["external-id-value"]; break; }
        }

        var contributors = w.contributors?.contributor || [];
        var authorPosition = -1;
        for (var i = 0; i < contributors.length; i++) {
            var name = (contributors[i]["credit-name"]?.value || "").toLowerCase();
            if (name.includes(AUTHOR_NAME)) { authorPosition = i; break; }
        }

        // Use DOI as key, fall back to put-code if no DOI
        var key = doi || ("putcode:" + w["put-code"]);

        // Preserve existing custom metadata
        var prev = existing[key] || {};

        result[key] = {
            title: title,
            year: year,
            journal: journal,
            doi: doi,
            authorPosition: authorPosition,
            totalAuthors: contributors.length,
            // Custom metadata — preserved from existing, null if new
            role: prev.role !== undefined ? prev.role : null,
            summary: prev.summary !== undefined ? prev.summary : null,
            sortOrder: prev.sortOrder !== undefined ? prev.sortOrder : null,
            yearOverride: prev.yearOverride !== undefined ? prev.yearOverride : null
        };

        if (!existing[key]) newCount++;
    }

    // Write merged result
    fs.writeFileSync(PUBS_FILE, JSON.stringify(result, null, 2) + "\n");
    console.log("Wrote " + Object.keys(result).length + " publications to pubs.json (" + newCount + " new).");

    // Show entries missing custom metadata
    var missing = Object.entries(result).filter(function (e) { return e[1].summary == null; });
    if (missing.length > 0) {
        console.log("\nPublications missing a summary:");
        for (var m of missing) {
            console.log("  - " + m[1].title);
        }
    }
}

main().catch(function (e) { console.error(e); process.exit(1); });
