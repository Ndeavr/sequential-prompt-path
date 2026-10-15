import { afterEach, describe, expect, it, vi } from "vitest";
const auth = vi.hoisted(() => ({ getSession: vi.fn().mockResolvedValue({data:{session:null}}) }));
vi.mock("@/integrations/supabase/client", () => ({supabase:{auth}}));
import { requestVoiceTestAudio } from "@/lib/voiceTestAudio";
afterEach(() => {vi.unstubAllGlobals();vi.unstubAllEnvs();});
describe("diagnostic MP3 transport", () => {
  it("preserves binary bytes instead of interpreting MP3 as UTF-8", async () => {
    const expected=new Uint8Array([0x49,0x44,0x33,0xff,0xe1,0x80,0]);
    const fetcher=vi.fn().mockResolvedValue({ok:true,headers:new Headers({'content-type':'audio/mpeg'}),arrayBuffer:async()=>expected.buffer});
    vi.stubGlobal('fetch',fetcher);vi.stubEnv('VITE_SUPABASE_URL','https://example.invalid');
    expect(new Uint8Array(await requestVoiceTestAudio('fixture','Test'))).toEqual(expected);
    expect(fetcher.mock.calls[0][0]).toBe('https://example.invalid/functions/v1/alex-voice-test');
  });
  it("rejects an HTTP error without claiming audio success", async () => {
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:false,status:503}));
    await expect(requestVoiceTestAudio('fixture','Test')).rejects.toThrow('HTTP 503');
  });
  it("rejects a JSON response even on HTTP 200", async () => {
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,headers:new Headers({'content-type':'application/json'})}));
    await expect(requestVoiceTestAudio('fixture','Test')).rejects.toThrow('did not return audio');
  });
});
