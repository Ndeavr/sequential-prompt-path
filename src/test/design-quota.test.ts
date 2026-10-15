import { describe, expect, it, vi } from 'vitest';
import { isQuotaAdmin, ADMIN_QUOTA } from '../../supabase/functions/_shared/adminQuota';
import { nextTorontoMonthISO, nextTorontoMidnightISO } from '../../supabase/functions/_shared/usagePolicyCopy';
import { parseDesignQuota } from '@/lib/design/quota';

describe('Design admin exemption and actionable quotas', () => {
  it('exempts only a database-verified admin using the authenticated id', async () => {
    const rpc=vi.fn().mockResolvedValue({data:true,error:null});
    expect(await isQuotaAdmin({rpc},'authenticated-user')).toBe(true);
    expect(rpc).toHaveBeenCalledWith('has_role',{_user_id:'authenticated-user',_role:'admin'});
    expect(ADMIN_QUOTA).toMatchObject({allowed:true,unlimited:true,remaining:-1,blockedBy:null});
  });
  it('does not accept missing, spoofed or failed role checks', async () => {
    for(const result of [{data:false,error:null},{data:'true',error:null},{data:true,error:{message:'denied'}}]) {
      expect(await isQuotaAdmin({rpc:vi.fn().mockResolvedValue(result)},'user')).toBe(false);
    }
    expect(await isQuotaAdmin({rpc:vi.fn().mockRejectedValue(new Error('offline'))},'user')).toBe(false);
  });
  it('recognizes the actual quota_exceeded contract and uses the existing plan route', () => {
    expect(parseDesignQuota({quota_exceeded:true,used:10,limit:10,upgrade_target:'home_signature',resets_at:'2026-11-01T04:00:00Z'})).toMatchObject({current:10,upgradeTarget:'home_signature',upgradeLabel:'Gold'});
    expect(parseDesignQuota({error:'provider failure'})).toBeNull();
    expect(parseDesignQuota({quota_exceeded:true,upgrade_target:'https://example.com'})).toMatchObject({upgradeTarget:'home_plus'});
  });
  it('does not promise tomorrow for a monthly quota and handles Toronto month boundaries', () => {
    expect(nextTorontoMonthISO(new Date('2026-10-14T23:49:00Z'))).toBe('2026-11-01T04:00:00.000Z');
    expect(nextTorontoMonthISO(new Date('2026-12-14T23:49:00Z'))).toBe('2027-01-01T05:00:00.000Z');
    expect(nextTorontoMidnightISO(new Date('2026-10-14T23:49:00Z'))).toBe('2026-10-15T04:00:00.000Z');
  });
});
