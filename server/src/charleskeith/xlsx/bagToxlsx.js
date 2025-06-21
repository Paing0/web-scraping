import * as fs from "fs";
import ExcelJS from "exceljs";

const exchange_rate = 3450;
const workbook = new ExcelJS.Workbook();

// --- Load product data from JSON file ---
const rawData = fs.readFileSync("../../data/json/bagsData.json", "utf-8");
const products = JSON.parse(rawData);

const generateProductSheet = () => {
  const sheet = workbook.addWorksheet("product");

  const generateRows = (product) => {
    const code = product.itemId;

    const detailsStr = Object.entries(product.details)
      .map(([key, val]) => `"${key}": "${val}"`)
      .join(", ");

    const colors = product.colorAndPriceAndUrlAndImageUrls
      .map((entry) => entry.color.replace(/_/g, " "))
      .join(", ");

    return [
      {
        id: `__export__.${code}`,
        name: product.name,
        default_code: code,
        "Sales Price": 0,
        product_x_studio_sgd_discounted_price: 0,
        product_x_studio_sgd_1: 0,
        product_x_studio_fx_rate: exchange_rate,
        product_x_studio_web_org_url:
          product.colorAndPriceAndUrlAndImageUrls[0].url,
        image: product.colorAndPriceAndUrlAndImageUrls[0].imagesUrls[0],
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

  const allRows = products.flatMap(generateRows);
  const headers = Object.keys(allRows[0]);

  sheet.columns = headers.map((header) => ({ header, key: header }));
  allRows.forEach((row) => sheet.addRow(row));

  // Format header row
  const headerRow = sheet.getRow(1);
  headerRow.height = 24;
  headerRow.font = { name: "Arial", size: 12, bold: true };
  sheet.eachRow((row) => {
    row.font = { name: "Arial" };
  });
  sheet.columns.forEach((col) => {
    col.width = 20;
  });
};

const generateProductAttributeValueSheet = () => {
  const sheet = workbook.addWorksheet("product_attributes_value");
  const colorSet = new Set();

  products.forEach((product) => {
    product.colorAndPriceAndUrlAndImageUrls?.forEach((entry) => {
      if (entry.color) {
        colorSet.add(entry.color.replace(/_/g, " "));
      }
    });
  });

  const rows = Array.from(colorSet).map((color) => ({
    id: `__export__.color_${color.replace(/\s+/g, "_")}`,
    "attribute_id/id": "__export__.xColor",
    name: color,
  }));

  sheet.columns = [
    { header: "id", key: "id" },
    { header: "attribute_id/id", key: "attribute_id/id" },
    { header: "name", key: "name" },
  ];

  rows.forEach((row) => sheet.addRow(row));

  const headerRow = sheet.getRow(1);
  headerRow.height = 24;
  headerRow.font = { name: "Arial", size: 12, bold: true };
  sheet.eachRow((row) => {
    row.font = { name: "Arial" };
  });

  sheet.columns.forEach((col) => {
    col.width = 20;
  });
};

const generateProductVariantSheet = () => {
  const sheet = workbook.addWorksheet("product_variant");

  const headers = [
    "id",
    "product_tmpl_id/id",
    "product_template_variant_value_ids",
    "product_tmpl_id",
    "image_1920",
    "product_variant_image_ids/sequence",
    "product_variant_image_ids/image_1920",
    "product_variant_image_ids/name",
    "Extra_Price",
    "product.x_studio_sgd_discounted_price",
    "product.x_studio_sgd_1",
    "product.x_studio_fx_rate",
  ];

  sheet.addRow(headers);

  products.forEach((product) => {
    const productTmplId = `__export__.${product.itemId}`;

    product.colorAndPriceAndUrlAndImageUrls.forEach((variant) => {
      const { color, imagesUrls, price } = variant;
      const numericPrice = parseFloat(price.replace(/[^\d.]/g, ""));
      const discount = 10;
      const discountedPrice = numericPrice * (1 - discount / 100);
      const mmk = discountedPrice * exchange_rate;
      const firstImage = imagesUrls[0];

      imagesUrls.forEach((imgUrl, index) => {
        const isFirstImage = index === 0;
        sheet.addRow([
          isFirstImage ? product.itemIdWithColor : "",
          isFirstImage ? productTmplId : "",
          isFirstImage ? `Color: ${color}` : "",
          isFirstImage ? product.name : "",
          isFirstImage ? firstImage : "",
          index + 1,
          imgUrl,
          "img" + (index + 1),
          isFirstImage ? Math.round(mmk) : "",
          isFirstImage ? discountedPrice : "",
          isFirstImage ? numericPrice : "",
          isFirstImage ? exchange_rate : "",
        ]);
      });
    });
  });

  const headerRow = sheet.getRow(1);
  headerRow.height = 24;
  headerRow.font = { name: "Arial", size: 12, bold: true };
  sheet.eachRow((row) => {
    row.font = { name: "Arial" };
  });
  sheet.columns.forEach((col) => {
    col.width = 20;
  });
};

// Call all functions and save in one file
(async () => {
  generateProductSheet();
  generateProductAttributeValueSheet();
  generateProductVariantSheet();

  await workbook.xlsx.writeFile("../../data/xlsx/bags.xlsx");
  console.log("✅ Excel file created: bags.xlsx");
})();
