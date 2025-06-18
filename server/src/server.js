import scrapeBags from "./charleskeith/scrapeBags.js";
import scrapeShoes from "./charleskeith/scrapeShoes.js";
import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.raw());

app.post("/", async (req, res) => {
  const url = req.body.url;

  if (!url) {
    return res
      .status(400)
      .json({ success: false, error: "Missing URL parameter" });
  }

  try {
    const result = await handleScraping(url);

    console.log(result.filePath);

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
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
});

const handleScraping = async (url) => {
  let filePath;

  try {
    if (url.includes("bags")) {
      try {
        await scrapeBags(url);
        console.log("scrapeBags completed");
      } catch (err) {
        console.error("Error in scrapeBags:", err);
        return { success: false, error: "Failed to scrape bags" };
      }
    }
    // filePath = path.resolve("src/charleskeith/xlsx/exported_products.xlsx");
    filePath = path.resolve("src/data/bagsData.json");

    if (url.includes("shoes")) {
      await scrapeShoes(url);
      filePath = path.resolve("src/data/shoesData.json");
    }

    console.log(filePath);
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

