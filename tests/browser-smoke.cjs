const {chromium}=require("playwright");
const assert=require("node:assert/strict");
(async()=>{
  const browser=await chromium.launch({headless:true});
  try{
    for(const viewport of [{width:390,height:844},{width:768,height:1024},{width:1440,height:900}]){
      const context=await browser.newContext({viewport,reducedMotion:"reduce"});
      const page=await context.newPage(),errors=[];
      page.on("pageerror",e=>errors.push(e.message));
      await page.goto("http://127.0.0.1:8000/",{waitUntil:"load"});
      await page.waitForSelector("#reminder-upcoming");
      await page.waitForSelector("#report-metrics .report-metric");
      const layout=await page.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
      assert.ok(layout.scroll<=layout.width+3,"Horizontal overflow "+viewport.width+"px "+JSON.stringify(layout));
      await page.locator("#reminder-upcoming").uncheck();
      assert.equal(await page.locator("#reminder-lead").isDisabled(),true);
      await page.locator("#reminder-upcoming").check();
      await page.locator("#reminder-lead").selectOption("5");
      await page.locator("#reminder-quiet").check();
      assert.equal(await page.locator("#reminder-quiet-range").isVisible(),true);
      await page.locator("#reminder-preview").click();
      await page.locator("#new-block-top").click();
      assert.equal(await page.locator("#block-dialog").isVisible(),true);
      await page.locator("#dialog-close").click();
      await page.locator("#template-gallery .template-card").first().locator("button").first().click();
      assert.equal(await page.locator("#template-dialog").isVisible(),true);
      await page.locator("#template-dialog-close").click();
      if(viewport.width<=768){
        await page.locator("#mobile-menu").click();
        assert.equal(await page.locator("#mobile-menu").getAttribute("aria-expanded"),"true");
        await page.locator(".sidebar .side-link[href='#reminders']").click();
        assert.equal(await page.locator("#mobile-menu").getAttribute("aria-expanded"),"false");
      }
      await page.locator("#v2-tasks").fill("Build login feature | 45 | code");
      await page.locator("#v2-preview").click();
      assert.equal(await page.locator("#v2-apply").isEnabled(),true);
      await page.locator("#account-open").click();
      assert.equal(await page.locator("#v2-account-dialog").isVisible(),true);
      assert.equal(await page.locator("#v2-auth-form").isVisible(),false);
      await page.locator("#v2-account-close").click();
      assert.deepEqual(errors,[],"Browser JS errors "+viewport.width+"px");
      console.log("PASS "+viewport.width+"px");
      await context.close();
    }
  }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
