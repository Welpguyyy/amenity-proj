import Swal, { SweetAlertIcon } from "sweetalert2";

export function amenityAlert(
  title: string,
  text: string,
  icon: SweetAlertIcon = "info"
) {
  return Swal.fire({
    title,
    text,
    icon,
    confirmButtonColor: "#4B9CD3", // Example Amenity blue, adjust as needed
    cancelButtonColor: "#d33", // Example for cancel, adjust as needed
    background: "#fff", // Or your Amenity background
    customClass: {
      popup: "amenity-alert-popup",
      title: "amenity-alert-title",
      confirmButton: "amenity-alert-confirm",
      cancelButton: "amenity-alert-cancel",
    },
  });
}
