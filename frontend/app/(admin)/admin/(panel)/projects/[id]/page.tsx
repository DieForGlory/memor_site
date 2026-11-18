import { notFound } from "next/navigation";

import { ProjectEditor } from "@/components/admin/ProjectEditor";

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const num = Number(id);
  if (!Number.isInteger(num) || num <= 0) notFound();
  return <ProjectEditor id={num} />;
}
