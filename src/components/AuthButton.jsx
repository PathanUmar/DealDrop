import { LogIn, LogOut } from "lucide-react";
import { Button } from "./ui/button";
import { useState } from "react";
import AuthModal from "./AuthModal";
import { supabase } from "@/utils/supabase";

function AuthButton({ user }) {
  const [showAuthModal, setShowAuthModal] = useState(false);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  if (user) {
    return (
      <form action={signOut}>
        <Button
          variant="ghost"
          size="sm"
          type="submit"
          className="gap-2 cursor-pointer h-8"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </form>
    );
  }

  return (
    <>
      <Button
        onClick={() => setShowAuthModal(true)}
        variant="default"
        size="sm"
        className="bg-orange-500 hover:bg-orange-600 gap-2 h-8 cursor-pointer"
      >
        <LogIn className="w-4 h-4" />
        Sign In
      </Button>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </>
  );
}

export default AuthButton;
