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

interface AuthFormProps {
  onSuccess: () => void;
}

export default function AuthForm({ onSuccess }: AuthFormProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const { loginMutation, registerMutation } = useAuth();

  const form = useForm({
    resolver: zodResolver(
      insertUserSchema.extend({
        confirmPassword: insertUserSchema.shape.password.optional(),
      }),
    ),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (values: any) => {
    try {
      if (mode === "register") {
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
              form.reset();
              onSuccess();
            },
          },
        );
      } else {
        await loginMutation.mutateAsync(
          { email: values.email, password: values.password },
          {
            onSuccess: () => {
              form.reset();
              onSuccess();
            },
          },
        );
      }
    } catch (error) {
      // Error is already handled by the mutation
      form.setValue("password", "");
      if (mode === "register") {
        form.setValue("confirmPassword", "");
      }
    }
  };

  const handleModeChange = (newMode: string) => {
    setMode(newMode as "login" | "register");
    form.reset();
  };

  return (
    <Tabs value={mode} onValueChange={handleModeChange}>
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="login">Login</TabsTrigger>
        <TabsTrigger value="register">Register</TabsTrigger>
      </TabsList>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Enter your email" 
                    {...field} 
                    disabled={loginMutation.isPending || registerMutation.isPending}
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
                    disabled={loginMutation.isPending || registerMutation.isPending}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {mode === "register" && (
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
                      disabled={loginMutation.isPending || registerMutation.isPending}
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
            disabled={loginMutation.isPending || registerMutation.isPending}
          >
            {(loginMutation.isPending || registerMutation.isPending) && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {mode === "login" ? "Login" : "Register"}
          </Button>
        </form>
      </Form>
    </Tabs>
  );
}