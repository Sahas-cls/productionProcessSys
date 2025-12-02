const ExcelJS = require("exceljs");

/**
 * Reusable function to extract machine data from Excel file
 * @param {Buffer} fileBuffer - Excel file buffer
 * @param {string} sheetName - Name of the sheet to read (default: 'Machines')
 * @returns {Promise<Array>} - Array of machine objects
 */
async function extractMachineDataFromExcel(fileBuffer, sheetName = "Machines") {
  try {
    const workbook = new ExcelJS.Workbook();

    // Load from buffer - CORRECT WAY
    await workbook.xlsx.load(fileBuffer);

    const worksheet = workbook.getWorksheet(sheetName);
    if (!worksheet) {
      throw new Error(`Sheet "${sheetName}" not found in the Excel file`);
    }

    const machines = [];
    let headers = {};

    // Process each row
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) {
        // Extract headers mapping
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          headers[colNumber] = cell.value?.toString().trim() || "";
        });
        return;
      }

      // Skip empty rows
      if (!row.getCell(1).value) return;

      const rowData = {};

      // Extract all column values
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const header = headers[colNumber];
        if (header) {
          let value = cell.value;

          // Handle date conversion
          if (value instanceof Date) {
            value = value.toISOString().split("T")[0]; // Format as YYYY-MM-DD
          } else if (value && typeof value === "object" && value.text) {
            // Handle rich text cells
            value = value.text;
          } else if (value !== null && value !== undefined) {
            value = value.toString().trim();
          }

          rowData[header] = value || null;
        }
      });

      // Map to database fields
      const machine = mapToDatabaseFormat(rowData);
      if (machine) {
        machines.push(machine);
      }
    });

    console.log(
      `Successfully extracted ${machines.length} machines from Excel`
    );
    return machines;
  } catch (error) {
    console.error("Error reading Excel file:", error);
    throw new Error(`Failed to read Excel file: ${error.message}`);
  }
}

/**
 * Map Excel row data to database format
 * @param {Object} rowData - Raw data from Excel row
 * @returns {Object} - Mapped machine object for database
 */
function mapToDatabaseFormat(rowData) {
  // Required field check
  if (!rowData["Machine serial ID*"]) {
    console.warn("Skipping row - missing Machine serial ID");
    return null;
  }

  const machine = {
    machine_no: rowData["Machine serial ID*"] || null,
    machine_type: rowData["Machine Sub-category"] || null,
    machine_brand: rowData["Brand*"] || null,
    purchase_date: parseDate(rowData["Purchase / Rented date"]),
    service_date: parseDate(rowData["Last preventive service date"]),
    machine_status: rowData["Machine Status*"] || null,

    // Additional fields that might be useful
    machine_name: generateMachineName(rowData),
    machine_location: rowData["Machine Location*"] || null,
    machine_model: rowData["Machine Model No."] || null,
    supplier: null, // Not in Excel, you might want to add this
    breakdown_date: null, // Not in Excel
  };

  return machine;
}

/**
 * Parse date from various Excel formats
 * @param {string} dateString - Date string from Excel
 * @returns {string|null} - Formatted date string or null
 */
function parseDate(dateString) {
  if (!dateString) return null;

  try {
    // Handle different date formats
    let date;

    if (dateString instanceof Date) {
      date = dateString;
    } else if (typeof dateString === "string") {
      // Remove time part if present (e.g., "2020-07-02 05:30 AM")
      const cleanDateString = dateString.split(" ")[0];

      // Try different date formats
      date = new Date(cleanDateString);

      // Handle MM/DD/YYYY format (e.g., "07/10/2025")
      if (isNaN(date.getTime()) && cleanDateString.includes("/")) {
        const [month, day, year] = cleanDateString.split("/");
        date = new Date(
          `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
        );
      }
    } else {
      return null;
    }

    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn(`Invalid date: ${dateString}`);
      return null;
    }

    return date.toISOString().split("T")[0]; // Return as YYYY-MM-DD
  } catch (error) {
    console.warn(`Error parsing date: ${dateString}`, error);
    return null;
  }
}

/**
 * Generate a machine name from available data
 * @param {Object} rowData - Raw data from Excel
 * @returns {string} - Generated machine name
 */
function generateMachineName(rowData) {
  const brand = rowData["Machine Type*"] || "";
  const model = rowData["Machine Model No."] || "";
  const serial = rowData["Machine serial ID*"] || "";

  return `${brand} - ${model} - ${serial}`.trim();
}

module.exports = {
  extractMachineDataFromExcel,
  mapToDatabaseFormat,
  parseDate,
};
