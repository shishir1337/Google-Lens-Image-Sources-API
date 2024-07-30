const puppeteer = require('puppeteer');
const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

app.use(bodyParser.json());

// Utility function to delay execution
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Launch a new Puppeteer browser instance
const launchBrowser = async () => {
    console.log("Launching browser...");
    console.time("Browser Launch Time");
    const browser = await puppeteer.launch({ headless: false });
    console.timeEnd("Browser Launch Time");
    return browser;
};

// Open a new page in the browser
const openPage = async browser => {
    console.log("Opening new page...");
    console.time("Page Open Time");
    const page = await browser.newPage();
    console.timeEnd("Page Open Time");
    return page;
};

// Navigate to a given URL
const navigateToUrl = async (page, url) => {
    console.log(`Navigating to URL: ${url}`);
    console.time("Navigation Time");
    await page.goto(url, { waitUntil: 'networkidle2' });
    console.timeEnd("Navigation Time");
};

// Wait for search results to load
const waitForResults = async page => {
    console.log("Waiting for results to load...");
    console.time("Results Load Time");
    try {
        await page.waitForSelector('div.LHkehc[role="button"] div.WF9wo', { timeout: 60000 });
    } catch (error) {
        console.error("Results did not load in time:", error);
        throw new Error("Results did not load in time");
    }
    console.timeEnd("Results Load Time");
};

// Click the 'Find image source' button
const clickExactMatchesButton = async page => {
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
        throw new Error("Error clicking the 'Find image source' button");
    }

    console.timeEnd("Click 'Find image source' Button Time");
};

// Click 'More exact matches' button if available
const loadMoreExactMatches = async page => {
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
};

// Extract related sources from the search results
const extractRelatedSources = async page => {
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
};

// Upload image and get sources from Google Lens
const uploadImageAndGetSources = async imageUrl => {
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
        throw new Error('Error during image processing');
    } finally {
        console.log("Closing browser...");
        console.time("Browser Close Time");
        await browser.close();
        console.timeEnd("Browser Close Time");
    }
};

// Express API endpoint
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
