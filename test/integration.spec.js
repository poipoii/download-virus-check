let puppeteer = require('puppeteer');

let browser = null;
let page = null;
let id = null;

describe('UI', () => {
  let pageOptions = {
    waitUntil: 'networkidle2',
    timeout: 10000
  };

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: false,
      args: [
        '--disable-extensions-except=./',
        '--load-extension=./',
      ]
    });
    page = await browser.newPage();
    await page.setViewport({
      width: 1280,
      height: 720
    });
    jest.setTimeout(30000);
  });

  afterAll(async () => {
    await browser.close();
  });

  test('Homepage', async () => {
    await page.goto('chrome://extensions');
    // id = 'pieaghipemiiilldihmcmomkdighhomb';
    id = await page.evaluate(() => {
      document.querySelector("body > extensions-manager").shadowRoot.querySelector("#items-list").shadowRoot.querySelector("extensions-item").shadowRoot.querySelector("#detailsButton").click();
      return document.location.href.substring(document.location.href.indexOf('=') + 1);
    });
    expect(id).not.toBe(null);
  });

  test('Options', async () => {
    await page.goto('chrome-extension://' + id + '/options/index.html', pageOptions);
    await page.waitFor(1000);
    var positives = await page.evaluate(() => {
      return document.querySelector('#positives').value;
    });
    expect(positives).toEqual('3');
    var whitelist = await page.evaluate(() => {
      return document.querySelector('#whitelist').value;
    });
    expect(whitelist).toEqual('audio, video, text/plain');
    var apikey = await page.evaluate(() => {
      return document.querySelector('#apikey').value;
    });
    expect(apikey).toEqual('');
  });

  test('VirusTotal', async () => {
    await page.goto('https://www.eicar.org/?page_id=3950', pageOptions);
    await page.evaluate(() => {
      var a = document.createElement('a');
      a.href = 'https://secure.eicar.org/eicar.com.txt';
      a.click();
    });
    await page.waitFor(5000);

    var pages = await browser.pages();
    var virustotalReport = false;
    for (const tab of pages) {
      let url = tab.url();
      if (url.startsWith('https://www.virustotal.com/gui') && url.endsWith('/detection')) {
        virustotalReport = true;
      }
    }
    expect(virustotalReport).toEqual(true);
  });
});
