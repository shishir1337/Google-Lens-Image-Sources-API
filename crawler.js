const puppeteer = require('puppeteer');
const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

app.use(bodyParser.json());

async function delay(time) {
    return new Promise(resolve => setTimeout(resolve, time));
}

async function launchBrowser() {
    console.log("Launching browser...");
    console.time("Browser Launch Time");
    const browser = await puppeteer.launch({ headless: false });
    console.timeEnd("Browser Launch Time");
    return browser;
}

async function openPage(browser) {
    console.log("Opening new page...");
    console.time("Page Open Time");
    const page = await browser.newPage();
    console.timeEnd("Page Open Time");
    return page;
}

async function navigateToUrl(page, url) {
    console.log(`Navigating to URL: ${url}`);
    console.time("Navigation Time");
    await page.goto(url, { waitUntil: 'networkidle2' });
    console.timeEnd("Navigation Time");
}

async function waitForResults(page) {
    console.log("Waiting for results to load...");
    console.time("Results Load Time");
    await page.waitForSelector('div.LHkehc[role="button"] div.WF9wo', { timeout: 60000 });
    console.timeEnd("Results Load Time");
}

async function clickExactMatchesButton(page) {
    console.log("Clicking 'Find image source' button...");
    console.time("Click 'Find image source' Button Time");

    const buttonSelector = 'button.VfPpkd-LgbsSe.VfPpkd-LgbsSe-OWXEXe-INsAgc';
    
    try {
        await page.waitForSelector(buttonSelector, { visible: true, timeout: 60000 });
        const button = await page.$(buttonSelector);
        if (button) {
            await button.click();
            console.log("Clicked 'Find image source' button.");
        } else {
            console.log("Button not found.");
        }
    } catch (error) {
        console.error("Error waiting for the button:", error);
    }

    console.timeEnd("Click 'Find image source' Button Time");
}

async function loadMoreExactMatches(page) {
    const moreButtonSelector = 'div.rqhI4d button.VfPpkd-LgbsSe';
    let moreButton = await page.$(moreButtonSelector);
    while (moreButton !== null) {
        console.log("Clicking 'More exact matches' button...");
        await page.click(moreButtonSelector);
        console.log("Waiting for more exact matches to load...");
        await delay(3000); // Adjust timeout as needed
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); // Scroll to the bottom
        moreButton = await page.$(moreButtonSelector);
    }
}

async function extractRelatedSources(page) {
    console.log("Extracting related sources...");
    console.time("Extraction Time");
    const relatedSources = await page.evaluate(() => {
        const sourceList = [];
        const elements = document.querySelectorAll('li.anSuc a.GZrdsf');

        elements.forEach((element, index) => {
            const title = element.querySelector('.iJmjmd') ? element.querySelector('.iJmjmd').innerText.trim() : null;
            const source = element.querySelector('.ShWW9') ? element.querySelector('.ShWW9').innerText.trim() : null;
            const sourceLogo = element.querySelector('.RpIXBb img') ? element.querySelector('.RpIXBb img').src : null;
            const link = element.href;
            const thumbnail = element.querySelector('.GqnSBe img') ? element.querySelector('.GqnSBe img').src : null;
            const dimensions = element.querySelector('.QJLLAc') ? element.querySelector('.QJLLAc').innerText.trim() : null;

            let actualImageWidth = null;
            let actualImageHeight = null;
            if (dimensions) {
                const dimensionParts = dimensions.split('x');
                if (dimensionParts.length === 2) {
                    actualImageWidth = parseInt(dimensionParts[0], 10);
                    actualImageHeight = parseInt(dimensionParts[1], 10);
                }
            }

            sourceList.push({
                position: index + 1,
                title: title,
                source: source,
                source_logo: sourceLogo,
                link: link,
                thumbnail: thumbnail,
                actual_image_width: actualImageWidth,
                actual_image_height: actualImageHeight
            });
        });

        return sourceList;
    });
    console.timeEnd("Extraction Time");
    return relatedSources;
}

async function uploadImageAndGetSources(imageUrl) {
    const browser = await launchBrowser();
    const page = await openPage(browser);

    try {
        const lensUrl = 'https://lens.google.com/uploadbyurl?url=' + encodeURIComponent(imageUrl);
        await navigateToUrl(page, lensUrl);
        await waitForResults(page);
        await clickExactMatchesButton(page);
        await delay(3000); // Wait for the results to load
        await loadMoreExactMatches(page);
        const relatedSources = await extractRelatedSources(page);
        
        return { "image_sources": relatedSources };
    } catch (error) {
        console.error('Error during image processing:', error);
        throw error;
    } finally {
        console.log("Closing browser...");
        console.time("Browser Close Time");
        await browser.close();
        console.timeEnd("Browser Close Time");
    }
}

// Express API
app.post('/api/upload', async (req, res) => {
    const { imageUrl } = req.body;
    if (!imageUrl) {
        return res.status(400).json({ error: 'No image URL provided' });
    }
    
    try {
        const sources = await uploadImageAndGetSources(imageUrl);
        res.json(sources);
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while processing the image' });
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
