"use client";

import { useEffect, useState } from "react";
import { onIdTokenChanged, signOut } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { Navbar } from "./Navbar";
import type { UserProfile } from "@/lib/domain/types";

export function HomeNavbar() {
  const [userName, setUserName] = useState<string | undefined>();
  const [searchHref, setSearchHref] = useState<string | undefined>();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsub = onIdTokenChanged(getFirebaseAuth(), async (user) => {
      if (!user) {
        setUserName(undefined);
        setSearchHref(undefined);
        setIsAdmin(false);
        return;
      }

      setUserName(user.displayName ?? user.email ?? "Account");

      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/users/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const { profile } = (await res.json()) as { profile: UserProfile };
          setSearchHref("/search");
          setIsAdmin(profile.role === "ADMIN");
        } else {
          setSearchHref("/search");
          setIsAdmin(false);
        }
      } catch {
        setSearchHref("/search");
        setIsAdmin(false);
      }
    });

    return unsub;
  }, []);

  return (
    <Navbar
      links={[]}
      userName={userName}
      isAdmin={isAdmin}
      searchHref={searchHref}
      notificationsHref="/notifications"
      onSignOut={
        userName
          ? () => signOut(getFirebaseAuth()).then(() => (window.location.href = "/"))
          : undefined
      }
    />
  );
}
