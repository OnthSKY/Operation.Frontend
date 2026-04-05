"use client";

import { notifyDefaults } from "@/shared/lib/notify";
import { Slide, ToastContainer } from "react-toastify";

import "react-toastify/dist/ReactToastify.css";

/**
 * Single Toastify mount — theme tokens live in globals.css (--toastify-*).
 */
export function AppToastify() {
  return (
    <ToastContainer
      position={notifyDefaults.position ?? "top-center"}
      autoClose={notifyDefaults.autoClose}
      transition={Slide}
      newestOnTop
      closeOnClick
      pauseOnHover
      draggable
      theme="light"
      toastClassName="!rounded-xl !shadow-lg !text-sm !font-sans"
    />
  );
}
