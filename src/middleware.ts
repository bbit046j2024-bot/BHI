import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isRevisionRoute = createRouteMatcher(["/revision(.*)"]);

export default clerkMiddleware((auth, req) => {
  if (isRevisionRoute(req)) {
    const { userId } = auth();
    if (!userId) {
      // Redirect to home with modal trigger
      const url = req.nextUrl.clone();
      url.pathname = "/";
      url.searchParams.set("signin", "1");
      return NextResponse.redirect(url);
    }
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
