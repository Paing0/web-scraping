import scrapeBags from "./charleskeith/scrapeBags.js";
import scrapeShoes from "./charleskeith/scrapeShoes.js";
import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const app = express();

app.use(cors());

app.use(express.json());
app.use(express.raw());

app.post("/", async (req, res) => {
  const { url, exchangeRate } = req.body;

  if (!url) {
    return res
      .status(400)
      .json({ success: false, error: "Missing URL parameter" });
  }

  try {
    const result = await handleScraping(url, exchangeRate);

    console.log("result " + result.filePath);

    if (!result.success) {
      return res.status(500).json({ success: false, error: result.error });
    }

    // Send file with proper error handling
    res.sendFile(result.filePath, (err) => {
      if (err) {
        console.error("Error sending file:", err);
        if (!res.headersSent) {
          return res
            .status(500)
            .json({ success: false, error: "Failed to send file" });
        }
      }
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    // if (!res.headersSent) {
    //   res.status(500).json({ success: false, error: error.message });
    // }
  }
});

const handleScraping = async (url, exchangeRate) => {
  let filePath;

  try {
    if (url.includes("bags")) {
      try {
        await scrapeBags(url, exchangeRate);

        // await bagToXlsx(exchangeRate);
        console.log("scrapeBags completed");
      } catch (err) {
        console.error("Error in scrapeBags:", err);
        return { success: false, error: "Failed to scrape bags" };
      }
    }

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const pathName = path.join(__dirname, "/data/xlsx/products.xlsx");

    filePath = path.resolve(pathName);

    if (url.includes("shoes")) {
      await scrapeShoes(url);
      filePath = path.resolve("src/data/json/shoesData.json");
    }

    if (!fs.existsSync(filePath)) {
      throw new Error("Scraping completed, but file not found.");
    }

    console.log("Scraping finished successfully.");
    return { success: true, filePath };
  } catch (error) {
    console.error("Scraping failed:", error.message);
    return { success: false, error: error.message };
  }
};

app.listen(3000, () => console.log("Server running on 3000"));

