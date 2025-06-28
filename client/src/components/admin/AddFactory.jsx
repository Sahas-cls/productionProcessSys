import React from "react";
import { IoSearchSharp } from "react-icons/io5";
import { IoMdAdd } from "react-icons/io";

const AddFactory = () => {
  return (
    <div className="w-full min-h-full bg-gray-300/20 p-4">
      <div className="flex justify-between">
        <section className="flex items-center">
          <input
            type="text"
            className="px-2 py-1 rounded-md border-black/30 border-2"
          />
          <IoSearchSharp className="ml-2 text-3xl text-black/50" />
        </section>

        <section className="">
          <button className="mr-8 text-lg px-4 py-2 text-left bg-blue-400 rouended-md text-white font-semibold flex hover:bg-blue-500 duration-150">
            {/* <IoMdAdd className="text-3xl "/> */}
            Add Factory
          </button>
        </section>
      </div>
        
      <form className="mt-8 border border-black/20 rounded-md px-4 w-2/4 py-8 pl-10">
        <div className="">
            <label htmlFor="">Factory Code:</label>
            <input type="text" className="px-2 py-1 border-2 w-2/4 border-black/40 outline-none rounded-md ml-5" />
        </div>

         <div className="mt-4">
            <label htmlFor="">Factory Name:</label>
            <input type="text" className="px-2 py-1 border-2 w-2/4 border-black/40 outline-none rounded-md ml-4" />
        </div>
      </form>
    </div>
  );
};

export default AddFactory;
