import * as fs from "fs";

function parseDetails(detailsArray) {
  const result = {};
  const notes = [];

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
    } else {
      notes.push(trimmed);
    }
  });

  if (notes.length) result.notes = notes;
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

// --- Main execution ---
const rawData = fs.readFileSync("../data/bagsData.json", "utf-8");
const products = JSON.parse(rawData);

const normalized = normalizeProductData(products);

fs.writeFileSync(
  "normalized-products.json",
  JSON.stringify(normalized, null, 2),
  "utf-8"
);
console.log('✅ Normalized data saved to "normalized-products.json"');
