# Local-only harness: requires a throwaway Postgres on /tmp/pgsock:54329 (see make_schema.py). Never run against a hosted database.
set -e
P="psql -h /tmp/pgsock -p 54329 -U postgres -qtAX -v ON_ERROR_STOP=1"
true
$P -c "drop database if exists h" -c "create database h" >/dev/null
P="$P -d h"
$P -f schema.sql >/dev/null
C=11111111-1111-1111-1111-111111111111
echo "== 20 concurrent requests, two different quotes =="
for i in $(seq 1 20); do fp=$([ $((i%2)) = 0 ] && echo fingerprint-quote-A-0000 || echo fingerprint-quote-B-0000); $P -c "select reserve_contractor_checkout('$C','live','combined_presence_plan',true,null,'$fp')->>'action'" & done | sort | uniq -c; wait
echo "active rows:"; $P -c "select count(*) from contractor_checkout_reservations where status in ('reserved','open')"
echo "== attach session, then same request = verify_existing(same), other = verify_existing(different) =="
R=$($P -c "select id from contractor_checkout_reservations where status='reserved'")
FP=$($P -c "select fingerprint from contractor_checkout_reservations where id='$R'")
$P -c "select settle_contractor_checkout('$R','open','cs_test_1','attached')->>'ok'"
$P -c "select reserve_contractor_checkout('$C','live','combined_presence_plan',true,null,'$FP')->>'same_fingerprint'"
$P -c "select reserve_contractor_checkout('$C','live','entry_350',true,null,'fingerprint-standalone-0')->>'same_fingerprint'"
echo "== TEST mode is a separate lane =="
$P -c "select reserve_contractor_checkout('$C','test','plan',false,null,'fingerprint-test-mode-000')->>'action'"
echo "== supersede then new reservation =="
$P -c "select settle_contractor_checkout('$R','superseded','cs_test_1','x')->>'ok'"
R2=$($P -c "select reserve_contractor_checkout('$C','live','entry_350',true,null,'fingerprint-standalone-0')->>'reservation_id'")
echo "new reservation: $([ -n "$R2" ] && echo yes)"
echo "== webhook paid on the superseded old session wins; paid never closed =="
$P -c "select settle_contractor_checkout(null,'paid','cs_test_1','stripe_paid')->>'status'"
$P -c "select settle_contractor_checkout('$R','expired',null,'x')->>'reason'"
echo "== presence paid <12 months -> refuse; valid presence -> refuse =="
$P -c "select settle_contractor_checkout('$R2','failed',null,'x')->>'ok'"
$P -c "select reserve_contractor_checkout('$C','live','entry_350',true,null,'fingerprint-standalone-1')->>'reason'"
$P -c "update contractor_checkout_reservations set updated_at=now()-interval '13 months' where id='$R'"
$P -c "select reserve_contractor_checkout('$C','live','entry_350',true,null,'fingerprint-renewal-000')->>'action'"
D=22222222-2222-2222-2222-222222222222
$P -c "insert into presence_valid values ('$D')"
$P -c "select reserve_contractor_checkout('$D','live','entry_350',true,null,'fingerprint-standalone-1')->>'reason'"
echo "== plan-only purchase is not blocked by a valid Presence =="
$P -c "select reserve_contractor_checkout('$D','live','plan',false,null,'fingerprint-plan-only-00')->>'action'"
echo "== stale reserved row without session (>2 min) is superseded =="
E2=33333333-3333-3333-3333-333333333333
$P -c "select reserve_contractor_checkout('$E2','live','plan',false,null,'fingerprint-crash-00000')->>'action'"
$P -c "update contractor_checkout_reservations set created_at=now()-interval '3 minutes' where contractor_id='$E2'"
$P -c "select reserve_contractor_checkout('$E2','live','plan',false,null,'fingerprint-other-00000')->>'action'"
$P -c "select string_agg(status||':'||coalesce(closed_reason,''),',' order by created_at) from contractor_checkout_reservations where contractor_id='$E2'"
