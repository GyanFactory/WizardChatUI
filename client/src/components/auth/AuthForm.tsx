import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AuthFormProps {
  onSuccess: () => void;
}

type FormValues = {
  email: string;
  password: string;
  confirmPassword?: string;
};

export default function AuthForm({ onSuccess }: AuthFormProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const { loginMutation, registerMutation } = useAuth();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(
      isRegistering
        ? insertUserSchema.extend({
            confirmPassword: insertUserSchema.shape.password,
          })
        : insertUserSchema
    ),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      if (isRegistering) {
        if (values.password !== values.confirmPassword) {
          form.setError("confirmPassword", {
            message: "Passwords do not match",
          });
          return;
        }

        await registerMutation.mutateAsync(
          { email: values.email, password: values.password },
          {
            onSuccess: () => {
              toast({
                title: "Registration successful",
                description: "Please check your email to verify your account.",
              });
              form.reset();
              setIsRegistering(false);
            },
          }
        );
      } else {
        await loginMutation.mutateAsync(
          { email: values.email, password: values.password },
          {
            onSuccess: () => {
              toast({
                title: "Welcome to End User Guide Assistant",
                description: "Login successful! You can now start using the application.",
              });
              form.reset();
              onSuccess();
            },
          }
        );
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An error occurred";
      toast({
        title: isRegistering ? "Registration failed" : "Login failed",
        description: errorMessage,
        variant: "destructive",
      });
      form.setValue("password", "");
      if (isRegistering) {
        form.setValue("confirmPassword", "");
      }
    }
  });

  const isLoading = loginMutation.isPending || registerMutation.isPending;

  return (
    <div className="w-full max-w-md mx-auto p-6 space-y-8">
      <div className="text-center space-y-2">
        <BookOpen className="mx-auto h-12 w-12 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">
          End User Guide Assistant
        </h1>
        <p className="text-sm text-muted-foreground">
          {isRegistering
            ? "Create an account to get started"
            : "Sign in to access your guides"}
        </p>
      </div>

      <div className="space-y-6">
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="name@example.com" 
                      type="email"
                      {...field} 
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Enter your password"
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isRegistering && (
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Confirm your password"
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isRegistering ? "Create Account" : "Sign In"}
            </Button>
          </form>
        </Form>

        <div className="text-center text-sm">
          <button
            type="button"
            className="text-primary hover:underline"
            onClick={() => {
              setIsRegistering(!isRegistering);
              form.reset();
            }}
            disabled={isLoading}
          >
            {isRegistering
              ? "Already have an account? Sign in"
              : "Don't have an account? Create one"}
          </button>
        </div>
      </div>
    </div>
  );
}