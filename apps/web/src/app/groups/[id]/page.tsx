import { GroupDetailView } from "./components/group-detail-view";

export default async function GroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <GroupDetailView groupId={id} />;
}