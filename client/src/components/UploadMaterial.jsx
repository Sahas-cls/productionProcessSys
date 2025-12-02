import React from "react";
import { IoVideocam, IoImagesOutline } from "react-icons/io5";
import { GoPackage } from "react-icons/go";
import { TiFolderOpen } from "react-icons/ti";
import { FaCloudscale } from "react-icons/fa";
import { IoCloseSharp } from "react-icons/io5";

const UploadMaterial = ({
  uploadingMaterial,
  setUploadingMaterial,
  setIsUploading,
}) => {
  const handleMaterialType = (type) => {
    setUploadingMaterial(type);
  };
  const btnStyle =
    "flex items-center justify-center gap-3 px-6 py-3 bg-blue-500 font-semibold text-white rounded-md shadow-md hover:bg-blue-600 hover:scale-105 transition group";

  return (
    <div className="w-full min-h-[400px] relative border shadow-lg rounded-lg bg-gray-900 border-gray-400">
      <div className="">
        <button
          type="button"
          className="hover:bg-red-600 hover:text-white absolute top-0 right-0 w-[50px] h-[40px] flex items-center justify-center rounded-md"
          onClick={() => {
            setUploadingMaterial(null);
            setIsUploading(false);
          }}
        >
          <IoCloseSharp className="text-3xl text-white" />
        </button>
        <h1 className="text-center mt-8 text-2xl font-semibold text-white">
          Select Uploading Media Type
        </h1>
      </div>

      <div className="flex flex-col mt-8 space-y-6 px-20">
        <button
          className={btnStyle}
          onClick={() => handleMaterialType("video")}
        >
          <IoVideocam className="text-2xl group-hover:rotate-[-360deg] duration-1000" />
          <p>Upload Video</p>
        </button>

        <button
          className={btnStyle}
          onClick={() => handleMaterialType("image")}
        >
          <IoImagesOutline className="text-2xl group-hover:rotate-[-360deg] duration-1000" />
          <p>Upload Images</p>
        </button>

        <button
          className={btnStyle}
          onClick={() => handleMaterialType("techpack")}
        >
          <GoPackage className="text-2xl group-hover:rotate-[-360deg] duration-1000" />
          <p>Upload Tech-pack</p>
        </button>

        <button
          className={btnStyle}
          onClick={() => handleMaterialType("folder")}
        >
          <TiFolderOpen className="text-2xl group-hover:rotate-[-360deg] duration-1000" />
          <p>Upload Folder</p>
        </button>
      </div>
    </div>
  );
};

export default UploadMaterial;
