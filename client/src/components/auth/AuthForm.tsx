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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
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
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const { loginMutation, registerMutation } = useAuth();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(
      activeTab === "register"
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
      if (activeTab === "register") {
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
              setActiveTab("login");
            },
          }
        );
      } else {
        await loginMutation.mutateAsync(
          { email: values.email, password: values.password },
          {
            onSuccess: () => {
              toast({
                title: "Login successful",
                description: "Welcome back!",
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
        title: activeTab === "register" ? "Registration failed" : "Login failed",
        description: errorMessage,
        variant: "destructive",
      });
      form.setValue("password", "");
      if (activeTab === "register") {
        form.setValue("confirmPassword", "");
      }
    }
  });

  const handleTabChange = (value: string) => {
    setActiveTab(value as "login" | "register");
    form.reset();
  };

  const isLoading = loginMutation.isPending || registerMutation.isPending;

  return (
    <div className="w-full max-w-md mx-auto p-6 space-y-6">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="login" disabled={isLoading}>Login</TabsTrigger>
          <TabsTrigger value="register" disabled={isLoading}>Register</TabsTrigger>
        </TabsList>

        <div className="mt-6">
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
                        placeholder="Enter your email" 
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

              {activeTab === "register" && (
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
                {activeTab === "login" ? "Sign In" : "Register"}
              </Button>
            </form>
          </Form>
        </div>
      </Tabs>
    </div>
  );
}