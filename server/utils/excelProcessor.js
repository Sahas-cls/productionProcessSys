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

    const operations = [];
    let currentMainOperation = null;

    let rowCount = 0;
    let processedCount = 0;

    sheet.eachRow((row, rowNumber) => {
      rowCount++;

      // Skip header rows
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

      // **IMPROVED: Detect main operations by formatting, not just hardcoded list**
      const isBold = operationCell.font?.bold || false;
      const alignment = operationCell.alignment?.horizontal || "";
      const isUpper = operationValue === operationValue.toUpperCase();
      const hasNoOperationNumber = !opNumber || isNaN(opNumber);

      // Check if this row is mostly empty (indicating a section break)
      const isEmptyRowAbove = isRowMostlyEmpty(sheet, rowNumber - 1);

      // **NEW LOGIC: Detect main operations by formatting**
      const isMainOperation =
        isBold &&
        isUpper &&
        alignment === "center" &&
        hasNoOperationNumber &&
        isEmptyRowAbove;

      if (isMainOperation) {
        currentMainOperation = {
          MainOperation: operationValue,
          SubOperations: [],
        };
        operations.push(currentMainOperation);
        console.log(
          `✅ Detected Main Operation: "${operationValue}" - Row ${rowNumber}`
        );
      }
      // Sub operation detection
      else if (currentMainOperation && opNumber && !isNaN(opNumber)) {
        const subOp = {
          OperationNo: opNumber.toString(),
          Operation: operationValue,
          "M/C Type": mcType,
          "MC SMV": smv,
        };
        currentMainOperation.SubOperations.push(subOp);
      }
    });

    console.log(`📊 Processed ${processedCount} data rows from Excel file`);
    console.log(`🎯 Found ${operations.length} main operations total`);

    return {
      success: true,
      data: operations,
      message: `Successfully extracted ${
        operations.length
      } main operations with ${operations.reduce(
        (sum, op) => sum + op.SubOperations.length,
        0
      )} sub-operations`,
      metadata: {
        totalRowsProcessed: processedCount,
        totalRowsInSheet: rowCount,
        extractionTimestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error("❌ Excel processing error:", error.message);
    return {
      success: false,
      error: error.message,
      data: [],
    };
  }
}

// Helper function to check if a row is mostly empty
function isRowMostlyEmpty(sheet, rowNumber) {
  if (rowNumber < 1) return true;

  try {
    const row = sheet.getRow(rowNumber);

    // Check key columns that should be empty for a section break
    const keyColumns = [2, 3, 5, 7]; // B, C, E, G

    for (let col of keyColumns) {
      const cell = row.getCell(col);
      const value = (cell.value || "").toString().trim();
      // If any key column has meaningful data, row is not empty
      if (value && value.length > 0) {
        return false;
      }
    }

    return true;
  } catch (error) {
    return true;
  }
}

// Alternative version with more flexible detection
async function processExcelFileAdvanced(filePath) {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const sheet = workbook.getWorksheet("OB");

    if (!sheet) {
      throw new Error("OB sheet not found in the Excel file");
    }

    // Extract Style ID from cell C6
    const styleIdCell = sheet.getCell('C6');
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

      // **FLEXIBLE DETECTION: Multiple criteria for main operations**
      const isBold = operationCell.font?.bold || false;
      const alignment = operationCell.alignment?.horizontal || "";
      const isUpper = operationValue === operationValue.toUpperCase();
      const hasNoOperationNumber = !opNumber || isNaN(opNumber);

      // More flexible empty row detection
      const isEmptyRowAbove = isRowFlexiblyEmpty(sheet, rowNumber - 1);

      // **MULTI-CRITERIA APPROACH:**
      // 1. Must be bold AND uppercase AND no operation number (primary criteria)
      const primaryCriteria = isBold && isUpper && hasNoOperationNumber;

      // 2. Secondary criteria (at least one of these)
      const isCentered = alignment === "center";
      const hasEmptyRowAbove = isEmptyRowAbove;
      const isKnownFormat = isKnownMainOperationFormat(operationValue);

      // Main operation if primary criteria + at least one secondary criteria
      const isMainOperation =
        primaryCriteria && (isCentered || hasEmptyRowAbove || isKnownFormat);

      if (isMainOperation) {
        currentMainOperation = {
          MainOperation: operationValue,
          SubOperations: [],
        };
        operations.push(currentMainOperation);
        console.log(
          `✅ Detected Main Operation: "${operationValue}" - Row ${rowNumber} (Bold: ${isBold}, Upper: ${isUpper}, Centered: ${isCentered}, EmptyAbove: ${isEmptyRowAbove})`
        );
      }
      // Sub operation detection
      else if (currentMainOperation && opNumber && !isNaN(opNumber)) {
        const subOp = {
          OperationNo: opNumber.toString(),
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
        operations: operations
      },
      message: `Successfully extracted Style ID "${styleId}" and ${
        operations.length
      } main operations with ${operations.reduce(
        (sum, op) => sum + op.SubOperations.length,
        0
      )} sub-operations`,
      metadata: {
        totalRowsProcessed: processedCount,
        totalRowsInSheet: rowCount,
        extractionTimestamp: new Date().toISOString(),
        styleId: styleId
      },
    };
  } catch (error) {
    console.error("❌ Excel processing error:", error.message);
    return {
      success: false,
      error: error.message,
      data: {
        styleId: "",
        operations: []
      },
    };
  }
}

// More flexible empty row detection
function isRowFlexiblyEmpty(sheet, rowNumber) {
  if (rowNumber < 1) return true;

  try {
    const row = sheet.getRow(rowNumber);
    let dataCount = 0;

    // Check a wider range of columns
    for (let col = 1; col <= 10; col++) {
      const cell = row.getCell(col);
      const value = (cell.value || "").toString().trim();
      if (value && value.length > 0) {
        dataCount++;
      }
    }

    // Consider row empty if it has very little data
    return dataCount <= 1;
  } catch (error) {
    return true;
  }
}

// Check if the operation value matches known main operation patterns
function isKnownMainOperationFormat(value) {
  const mainOperationPatterns = [
    /FRONT.*PKT/i,
    /SIDE.*PKT/i,
    /MESH.*POCKET/i,
    /BACK/i,
    /ASSEMBLE/i,
    /FRONT.*IN.*SIDE.*COIN.*PKT/i,
  ];

  return mainOperationPatterns.some((pattern) => pattern.test(value));
}

module.exports = { processExcelFile: processExcelFileAdvanced };
