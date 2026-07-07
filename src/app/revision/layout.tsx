import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function RevisionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/?signin=1");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container-page py-8">{children}</div>
    </div>
  );
}
