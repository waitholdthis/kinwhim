import { KinwhimApp } from "@/components/kinwhim-app";
import { WebSignIn } from "@/components/web-sign-in";
import { getViewer } from "@/lib/kinwhim-server";

export const dynamic = "force-dynamic";

export default async function Home() {
  const viewer = await getViewer().catch(() => null);
  if (!viewer) return <WebSignIn />;
  return <KinwhimApp user={{ name: viewer.name, email: viewer.email }} />;
}
