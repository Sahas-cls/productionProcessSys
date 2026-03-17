const ExcelJS = require("exceljs");

/**
 * Process Excel file and extract operations data
 * @param {string} filePath - Path to the Excel file
 * @returns {Promise<Object>} Processing result
 */
async function processExcelFile(filePath) {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const sheet = workbook.getWorksheet("OB");

    if (!sheet) {
      throw new Error("OB sheet not found in the Excel file");
    }

    // Extract Style ID from cell C6
    const styleIdCell = sheet.getCell("C6");
    const styleId = (styleIdCell.value || "").toString().trim();

    const operations = [];
    let currentMainOperation = null;

    let rowCount = 0;
    let processedCount = 0;

    sheet.eachRow((row, rowNumber) => {
      rowCount++;

      if (rowNumber < 12) return;

      const operationCell = row.getCell(3);
      const operationValue = (operationCell.value || "").toString().trim();

      const opNumberCell = row.getCell(2);
      const opNumber = (opNumberCell.value || "").toString().trim();

      const mcTypeCell = row.getCell(5);
      const mcType = (mcTypeCell.value || "").toString().trim();

      const smvCell = row.getCell(7);
      const smvValue = smvCell.value;
      let smv = 0;

      if (smvValue !== null && smvValue !== undefined && smvValue !== "") {
        const parsed = parseFloat(smvValue);
        smv = isNaN(parsed) ? 0 : parseFloat(parsed.toFixed(3));
      }

      if (!operationValue) return;

      processedCount++;

      // Check formatting criteria for main operation
      const isBold = operationCell.font?.bold || false;
      const alignment = operationCell.alignment?.horizontal || "";
      const isCentered = alignment === "center";

      // Check if cell has any fill color (any color, not just specific ones)
      const hasFillColor = !!(
        operationCell.fill &&
        operationCell.fill.type === "pattern" &&
        operationCell.fill.fgColor
      );

      // Check for empty row above (as an additional hint, not mandatory)
      const isEmptyRowAbove = isRowFlexiblyEmpty(sheet, rowNumber - 1);

      // MAIN OPERATION CRITERIA:
      // 1. Must be bold (mandatory)
      // 2. Must be horizontally centered (mandatory)
      // 3. Must have some fill color (mandatory)
      // 4. Row above is empty (optional hint, used for logging/debugging)
      const isMainOperation = isBold && isCentered && hasFillColor;

      if (isMainOperation) {
        currentMainOperation = {
          MainOperation: operationValue,
          SubOperations: [],
        };
        operations.push(currentMainOperation);

        // Enhanced logging with all criteria info
        console.log(
          `✅ Detected Main Operation: "${operationValue}" - Row ${rowNumber} ` +
            `(Bold: ${isBold}, Centered: ${isCentered}, Has Color: ${hasFillColor}, ` +
            `Empty Above: ${isEmptyRowAbove})`,
        );
      }
      // Sub operation detection - only if not a main operation
      else if (currentMainOperation && isValidOperationNumber(opNumber)) {
        const subOp = {
          OperationNo: opNumber.toString().trim().toUpperCase(),
          Operation: operationValue,
          "M/C Type": mcType,
          "MC SMV": smv,
        };
        currentMainOperation.SubOperations.push(subOp);
      }
    });

    console.log(`📊 Processed ${processedCount} data rows from Excel file`);
    console.log(`🎯 Found ${operations.length} main operations total`);
    console.log(`🏷️ Style ID: ${styleId}`);

    return {
      success: true,
      data: {
        styleId: styleId,
        operations: operations,
      },
      message: `Successfully extracted Style ID "${styleId}" and ${
        operations.length
      } main operations with ${operations.reduce(
        (sum, op) => sum + op.SubOperations.length,
        0,
      )} sub-operations`,
      metadata: {
        totalRowsProcessed: processedCount,
        totalRowsInSheet: rowCount,
        extractionTimestamp: new Date().toISOString(),
        styleId: styleId,
      },
    };
  } catch (error) {
    console.error("❌ Excel processing error:", error.message);
    return {
      success: false,
      error: error.message,
      data: {
        styleId: "",
        operations: [],
      },
    };
  }
}

// Helper function to check if a row is mostly empty
function isRowFlexiblyEmpty(sheet, rowNumber) {
  if (rowNumber < 1) return true;

  try {
    const row = sheet.getRow(rowNumber);
    let dataCount = 0;

    // Check key columns for any meaningful data
    const keyColumns = [2, 3, 5, 7]; // B, C, E, G

    for (let col of keyColumns) {
      const cell = row.getCell(col);
      const value = (cell.value || "").toString().trim();
      if (value && value.length > 0) {
        dataCount++;
      }
    }

    // Consider row empty if no key columns have data
    return dataCount === 0;
  } catch (error) {
    return true;
  }
}

// Check if value is a valid operation number
function isValidOperationNumber(value) {
  if (!value) return false;

  // Accept numbers OR alphanumeric codes like F1, A12, OP3
  // Also check if it's a valid number (including decimals)
  if (!isNaN(value) && value.toString().trim() !== "") {
    return true;
  }

  // Check for alphanumeric patterns
  return /^[A-Za-z0-9\-\.]+$/.test(value.toString().trim());
}

// Optional: Enhanced version with color information in logging
function getFillColorInfo(cell) {
  if (cell.fill && cell.fill.type === "pattern" && cell.fill.fgColor) {
    const color = cell.fill.fgColor;
    if (color.argb) {
      return color.argb;
    } else if (color.rgb) {
      return color.rgb;
    } else if (color.theme) {
      return `theme:${color.theme}`;
    }
  }
  return "none";
}

module.exports = { processExcelFile };
