import * as fs from "fs";
import ExcelJS from "exceljs";

const exchange_rate = 3450;

// --- Load product data from JSON file ---
const rawData = fs.readFileSync("../../data/bagsData.json", "utf-8");
const products = JSON.parse(rawData);

// --- Generate rows for all products ---
const generateRows = (product) => {
  const code = product.itemId;

  const detailsStr = Object.entries(product.details)
    .map(([key, val]) => `"${key}": "${val}"`)
    .join(", ");

  const parsedColorAndPrices = product.colorAndPrice.map((entry) => {
    const colorMatch = entry.match(/color: (.*?),/);

    return {
      color: colorMatch ? colorMatch[1].replace(/_/g, " ") : "Unknown",
    };
  });

  const colors = parsedColorAndPrices.map((p) => p.color).join(", ");

  return [
    {
      id: `__export__.${code}`,
      name: product.name,
      default_code: code,
      "Sales Price": 0,
      product_x_studio_sgd_discounted_price: 0,
      product_x_studio_sgd_1: 0,
      product_x_studio_fx_rate: exchange_rate,
      product_x_studio_web_org_url: product.url,
      image: "",
      product_x_studio_product_details_1: detailsStr,
      Type: "Goods",
      categ_id: "All / Women / Bags",
      public_categ_ids: "All/Women/Bags,Charles&Keith",
      is_published: true,
      website_id: "DOUBLE4",
      "attribute_line_ids/attribute_id/id": "__export__.xColor",
      "attribute_line_ids/values_ids": colors,
    },
    {
      "attribute_line_ids/attribute_id/id": "__export__.xSize",
      "attribute_line_ids/values_ids": product.size,
    },
  ];
};

// --- Export to Excel ---
async function exportToExcel() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Products");

  const allRows = products.flatMap(generateRows);
  const headers = Object.keys(allRows[0]);

  sheet.columns = headers.map((header) => ({ header, key: header }));
  allRows.forEach((row) => sheet.addRow(row));

  await workbook.xlsx.writeFile("exported_products.xlsx");
  console.log("✅ Excel file created: exported_products.xlsx");
}

exportToExcel();
