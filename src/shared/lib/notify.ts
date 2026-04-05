import { toast, type ToastOptions } from "react-toastify";

/**
 * Default Toastify options — adjust here for position, duration, styling hooks.
 */
export const notifyDefaults: ToastOptions = {
  position: "top-center",
  autoClose: 3200,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  hideProgressBar: false,
};

export const notify = {
  success(message: string) {
    toast.success(message, { ...notifyDefaults });
  },
  error(message: string) {
    toast.error(message, { ...notifyDefaults });
  },
  info(message: string) {
    toast.info(message, { ...notifyDefaults });
  },
};
