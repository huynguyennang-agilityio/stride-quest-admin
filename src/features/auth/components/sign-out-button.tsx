import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";

import { signOut } from "../actions";

export function SignOutButton() {
  return (
    <form action={signOut}>
      <Button type="submit" variant="ghost" size="sm">
        <LogOut />
        Sign out
      </Button>
    </form>
  );
}
