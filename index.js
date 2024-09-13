const puppeteer = require('puppeteer');
const { Cluster } = require('puppeteer-cluster');
const express = require('express');
const bodyParser = require('body-parser');
const rateLimit = require('express-rate-limit');
const NodeCache = require('node-cache');
const Joi = require('joi');
const cors = require('cors'); // Import the cors package

const app = express();
const port = process.env.PORT || 3000;

// Initialize cache with a TTL of 1 hour
const cache = new NodeCache({ stdTTL: 3600 });

// Configure rate limiter: allow up to 10 requests per minute per IP
const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10,
    message: "Too many requests from this IP, please try again later.",
});

// Apply middleware
app.use(cors()); // Enable CORS for all origins
app.use(bodyParser.json());
app.use(limiter); // Apply rate limiting

// Validate request body
const validateRequest = (req) => {
    const schema = Joi.object({
        imageUrl: Joi.string().uri().required(),
        no_cache: Joi.boolean() // Optional boolean parameter
    });
    return schema.validate(req.body);
};

// Utility function to delay execution
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Initialize Puppeteer Cluster
const initCluster = async () => {
    const cluster = await Cluster.launch({
        concurrency: Cluster.CONCURRENCY_CONTEXT,
        maxConcurrency: 5,
        puppeteerOptions: {
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        }
    });

    await cluster.task(async ({ page, data: imageUrl }) => {
        const lensUrl = 'https://lens.google.com/uploadbyurl?url=' + encodeURIComponent(imageUrl);

        await page.goto(lensUrl, { waitUntil: 'networkidle2' });
        await waitForResults(page);
        await clickExactMatchesButton(page);
        await delay(3000); // Wait for the results to load
        await loadMoreExactMatches(page);
        const relatedSources = await extractRelatedSources(page);

        return relatedSources;
    });

    return cluster;
};

let cluster;

// Wait for search results to load
const waitForResults = async (page) => {
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
const clickExactMatchesButton = async (page) => {
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
const loadMoreExactMatches = async (page) => {
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
const extractRelatedSources = async (page) => {
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
const uploadImageAndGetSources = async (imageUrl, noCache = false) => {
    if (noCache) {
        console.log("Bypassing cache...");
        // Always fetch new results when noCache is true
        try {
            const relatedSources = await cluster.execute(imageUrl);
            const result = { "image_sources": relatedSources };
            return result;
        } catch (error) {
            console.error('Error during image processing:', error);
            throw new Error('Error during image processing');
        }
    }

    const cachedResult = cache.get(imageUrl);
    if (cachedResult) {
        console.log("Returning cached result...");
        return cachedResult;
    }

    try {
        const relatedSources = await cluster.execute(imageUrl);
        const result = { "image_sources": relatedSources };
        cache.set(imageUrl, result);
        return result;
    } catch (error) {
        console.error('Error during image processing:', error);
        throw new Error('Error during image processing');
    }
};

// Centralized error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong' });
});

// Express API endpoint
app.post('/api/upload', async (req, res) => {
    const { error } = validateRequest(req);
    if (error) {
        return res.status(400).json({ error: error.details[0].message });
    }

    const { imageUrl, no_cache } = req.body; // Extract no_cache from request body
    
    try {
        const sources = await uploadImageAndGetSources(imageUrl, no_cache);
        res.json(sources);
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while processing the image' });
    }
});

// Initialize the cluster and start the server
initCluster().then(initializedCluster => {
    cluster = initializedCluster;
    app.listen(port, () => {
        console.log(`Server is running on http://localhost:${port}`);
    });
}).catch(err => {
    console.error('Failed to initialize Puppeteer Cluster:', err);
});
