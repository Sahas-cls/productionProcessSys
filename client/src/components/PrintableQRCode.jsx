import React, { useRef, useCallback, useState, useEffect } from "react";
import QRCode from "react-qr-code";
import { toPng } from "html-to-image";
import printJS from "print-js";

export default function PrintableQRCode({ value }) {
  const [screenWidth, setScreenWidth] = useState("md");
  const qrRef = useRef(null);

  // Detect screen width
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setScreenWidth("sm");
      } else {
        setScreenWidth("md");
      }
    };

    // console.log("fadf ",value);

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handlePrint = useCallback(async () => {
    if (!qrRef.current) return;

    try {
      const dataUrl = await toPng(qrRef.current);
      printJS({
        printable: dataUrl,
        type: "image",
        style: "@page { size: auto; margin: 0mm; }",
      });
    } catch (error) {
      console.error("Error printing QR:", error);
      alert("Failed to print QR Code.");
    }
  }, []);

  return (
    <div className="grid grid-cols-1 px-4">
      <div
        ref={qrRef}
        style={{
          background: "white",
          padding: "16px",
          display: "inline-block",
          marginBottom: "16px",
        }}
      >
        <QRCode
          value={value || "N/A"}
          size={screenWidth === "sm" ? 80 : 140}
          bgColor="#FFFFFF"
          fgColor="#13949A"
        />
        {/* <div className="">
          <p className="">{`Machine No ${value.machine_no}`}</p>
          <p className="">{`Machine No ${value.machine_name}`}</p>
          <p className="">{`Machine No ${value.status}`}</p>
        </div> */}
      </div>

      <div className="w-full">
        <button
          onClick={handlePrint}
          disabled={!value}
          type="button"
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50 w-[150px]"
        >
          Print QR
        </button>
      </div>
    </div>
  );
}
