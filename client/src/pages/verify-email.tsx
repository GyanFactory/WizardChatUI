import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function VerifyEmailPage() {
  const [verificationStatus, setVerificationStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [, setLocation] = useLocation();

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        const token = new URLSearchParams(window.location.search).get("token");
        if (!token) {
          setVerificationStatus("error");
          setErrorMessage("No verification token found");
          return;
        }

        const response = await fetch(`/api/verify-email?token=${token}`);
        const data = await response.json();

        if (response.ok) {
          setVerificationStatus("success");
        } else {
          setVerificationStatus("error");
          setErrorMessage(data.message || "Verification failed");
        }
      } catch (error) {
        setVerificationStatus("error");
        setErrorMessage("An error occurred during verification");
      }
    };

    verifyEmail();
  }, []);

  return (
    <div className="container flex items-center justify-center min-h-[calc(100vh-4rem)]">
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            Email Verification
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col items-center justify-center p-4 space-y-4">
            {verificationStatus === "loading" && (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p>Verifying your email address...</p>
              </>
            )}
            {verificationStatus === "success" && (
              <>
                <CheckCircle2 className="h-8 w-8 text-green-500" />
                <p>Your email has been verified successfully!</p>
                <Button onClick={() => setLocation("/auth")}>
                  Go to Login
                </Button>
              </>
            )}
            {verificationStatus === "error" && (
              <>
                <XCircle className="h-8 w-8 text-destructive" />
                <p className="text-destructive text-center">{errorMessage}</p>
                <Button onClick={() => setLocation("/auth")}>
                  Back to Login
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
