"""Real DOM regression; no external requests. Run against a local Vite URL."""
import asyncio
import json
import os
from pathlib import Path
from playwright.async_api import async_playwright

BASE = os.environ.get("QA_BASE_URL", "http://localhost:8080")
OUT = Path("/tmp/browser/clipping")
OUT.mkdir(parents=True, exist_ok=True)

async def layout(page, suggestions=False):
    result = await page.evaluate("""() => {
      const rect = selector => {
        const e = document.querySelector(selector), r = e.getBoundingClientRect();
        return {top:r.top,bottom:r.bottom,left:r.left,right:r.right};
      };
      const scroller = document.querySelector('.home-clara-conversation > div');
      return {header:rect('.home-clara-command-row'),
        viewport:rect('.home-clara-conversation > div'),
        composer:rect('.home-clara-input-row'), scroll:scroller.scrollTop,
        overflow:document.documentElement.scrollWidth > innerWidth,
        choices:[...document.querySelectorAll('.home-clara-examples button')].map(e=>{
          const r=e.getBoundingClientRect();
          const n=e.querySelector('.home-clara-example-number').getBoundingClientRect();
          return {top:r.top,bottom:r.bottom,numberTop:n.top,numberBottom:n.bottom};
        })};
    }""")
    assert not result["overflow"], result
    assert result["viewport"]["top"] >= result["header"]["bottom"] - 1, result
    assert result["viewport"]["bottom"] <= result["composer"]["top"] + 1, result
    if suggestions:
        assert result["scroll"] == 0, result
        assert len(result["choices"]) == 3, result
        for choice in result["choices"]:
            assert choice["top"] >= result["viewport"]["top"], result
            assert choice["bottom"] <= result["viewport"]["bottom"] + 1, result
            assert choice["numberTop"] >= result["header"]["bottom"], result
            assert choice["numberBottom"] <= result["composer"]["top"], result
    return result

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        checks = 0
        for width in [320, 360, 375, 390, 412, 1280]:
            height = 1800 if width == 1280 else 768
            context = await browser.new_context(
                locale="fr-CA", viewport={"width":width,"height":height})
            requests = []
            async def intercept(route):
                if route.request.url.startswith(BASE):
                    return await route.continue_()
                data = route.request.post_data_json if route.request.post_data else {}
                if "/functions/v1/clara-session" in route.request.url:
                    return await route.fulfill(json={"session_id":"qa-layout",
                        "session_token":"qa-layout-token","messages":[],
                        "context":data.get("context") or data.get("patch") or {},
                        "language":"fr","current_step":"chat","auth_state":"guest","resumed":True})
                if "/functions/v1/alex-chat" in route.request.url:
                    requests.append(data)
                    return await route.fulfill(content_type="text/event-stream", body=
                        'data: '+json.dumps({"choices":[{"delta":{"content":
                            "Décrivez les travaux souhaités pour votre propriété."}}]})+'\n\ndata: [DONE]\n\n')
                return await route.fulfill(json=[])
            await context.route("**/*", intercept)
            page = await context.new_page()
            errors = []
            page.on("pageerror", lambda e: errors.append(str(e)))
            await page.goto(BASE, wait_until="domcontentloaded")
            # Dev-only HUD is absent from the public experience; leave product layout untouched.
            await page.add_style_tag(content='[title="Auth Debug HUD"]{pointer-events:none!important}')
            choices = page.locator(".home-clara-examples button")
            await choices.first.wait_for()
            await page.wait_for_timeout(1600)
            first = await layout(page, True); checks += 1
            await page.locator(".home-clara-main").screenshot(path=str(OUT / f"fixed-{width}.png"))
            await page.reload()
            await page.add_style_tag(content='[title="Auth Debug HUD"]{pointer-events:none!important}')
            await choices.first.wait_for()
            await page.wait_for_timeout(1600)
            await layout(page, True); checks += 1
            await choices.first.click()
            await page.wait_for_timeout(1800)
            await layout(page); checks += 1
            composer = page.locator(".home-clara-textarea")
            await composer.fill("Les travaux concernent mon sous-sol")
            await page.get_by_role("button", name="Envoyer", exact=True).click()
            await page.get_by_text("Décrivez les travaux souhaités pour votre propriété.", exact=True).wait_for()
            await layout(page); checks += 1
            # Chromium cannot open the Android IME; resize + focus exercises the actual viewport hook.
            if width != 1280:
                await composer.focus()
                await page.set_viewport_size({"width":width,"height":430})
                await page.wait_for_timeout(400)
                await layout(page); checks += 1
                scroller = page.locator(".home-clara-conversation > div")
                await scroller.evaluate("e=>e.scrollTop=0")
                await layout(page); checks += 1
                await scroller.evaluate("e=>e.scrollTop=e.scrollHeight")
                await layout(page); checks += 1
                await page.locator(".home-clara-main").screenshot(path=str(OUT / f"keyboard-{width}.png"))
                await page.set_viewport_size({"width":width,"height":height})
                await composer.blur()
                await page.wait_for_timeout(400)
                await layout(page); checks += 1
            assert requests and requests[-1]["context"]["userRole"] == "homeowner"
            if width in [360, 390]:
                await page.evaluate("() => { localStorage.clear(); sessionStorage.clear(); }")
                await page.reload()
                await page.add_style_tag(content='[title="Auth Debug HUD"]{pointer-events:none!important}')
                await page.get_by_role("button", name="Je suis entrepreneur", exact=True).click()
                await page.get_by_role("button", name="Plus d’actions", exact=True).click()
                await page.get_by_role("menuitem", name="Changer de parcours").click()
                await page.get_by_test_id("clara-confirm-switch-homeowner").click()
                await layout(page); checks += 1
                await composer.fill("Mon sous-sol doit être rénové")
                await page.get_by_role("button", name="Envoyer", exact=True).click()
                await page.get_by_text("Décrivez les travaux souhaités pour votre propriété.", exact=True).wait_for()
                assert requests[-1]["context"]["userRole"] == "homeowner"
                await layout(page); checks += 1
                await page.locator(".home-clara-main").screenshot(path=str(OUT / f"role-switch-{width}.png"))
            assert not errors, errors
            print(f"PASS {width}: initial/refresh/real suggestion tap/messages/viewport; first={first['choices'][0]}")
            await context.close()
        await browser.close()
        print(f"PASS {checks} actual DOM layout scenarios; no external requests")

asyncio.run(main())