import puppeteer from "puppeteer";
import { autoScroll, extractProductData } from "./index.js";
import fs from "fs";
import axios from "axios";
import * as cheerio from "cheerio";

const scrapeShoes = async (url) => {
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
      const totalProductCountElement =
        document.querySelector(".js-paging-total");
      return Number(totalProductCountElement.textContent.trim());
    });
  };

  const totalProductsCount = await extractTotalProductCount();

  // check if fetched products is equal to total products
  if (productData.length !== totalProductsCount) {
    await browser.close();
    throw new Error("Not all products are fetched. Please retry again.");
  }

  const filterOutOfStockProducts = (productData) => {
    return productData.filter((product) => product.status !== "Out of Stock");
  };

  const filteredProductData = filterOutOfStockProducts(productData);

  // const extractImages = async () => {
  //   return await page.evaluate(() => {
  //     return Array.from(document.querySelectorAll(".carousel-inner")).map(
  //       (carousel) => {
  //         const sources = Array.from(
  //           carousel.querySelectorAll(
  //             ".tile-image.carousel-item a picture source"
  //           )
  //         )
  //           .filter(
  //             (source) => source.getAttribute("media") === "(min-width: 1280px)"
  //           )
  //           .map((source) => source.getAttribute("srcset"));

  //         // Extract first, second, and last elements
  //         return [
  //           sources.length > 0 ? sources[0] : null,
  //           sources.length > 1 ? sources[1] : null,
  //           sources.length > 0 ? sources[sources.length - 1] : null,
  //         ];
  //       }
  //     );
  //   });
  // };

  // const imageUrls = await extractImages();

  const extractSizes = async () => {
    return await page.evaluate(() => {
      return Array.from(
        document.querySelectorAll(
          ".attribute-values.product_tile-attributes_value.js-size-variations"
        )
      ).map((sizes) => {
        return Array.from(
          sizes.querySelectorAll(
            ".js-attribute-value_link .size-value.swatch-rectangle.swatch-value.selectable"
          )
        ).map((size) => size.textContent.trim());
      });
    });
  };

  const sizes = await extractSizes();

  // cleanup data
  const mergedProducts = [];
  filteredProductData.map((item, index) => {
    const existingProduct = mergedProducts.find(
      (product) => product.name === item.item_name
    );

    if (existingProduct) {
      if (!existingProduct.size.includes(sizes[index])) {
        existingProduct.size.push([sizes[index]]);
      }

      if (!existingProduct.url.includes(item.item_url)) {
        existingProduct.url.push(item.item_url);
      }

      // existingProduct.imagesUrls.push(...imageUrls[index]);
    } else {
      mergedProducts.push({
        id: mergedProducts.length + 1,
        itemId: item.item_id,
        name: item.item_name,
        brand: item.item_brand,
        category: item.item_category,
        category2: item.item_category2,
        category3: item.item_category3,
        color: item.item_variant,
        size: [[...sizes[index]]],
        status: item.status,
        url: [item.item_url],
        price: item.price,
        badge: item.badge,
        // imagesUrls: [...imageUrls[index]],
        details: item.details,
      });
    }
  });

  await browser.close();

  const extractImages = async () => {
    const scrapedData = await Promise.all(
      mergedProducts.map(async (product) => {
        const allImages = [];

        await Promise.all(
          product.url.map(async (url) => {
            try {
              const response = await axios.get(url);
              const $ = cheerio.load(response.data);

              const productImages = [];

              $(".swiper-slide picture").each((_, item) => {
                const imageUrl = $(item).find("img").attr("src");
                if (imageUrl) {
                  productImages.push(imageUrl);
                }
              });

              if (productImages[0]) allImages.push(productImages[0]);
              if (productImages[1]) allImages.push(productImages[1]);
              const lastImage = productImages.at(-1);
              if (
                productImages.length > 2 &&
                lastImage !== productImages[0] &&
                lastImage !== productImages[1]
              ) {
                allImages.push(lastImage);
              }
            } catch (error) {
              console.error("Error fetching", url, error.message);
            }
          })
        );

        return allImages;
      })
    );

    return scrapedData;
  };
  // Usage
  const imagesUrls = await extractImages();

  if (imagesUrls) {
    imagesUrls.forEach((imageUrls, index) => {
      mergedProducts[index].imagesUrls = imageUrls;
    });
  }

  const extractProductDetails = async () => {
    try {
      const urls = mergedProducts.map((product) => product.url[0]);
      const responses = await Promise.all(urls.map((url) => axios.get(url)));

      // Process each response and extract attributes
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

        // If no attributes are found, use an alternative selector
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
          attributes: attributes,
        };
      });

      return scrapedData;
    } catch (error) {
      console.error(`Error fetching:`, error.message);
      return null;
    }
  };

  const productDetails = await extractProductDetails();

  if (productDetails) {
    productDetails.forEach((details, index) => {
      const product = mergedProducts[index];
      if (product) {
        product.details = { ...details.attributes };
      }
    });
  }

  fs.writeFileSync(
    "src/data/json/shoesData.json",
    JSON.stringify(mergedProducts, null, 2),
    "utf-8"
  );

  console.log("Scraping ended");
};

export default scrapeShoes;
