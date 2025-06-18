import puppeteer from "puppeteer";
import { autoScroll, extractProductData } from "./index.js";
import fs from "fs";
import axios from "axios";
import * as cheerio from "cheerio";

const scrapeBags = async (url) => {
  console.log("Scraping started");
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
  );

  await page.goto(url, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  await autoScroll(page);

  const productData = await extractProductData(page);

  const extractTotalProductCount = async () => {
    return await page.evaluate(() => {
      const totalProductCountElement = document.querySelector(
        ".js-product_search_result"
      );
      return Number(totalProductCountElement?.getAttribute("data-count"));
    });
  };

  const totalProductsCount = await extractTotalProductCount();
  console.log(productData.length);
  console.log(totalProductsCount);

  // check if fetched products is equal to total products
  if (productData.length !== totalProductsCount) {
    await browser.close();
    throw new Error("Not all products are fetched. Please retry again.");
  }

  // fs.writeFileSync(
  //   "src/data/status.json",
  //   JSON.stringify(productData, null, 2),
  //   "utf-8"
  // );
  const filterOutOfStockProducts = (productData) => {
    return productData.filter((product) => product.status !== "Out of Stock");
  };

  const filteredProductData = filterOutOfStockProducts(productData);

  console.log(filteredProductData.length);

  // cleanup data
  const mergedProducts = [];
  filteredProductData.map((item, index) => {
    // variantParts == Noir - S[color] - [size];
    const [color, size] = item.item_variant.split("-");
    const price = item.price;

    const extractCode = (str) => {
      const match = str.match(/.*-(\d{8}(?:-\d+)?)/);
      return match ? match[1] : null;
    };
    const itemCode = extractCode(item.item_id);

    const existingProduct = mergedProducts.find((product) => {
      const productCode = extractCode(product.itemId);
      return productCode === itemCode;
    });

    const entry = {
      color: color.trim(),
      price,
      url: item.item_url,
      imagesUrls: item.images,
    };

    if (existingProduct) {
      // if (!existingProduct.size.includes(size)) {
      //   existingProduct.size.push(size);
      // }

      // if (!existingProduct.url) {
      //   existingProduct.url = item.item_url;
      // }

      if (
        !existingProduct.colorAndPriceAndUrl.some(
          (e) =>
            e.color === entry.color &&
            e.price === entry.price &&
            e.url === entry.url
        )
      ) {
        existingProduct.colorAndPriceAndUrl.push(entry);
      }

      // existingProduct.imagesUrls.push(...imageUrls[index]);
    } else {
      mergedProducts.push({
        id: mergedProducts.length + 1,
        itemId: item.item_id.split("_")[0],
        itemIdWithColor: item.item_id,
        name: item.item_name,
        size: size,
        colorAndPriceAndUrl: [entry],
        // imagesUrls: item.images,
        details: item.details,
      });
    }
  });

  await browser.close();

  // fs.writeFileSync(
  //   "data/productData.json",
  //   JSON.stringify(mergedProducts, null, 2),
  //   "utf-8"
  // );

  const extractProductDetails = async () => {
    try {
      // const urls = mergedProducts.flatMap(
      //   (product) => product.colorAndPriceAndUrl.map((entry) => entry.url),
      //   console.log(productData.colorAndPriceAndUrl)
      // );
      const urls = mergedProducts.map((product) => {
        // Get the first entry in colorAndPriceAndUrl array
        const firstEntry = product.colorAndPriceAndUrl[0];
        return firstEntry ? firstEntry.url : null; // null if empty
      });

      // fs.writeFileSync(
      //   "src/data/urls.json",
      //   JSON.stringify(urls, null, 2),
      //   "utf-8"
      // );
      const responses = await Promise.all(urls.map((url) => axios.get(url)));

      const scrapedData = responses.map((response) => {
        const $ = cheerio.load(response.data);
        const attributes = {};

        // Extract attributes using the first selector
        $(".pdp-product_attributes_item").each((_, item) => {
          const title = $(item)
            .find(".pdp-product_attribute-title")
            .text()
            .trim();
          const value = $(item)
            .find(".pdp-product_attribute-value")
            .text()
            .trim();

          if (title && value) {
            attributes[title] = value;
          }
        });

        // If no attributes found, use fallback selector
        if (Object.keys(attributes).length === 0) {
          const values = [];
          $(".value.content.js-product-details_val:first ul li").each(
            (_, item) => {
              const value = $(item).text().trim();
              if (value) values.push(value);
            }
          );

          if (values.length > 0) {
            attributes["details"] = values;
          }
        }

        return {
          attributes,
        };
      });

      return scrapedData;
    } catch (error) {
      console.error(`Error fetching:`, error.message);
      return null;
    }
  };

  const productDetails = await extractProductDetails();

  // Merge the scraped data with mergedProducts if productDetails exists
  if (productDetails) {
    productDetails.forEach((details, index) => {
      const product = mergedProducts[index];
      if (product) {
        product.details = { ...details.attributes };
      }
    });
  }

  // parse details array into objects
  function parseDetails(detailsArray) {
    const result = {};

    detailsArray.forEach((item) => {
      const trimmed = item.trim();

      if (/material:/i.test(trimmed)) {
        result.material = trimmed.split(":")[1].trim();
      } else if (/closure/i.test(trimmed)) {
        result.closure = trimmed;
      } else if (/strap/i.test(trimmed)) {
        result.strap = trimmed;
      } else if (/depth.*?:/i.test(trimmed)) {
        result.depth = trimmed.split(":")[1].trim() + " cm";
      } else if (/width.*?:/i.test(trimmed)) {
        result.width = trimmed.split(":")[1].trim() + " cm";
      } else if (/height.*?:/i.test(trimmed)) {
        result.height = trimmed.split(":")[1].trim() + " cm";
      } else if (/weight.*?:/i.test(trimmed)) {
        result.weight = trimmed.split(":")[1].trim() + " g";
      } else if (/handle/i.test(trimmed)) {
        result.handle = trimmed;
      } else if (/pouch/i.test(trimmed)) {
        result.pouch = "Comes with pouch";
      } else if (/card holder/i.test(trimmed)) {
        result.cardHolder = "Comes with card holder";
      }
    });

    return result;
  }

  // --- Normalize all product entries ---
  function normalizeProductData(products) {
    return products.map((product) => {
      if (Array.isArray(product.details?.details)) {
        product.details = parseDetails(product.details.details);
      }

      // Add a derived "handle" key if possible
      const handleKeys = Object.keys(product.details).filter((k) =>
        /handle/i.test(k)
      );
      if (!product.details.handle && handleKeys.length) {
        product.details.handle = `${handleKeys[0]}: ${
          product.details[handleKeys[0]]
        }`;
      }

      return product;
    });
  }

  normalizeProductData(mergedProducts);

  fs.writeFileSync(
    "src/data/bagsData.json",
    JSON.stringify(mergedProducts, null, 2),
    "utf-8"
  );

  console.log("Scraping ended");
};

export default scrapeBags;
