import type { Metadata } from "next";
import PublicAkolouthies from "@/components/PublicAkolouthies";

export const metadata: Metadata = {
  title: "Ακολουθίες | Ψαλτική Παιδεία",
  description:
    "Υλικό ακολουθιών και ηχογραφήσεις για τη μελέτη και την πρακτική στο αναλόγιο.",
  alternates: { canonical: "/akolouthies" },
};

export default function AkolouthiesPage() {
  return (
    <div className="container section space-y-6">
      <PublicAkolouthies />
    </div>
  );
}
