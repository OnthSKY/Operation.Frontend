import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Emergency admin register",
  robots: { index: false, follow: false },
};

export default function EmergencyAdminRegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
