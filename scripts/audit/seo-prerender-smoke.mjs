import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderEntityHtml } from "../prerender-ai-entities.mjs";

const shell = [
  '<!doctype html><html lang="fr"><head>',
  '<title>UNPRO — accueil</title>',
  '<meta data-static-head name="description" content="Home page" />',
  '<link data-static-head rel="canonical" href="https://unpro.ca/" />',
  '<meta name="robots" content="index,follow" />',
  '</head><body><div id="root"></div>',
  '<script type="module" src="/assets/index.js"></script></body></html>',
].join("");

test("Public AI profile contains useful initial HTML while preserving the SPA", () => {
  const html = renderEntityHtml(shell, {
    slug: "isolation-solution-royal",
    company_name: "Isolation Solution Royal",
    primary_service: "Isolation de l'entretoit",
    primary_city: "Terrebonne",
    ai_summary: "Entreprise d'isolation de l'entretoit.",
  });
  assert.match(html, /<h1>Isolation Solution Royal<\/h1>/);
  assert.match(html, /Isolation de l.entretoit/);
  assert.match(html, /<link rel="canonical" href="https:\/\/unpro.ca\/ai\/isolation-solution-royal"/);
  assert.match(html, /<script type="application\/ld\+json">/);
  assert.match(html, /src="\/assets\/index.js"/);
  assert.doesNotMatch(html, /content="Home page"/);
  assert.doesNotMatch(html, /rel="canonical" href="https:\/\/unpro.ca\/"/);
  assert.doesNotMatch(html, /licence RBQ vérifiée/i);
});

test("Untrusted profile text is safely escaped in HTML and JSON-LD", () => {
  const html = renderEntityHtml(shell, {
    slug: "exemple",
    company_name: 'Example <img src=x onerror=alert(1)>',
    ai_summary: '</script><script>alert("unsafe")</script>',
    primary_city: "Montréal",
  });
  assert.doesNotMatch(html, /<img src=x/);
  assert.doesNotMatch(html, /<\/script><script>alert/);
  assert.match(html, /&lt;script&gt;/);
});

test("Invalid slugs and missing companies cannot produce static paths", () => {
  assert.equal(renderEntityHtml(shell, { slug: "../admin", company_name: "X" }), null);
  assert.equal(renderEntityHtml(shell, { slug: "good-slug", company_name: "" }), null);
});

test("Public machine references identify only Clara", () => {
  const llms = readFileSync(resolve("public/llms.txt"),"utf8");
  const graphText = readFileSync(resolve("public/knowledge-graph.json"),"utf8");
  const home = readFileSync(resolve("index.html"),"utf8");
  assert.doesNotMatch(llms, /\bAlex\b/);
  assert.doesNotMatch(graphText, /\bAlex\b/);
  assert.doesNotMatch(home, /#alex/);
  const graph = JSON.parse(graphText);
  assert.ok(graph["@graph"].some((x) => x["@id"] === "https://unpro.ca/#clara" && x.name === "Clara"));
});

test("Generator never wipes established public sitemaps during a database outage", () => {
  const source = readFileSync(resolve("scripts/generate-sitemaps.ts"),"utf8");
  assert.match(source, /if \(!rows\) return -1/);
  assert.match(source, /preserving existing public XML\/LLM files/);
  assert.doesNotMatch(source, /writing empty fallbacks/);
});
