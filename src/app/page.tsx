import { redirect } from "next/navigation";

// The proxy sends a visitor without a session to /login before this runs.
export default function Home() {
  redirect("/challenges");
}
