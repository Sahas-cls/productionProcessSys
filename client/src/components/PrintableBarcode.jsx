import React, { useRef, useCallback, useState, useEffect } from "react";
import Barcode from "react-barcode";
import { toPng } from "html-to-image";
import printJS from "print-js";

export default function PrintableBarcode({ value }) {
  const [screenWidth, setScreenWidth] = useState("md");
  const barcodeRef = useRef(null);

  // Detect screen width
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setScreenWidth("sm");
      } else {
        setScreenWidth("md");
      }
    };

    handleResize(); // Run first when form mount
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handlePrint = useCallback(async () => {
    if (!barcodeRef.current) return;

    try {
      const dataUrl = await toPng(barcodeRef.current);
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
          width={screenWidth === "sm" ? 1 : 2}
          height={90}
          lineColor="#13949A"
        />
      </div>

      <div className="w-full">
        <button
          onClick={handlePrint}
          disabled={!value}
          type="button"
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50 w-[150px]"
        >
          Print Barcode
        </button>
      </div>
    </div>
  );
}
