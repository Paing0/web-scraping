import { setTimeout } from "node:timers/promises";

export const autoScroll = async (page) => {
  let previousHeight;
  while (true) {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await setTimeout(10000);
    const currentHeight = await page.evaluate(() => document.body.scrollHeight);
    if (currentHeight === previousHeight) break;
    previousHeight = currentHeight;
  }
};

export const extractProductData = async (page) => {
  return await page.evaluate(() => {
    const statuses = Array.from(
      document.querySelectorAll(".product_tile-stock_status")
    );
    return Array.from(
      document.querySelectorAll(".js-product-tile-wrapper")
    ).map((element, index) => {
      const dataGa = element.getAttribute("data-ga");
      const statusElement = statuses[index];
      // const badgeElement = element.querySelector(".badge");
      const priceElement = element.querySelector(".price-wrap .sales");
      console.log(statusElement);

      // Get images specific to this product tile
      const imageSources = Array.from(
        element.querySelectorAll("picture source")
      )
        .filter(
          (source) => source.getAttribute("media") === "(min-width: 1280px)"
        )
        .map((source) => source.getAttribute("srcset"));

      return {
        ...JSON.parse(dataGa),
        status: (() => {
          const rawStatus = statusElement
            ? statusElement.textContent.trim().toLowerCase()
            : "";
          if (!rawStatus) return "Available";

          if (rawStatus.includes("notify")) return "Out of Stock";
        })(),
        // badge: badgeElement ? badgeElement.textContent.trim() : null,
        price: priceElement ? priceElement.textContent.trim() : null,
        images: (() => {
          if (imageSources.length === 1) {
            return [imageSources[0]];
          }
          return [
            imageSources.length > 2 ? imageSources[1] : null,
            imageSources.length > 3 ? imageSources[2] : null,
            imageSources.length > 4 ? imageSources[3] : null,
          ].filter(Boolean); // remove nulls
        })(),
      };
    });
  });
};
