import { ShipmentDetailScreen } from "@/modules/shipments/components/ShipmentDetailScreen";

export default async function ShipmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const p = await params;
  return <ShipmentDetailScreen id={Number(p.id)} />;
}
