import { redirect } from 'next/navigation';

export default async function CoverageRedirect({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  redirect(`/models/${code}/summary`);
}
