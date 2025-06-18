import fs from "fs/promises";
import ExcelJS from "exceljs";

async function exportProductAttributeValueFromFile() {
  try {
    const data = await fs.readFile("../../data/json/bagsData.json", "utf-8");
    const products = JSON.parse(data);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("product_attributes_value");

    const colorSet = new Set();

    // Collect all unique colors from all products
    products.forEach((product) => {
      product.colorAndPriceAndUrlAndImageUrls?.forEach((entry) => {
        if (entry.color) {
          // Replace underscores with spaces for readability
          const cleanedColor = entry.color.replace(/_/g, " ");
          colorSet.add(cleanedColor);
        }
      });
    });

    const rows = Array.from(colorSet).map((color) => ({
      id: `__export__.color_${color.replace(/\s+/g, "_")}`,
      "attribute_id/id": "__export__.xColor",
      name: color,
    }));

    // Define column headers
    sheet.columns = [
      { header: "id", key: "id" },
      { header: "attribute_id/id", key: "attribute_id/id" },
      { header: "name", key: "name" },
    ];

    // Add rows
    rows.forEach((row) => sheet.addRow(row));

    await workbook.xlsx.writeFile(
      "../../data/xlsx/product_attribute_value.xlsx"
    );
    console.log("✅ File created: product_attribute_value.xlsx");
  } catch (error) {
    console.error("❌ Error reading or processing products.json:", error);
  }
}

exportProductAttributeValueFromFile();
