"""Real DOM layout regression on the active route. All service calls are fixtures.
No auth bypass, provider calls, payments, messages or production writes.
Run: python3 scripts/audit/mobile_viewport_smoke.py
"""
import asyncio, json, os
from pathlib import Path
from playwright.async_api import async_playwright
OUT = Path('/tmp/browser/mobile-p0/smoke'); OUT.mkdir(parents=True, exist_ok=True)
BASE = 'http://localhost:8080'
RESULTS = []

async def bounds(page, selector):
    return await page.locator(selector).last.evaluate('''e => {const r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:r.height,left:r.left,right:r.right}}''')

async def check(page, selector, name, container=None):
    r = await bounds(page, selector)
    v = await page.evaluate('({top:visualViewport.offsetTop,bottom:visualViewport.offsetTop+visualViewport.height,w:innerWidth})')
    if container:
        c = await bounds(page, container); v['top']=max(v['top'],c['top']); v['bottom']=min(v['bottom'],c['bottom'])
    passed = r['top'] >= v['top']-1 and r['bottom'] <= v['bottom']+1 and r['left'] >= -1 and r['right'] <= v['w']+1 and r['height'] > 0
    RESULTS.append({'name':name,'pass':passed,'rect':r,'visible':v})
    if not passed:
        await page.screenshot(path=str(OUT/(name.replace('/','_')+'.png')))
        raise AssertionError(json.dumps(RESULTS[-1]))

async def fixtures(route):
    request=route.request
    if 'get_public_impact_snapshot' in request.url:
        await route.fulfill(status=503,json={'error':'QA fixture unavailable'}); return
    if '/functions/v1/clara-session' in request.url:
        body=request.post_data_json or {}; action=body.get('action')
        msgs=[{'id':f'm{i}','role':'assistant' if i%2 else 'user','text':('Réponse de test pour vérifier le défilement. '*4)} for i in range(18)]
        msgs.append({'id':'last','role':'assistant','text':'Quelle option préférez-vous ?'})
        data={'session_id':'00000000-0000-0000-0000-000000000001','session_token':body.get('session_token'),'messages':msgs,'context':{},'resumed':True,'language':'fr','current_step':'chat','auth_state':'guest','role':None}
        if action=='dossier_list': data={'entries':[]}
        if action=='history': data={'conversations':[]}
        await route.fulfill(json=data); return
    if '/functions/v1/alex-chat' in request.url:
        text='Voici la réponse de test. Elle reste visible au-dessus du clavier. [[CHOIX: Première option | Deuxième option | Dernière option]]'
        await route.fulfill(body='data: '+json.dumps({'choices':[{'delta':{'content':text}}]})+'\n\ndata: [DONE]\n\n',content_type='text/event-stream');return
    # Never hit Maps, OTP, analytics or production services from this smoke.
    await route.fulfill(json=[] if '/rest/' in request.url else {})

async def chat_case(browser,w,h):
    ctx=await browser.new_context(viewport={'width':1280,'height':1800})
    await ctx.route('**/*.supabase.co/**',fixtures)
    page=await ctx.new_page(); errors=[]; page.on('pageerror',lambda e:errors.append(str(e)))
    await page.add_init_script('''const v=new EventTarget();v.height=innerHeight;v.offsetTop=0;v.width=innerWidth;Object.defineProperty(window,'visualViewport',{value:v,configurable:true});''')
    await page.set_viewport_size({'width':w,'height':h})
    await page.goto(BASE,wait_until='domcontentloaded')
    await page.locator('.home-clara-message[data-role="assistant"]').last.wait_for()
    await page.wait_for_timeout(700)
    field=page.locator('.home-clara-textarea'); await field.focus()
    # Real visualViewport is read-only: replace it in this localhost page only
    # with a deterministic event target to simulate overlay keyboard + pan.
    await page.evaluate('''() => {visualViewport.height=innerHeight-300;visualViewport.offsetTop=24;visualViewport.dispatchEvent(new Event('resize'));}''')
    await page.wait_for_timeout(700)
    prefix=f'{w}x{h}'
    await check(page,'.home-clara-composer',prefix+' composer')
    await check(page,'.home-clara-textarea',prefix+' input')
    await check(page,'[data-chat-row="commands"]',prefix+' command row')
    await check(page,'.home-clara-message[data-role="assistant"]',prefix+' last response','.home-clara-conversation > div')
    await field.fill('Un problème à comprendre'); await page.get_by_role('button',name='Send',exact=True).click()
    await page.get_by_role('group',name='Réponses rapides',exact=True).wait_for()
    await page.wait_for_timeout(700)
    await page.locator('.home-clara-message[data-role="assistant"]').last.scroll_into_view_if_needed()
    await check(page,'.home-clara-message[data-role="assistant"]',prefix+' response reachable after send','.home-clara-conversation > div')
    jump=page.get_by_role('button',name='Revenir au dernier message')
    if await jump.count(): await jump.click()
    await page.wait_for_timeout(500)
    await check(page,'[aria-label="Réponses rapides"] button',prefix+' last reply','.home-clara-conversation > div')
    # Portaled menus remain inside the visible viewport, independent of the
    # chat card's overflow clipping.
    await page.get_by_role('button',name='Ajouter une photo ou un document',exact=True).click()
    await page.get_by_role('menu').last.wait_for()
    await check(page,'[role="menu"]',prefix+' media menu')
    await page.keyboard.press('Escape')
    await page.get_by_role('button',name='Voir mes conversations',exact=True).click()
    await page.get_by_role('menu').last.wait_for()
    await check(page,'[role="menu"]',prefix+' history menu')
    await page.keyboard.press('Escape')
    await page.get_by_role('button',name='Plus d’actions',exact=True).click()
    await page.get_by_role('menu').last.wait_for()
    await check(page,'[role="menu"]',prefix+' actions menu')
    await page.get_by_role('menuitem',name='Dossier maison',exact=True).click()
    scroller=page.locator('.home-clara-conversation > div').first
    await scroller.evaluate('e=>e.scrollTop=0'); await page.wait_for_timeout(300)
    before=await scroller.evaluate('e=>e.scrollTop')
    # Growing DOM content exercises the same ResizeObserver used during streaming.
    await page.locator('.home-clara-message[data-role="assistant"]').last.evaluate("e=>e.append(document.createTextNode(' Growing streaming text. '.repeat(30)))")
    await page.wait_for_timeout(500)
    after=await scroller.evaluate('e=>e.scrollTop')
    assert abs(after-before)<2, f'manual reading displaced: {before}->{after}'
    RESULTS.append({'name':prefix+' manual scroll preserved','pass':True})
    jump = page.get_by_role('button',name='Revenir au dernier message')
    if await jump.count(): await jump.click()
    else: await scroller.evaluate('e=>e.scrollTop=e.scrollHeight')
    await page.wait_for_timeout(700)
    await check(page,'[aria-label="Réponses rapides"] button',prefix+' jump to latest','.home-clara-conversation > div')
    # First greeting remains reachable below the reserved tool strip.
    await scroller.evaluate('e=>e.scrollTop=0'); await page.wait_for_timeout(200)
    first=page.locator('.home-clara-message').first
    first_rect=await first.bounding_box(); scroll_rect=await scroller.bounding_box()
    assert first_rect and scroll_rect and first_rect['y']>=scroll_rect['y']-1
    RESULTS.append({'name':prefix+' first message reachable','pass':True})
    await page.get_by_role('button',name="Ajouter l'adresse",exact=True).click()
    address=page.get_by_placeholder('Ex. 1234 rue Centrale, LaSalle'); await address.focus()
    await page.wait_for_timeout(500)
    await check(page,'input[placeholder="Ex. 1234 rue Centrale, LaSalle"]',prefix+' address field')
    # No Google request: only field reachability, not live suggestion validation.
    await page.screenshot(path=str(OUT/(prefix+'-address.png')))
    await page.keyboard.press('Escape')
    await page.evaluate('visualViewport.height=innerHeight;visualViewport.offsetTop=0;visualViewport.dispatchEvent(new Event("resize"))')
    await page.set_viewport_size({'width':740,'height':360}); await page.evaluate('visualViewport.height=innerHeight;visualViewport.dispatchEvent(new Event("resize"))'); await page.wait_for_timeout(500)
    await field.focus(); await check(page,'.home-clara-composer',prefix+' landscape composer')
    await page.screenshot(path=str(OUT/(prefix+'-landscape.png')))
    await page.reload(wait_until='domcontentloaded')
    await page.locator('.home-clara-message[data-role="assistant"]').last.wait_for()
    await page.wait_for_timeout(700)
    await check(page,'.home-clara-composer',prefix+' refresh composer')
    assert not errors, errors
    await ctx.close()

async def public_forms(browser):
    ctx=await browser.new_context(viewport={'width':1280,'height':1800})
    await ctx.route('**/*.supabase.co/**',fixtures)
    page=await ctx.new_page(); await page.set_viewport_size({'width':390,'height':844})
    for path in ['/login','/contractor-onboarding','/affilies/onboarding']:
        await page.goto(BASE+path,wait_until='domcontentloaded'); await page.wait_for_timeout(800)
        inputs=page.locator('input:not([type=hidden]):visible, textarea:visible')
        count=await inputs.count()
        if not count:
            # /login may present provider/OTP choices before any field. This is
            # a distinct unverified flow, not a mobile clipping failure.
            RESULTS.append({'name':path+' fields','status':'UNVERIFIED','reason':'No visible field in the unauthenticated fixture state'});continue
        await inputs.last.focus(); await page.set_viewport_size({'width':390,'height':544}); await page.wait_for_timeout(500)
        await check(page,'input:focus,textarea:focus',path+' focused field')
        await page.screenshot(path=str(OUT/(path.replace('/','_')+'.png')))
        await page.set_viewport_size({'width':390,'height':844})
    # Authorized session required for final contractor and affiliate activation.
    RESULTS.append({'name':'authenticated final registrations','status':'UNVERIFIED','reason':'Not submitted; no OTP, registration, payment or auth bypass permitted by fixture smoke'})
    await ctx.close()

async def main():
    try:
        async with async_playwright() as p:
            browser=await p.chromium.launch(headless=True)
            for w,h in [(360,740),(390,844)]: await chat_case(browser,w,h)
            await public_forms(browser)
            await browser.close()
    finally:
        (OUT/'results.json').write_text(json.dumps(RESULTS,indent=2))
        print(json.dumps(RESULTS,indent=2))
    failures=[r for r in RESULTS if r.get('pass') is False]
    assert not failures, failures
    print('PASS',sum(r.get('pass') is True for r in RESULTS),'layout assertions; fixtures only, physical keyboard unverified')
asyncio.run(main())
