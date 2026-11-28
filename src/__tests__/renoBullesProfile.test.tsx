import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
const mocks=vi.hoisted(()=>({session:{user:{id:'synthetic-user'}} as unknown,from:vi.fn(),navigate:vi.fn(),saveReturnPath:vi.fn()}));
vi.mock('@/stores/authSessionStore',()=>({useAuthSession:()=>({session:mocks.session,loading:false})}));
vi.mock('react-router-dom',()=>({useLocation:()=>({pathname:'/reno-bulles/profile',search:'?request=12345678-1234-4234-8234-123456789012'}),useNavigate:()=>mocks.navigate}));
vi.mock('@/lib/authReturn',()=>({saveReturnPath:mocks.saveReturnPath}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{from:mocks.from}}));
import RenoBullesProfile from '@/pages/RenoBullesProfile';
afterEach(cleanup);
beforeEach(()=>{vi.clearAllMocks();mocks.session={user:{id:'synthetic-user'}};});
describe('shared profile',()=>{
 it('reuses UNPRO login and preserves the return path',()=>{mocks.session=null;render(<RenoBullesProfile/>);expect(mocks.saveReturnPath).toHaveBeenCalled();expect(mocks.navigate).toHaveBeenCalledWith(expect.stringContaining('/login?returnTo='),{replace:true});expect(mocks.from).not.toHaveBeenCalled();});
 it('sends only explicit user-scoped display fields to the fixed origin',async()=>{
  const postMessage=vi.fn();Object.defineProperty(window,'opener',{value:{postMessage},configurable:true});
  const eq=vi.fn(()=>({maybeSingle:async()=>({data:{full_name:'Synthetic'},error:null}),order:async()=>({data:[{id:'p1',address:'Test',city:'Laval',property_type:'house'}],error:null})}));
  mocks.from.mockImplementation(()=>({select:()=>({eq})}));render(<RenoBullesProfile/>);
  expect(mocks.from).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Afficher mon profil dans Réno-Bulles'}));
  await waitFor(()=>expect(postMessage).toHaveBeenCalled());expect(eq).toHaveBeenCalledWith('user_id','synthetic-user');
  const [payload,origin]=postMessage.mock.calls[0];expect(origin).toBe('https://unpro-bubbles-lancement.roundlark4.chatgpt.site');expect(payload.profile.name).toBe('Synthetic');expect(JSON.stringify(payload)).not.toMatch(/token|session|email/);
 });
 it('does not send data on a failed property read',async()=>{
  const postMessage=vi.fn();Object.defineProperty(window,'opener',{value:{postMessage},configurable:true});
  mocks.from.mockImplementation(()=>({select:()=>({eq:()=>({maybeSingle:async()=>({error:new Error('unavailable')}),order:async()=>({error:new Error('unavailable')})})})}));
  render(<RenoBullesProfile/>);fireEvent.click(screen.getByRole('button',{name:'Afficher mon profil dans Réno-Bulles'}));
  await screen.findByText('Votre profil est momentanément indisponible. Réessayez.');expect(postMessage).not.toHaveBeenCalled();
 });
});
