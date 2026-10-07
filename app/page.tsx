import { requireChatGPTUser } from "./chatgpt-auth";
import { KinwhimApp } from "@/components/kinwhim-app";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await requireChatGPTUser("/");
  return <KinwhimApp user={{ name: user.displayName, email: user.email }} />;
}
