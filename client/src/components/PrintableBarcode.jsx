import React, { useRef, useCallback } from "react";
import Barcode from "react-barcode";
import { toPng } from "html-to-image";
import printJS from "print-js";

export default function PrintableBarcode({ value }) {
  const barcodeRef = useRef(null);

  const handlePrint = useCallback(async () => {
    if (!barcodeRef.current) return;

    try {
      // Convert barcode to image
      const dataUrl = await toPng(barcodeRef.current);

      // Print the image
      printJS({
        printable: dataUrl,
        type: "image",
        style: "@page { size: auto; margin: 0mm; }",
      });
    } catch (error) {
      console.error("Error printing barcode:", error);
      alert("Failed to print barcode.");
    }
  }, []);

  return (
    <div className="grid grid-cols-1 px-4">
      {/* Barcode container (will be converted to image) */}
      <div
        ref={barcodeRef}
        style={{
          background: "white",
          padding: "16px",
          display: "inline-block",
          marginBottom: "16px",
        }}
      >
        <Barcode
          value={value || "N/A"}
          width={2}
          height={90}
          lineColor="#13949A"
        />
      </div>

      <button
        onClick={handlePrint}
        disabled={!value}
        type="button"
        className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50 w-[150px]"
      >
        Print Barcode
      </button>
    </div>
  );
}
