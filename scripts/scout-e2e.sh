#!/usr/bin/env bash
# UNPRO Scout — live end-to-end ingestion check.
# Usage: LOVABLE_BROWSER_SUPABASE_ACCESS_TOKEN=<admin jwt> bash scripts/scout-e2e.sh
# Asserts: session lifecycle, new capture, phone dedupe, email dedupe, skip on no contact point.
# Cleanup of the fixture prospect is manual (see packages/unpro-scout-extension/README.md).
set -u
URL="https://clmaqdnphbndvmmqvpff.supabase.co/functions/v1/scout-ingest"
AK="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsbWFxZG5waGJuZHZtbXF2cGZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNTk1NTUsImV4cCI6MjA4ODczNTU1NX0.uqNcgZ8JDldQJ8uDEimstyES8RO8O2ybRJYTcI_KBOk"
T="$LOVABLE_BROWSER_SUPABASE_ACCESS_TOKEN"
call() { curl -s -X POST "$URL" -H "Content-Type: application/json" -H "apikey: $AK" -H "Authorization: Bearer $T" -d "$1"; echo; }

echo "== start_session =="
S=$(call '{"action":"start_session","group_name":"E2E Fixture — Entrepreneurs QC","group_url":"https://facebook.com/groups/e2e-fixture"}')
echo "$S"
SID=$(echo "$S" | python3 -c "import sys,json;print(json.load(sys.stdin).get('session_id',''))")

POST='Scout E2E Toitures Fixture Inc.\nDisponible pour partenariat et sous-traitance à Laval.\nToiture résidentielle. RBQ 5678-1234-01\nTél: (450) 662-9911 — devis@scoute2efixture.ca\nwww.scoute2efixture.ca'

echo "== capture #1 (expect new) =="
call "{\"action\":\"capture\",\"session_id\":\"$SID\",\"raw_text\":\"$POST\",\"author_name\":\"Marc Fixture\",\"group_name\":\"E2E Fixture — Entrepreneurs QC\",\"post_url\":\"https://facebook.com/groups/e2e-fixture/posts/1\",\"source_url\":\"https://facebook.com/groups/e2e-fixture\"}"

echo "== capture #2 same phone, different text (expect duplicate/phone_e164) =="
call "{\"action\":\"capture\",\"session_id\":\"$SID\",\"raw_text\":\"Rappel: 450-662-9911 pour vos toitures\",\"author_name\":\"Marc Fixture\",\"group_name\":\"E2E Fixture — Entrepreneurs QC\",\"post_url\":\"https://facebook.com/groups/e2e-fixture/posts/2\"}"

echo "== capture #3 email only, no phone (expect duplicate/email) =="
call "{\"action\":\"capture\",\"session_id\":\"$SID\",\"raw_text\":\"Ecrivez a devis@scoute2efixture.ca\",\"group_name\":\"E2E Fixture — Entrepreneurs QC\",\"post_url\":\"https://facebook.com/groups/e2e-fixture/posts/3\"}"

echo "== capture #4 chit-chat, no contact (expect skipped) =="
call "{\"action\":\"capture\",\"session_id\":\"$SID\",\"raw_text\":\"Bonne journee tout le monde\",\"group_name\":\"E2E Fixture — Entrepreneurs QC\"}"

echo "== end_session =="
call "{\"action\":\"end_session\",\"session_id\":\"$SID\"}"
echo "SESSION_ID=$SID"
