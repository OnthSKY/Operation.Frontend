"use client";

import { notifyDefaults } from "@/shared/lib/notify";
import {
  toastColoredToastClassName,
  toastConfirmOuterClassName,
  toastifyConfirmContainerId,
} from "@/shared/lib/toast-theme";
import { cssTransition, Slide, ToastContainer, toast } from "react-toastify";

/** Onay overlay: varsayılan Zoom + 300ms collapse yerine daha hızlı kapanış */
const confirmZoomTransition = cssTransition({
  enter: "Toastify__zoom-enter",
  exit: "Toastify__zoom-exit",
  appendPosition: false,
  collapse: true,
  collapseDuration: 100,
});

import "react-toastify/dist/ReactToastify.css";

/**
 * İki Toastify: varsayılan bildirimler + tam ekran onay (`notifyConfirmToast`).
 */
export function AppToastify() {
  return (
    <>
      <ToastContainer
        position={notifyDefaults.position ?? "top-center"}
        autoClose={notifyDefaults.autoClose}
        transition={Slide}
        newestOnTop
        closeOnClick
        pauseOnHover
        draggable
        theme="light"
        toastClassName={toastColoredToastClassName}
      />
      <ToastContainer
        containerId={toastifyConfirmContainerId}
        position="top-center"
        autoClose={false}
        transition={confirmZoomTransition}
        limit={4}
        closeOnClick={false}
        pauseOnHover
        draggable={false}
        hideProgressBar
        theme="light"
        className="Toastify--confirm-overlay Toastify__toast-container--top-center"
        toastClassName={toastConfirmOuterClassName}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            toast.dismiss({ containerId: toastifyConfirmContainerId });
          }
        }}
      />
    </>
  );
}
