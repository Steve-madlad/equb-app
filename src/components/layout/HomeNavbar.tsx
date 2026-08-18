"use client";

import { useEffect, useState } from "react";
import { onIdTokenChanged, signOut } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { Navbar } from "./Navbar";

export function HomeNavbar() {
  const [userName, setUserName] = useState<string | undefined>();

  useEffect(() => {
    const unsub = onIdTokenChanged(getFirebaseAuth(), async (user) => {
      if (!user) {
        setUserName(undefined);
        return;
      }

      setUserName(user.displayName ?? user.email ?? "Account");
    });

    return unsub;
  }, []);

  return (
    <Navbar
      links={[]}
      userName={userName}
      dashboardHref="/dashboard"
      notificationsHref="/notifications"
      onSignOut={
        userName
          ? () => signOut(getFirebaseAuth()).then(() => (window.location.href = "/"))
          : undefined
      }
    />
  );
}
