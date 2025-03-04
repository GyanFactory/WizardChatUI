import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema } from "@shared/schema";
import { z } from "zod";
import { Redirect } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Mail, Lock, Bot, MessageSquare, FileText, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type RegisterResponse = {
  message: string;
  status: "success" | "error" | "email_failed";
};

export default function AuthPage() {
  const { loginMutation, registerMutation, user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("login");

  const loginForm = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const registerForm = useForm({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Redirect if already logged in
  if (user) {
    return <Redirect to="/" />;
  }

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    // Reset forms when switching tabs
    loginForm.reset();
    registerForm.reset();
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-gradient-to-b from-primary/5 via-background to-background">
      <div className="container flex items-center justify-center py-10 md:py-16">
        <div className="grid w-full gap-8 lg:grid-cols-2 lg:gap-16">
          <div className="hidden flex-col justify-center space-y-8 lg:flex">
            <div className="space-y-4">
              <div className="inline-block rounded-lg bg-primary/10 px-3 py-1 text-sm text-primary">
                Welcome to End User Guide
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-primary">
                Transform Documents into
                <br />
                Interactive Knowledge
              </h1>
              <p className="text-xl text-muted-foreground">
                Create intelligent assistants from your documents using advanced AI
                to deliver instant, accurate answers.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="group relative overflow-hidden rounded-lg border bg-background p-4 transition-colors hover:bg-accent">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-transparent opacity-50"></div>
                <div className="relative">
                  <Bot className="h-6 w-6 text-primary" />
                  <h3 className="mt-3 font-semibold">Smart AI Chat</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Engage in natural conversations with AI trained on your documents
                  </p>
                </div>
              </div>

              <div className="group relative overflow-hidden rounded-lg border bg-background p-4 transition-colors hover:bg-accent">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-transparent opacity-50"></div>
                <div className="relative">
                  <MessageSquare className="h-6 w-6 text-primary" />
                  <h3 className="mt-3 font-semibold">Interactive QA</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Get instant answers to questions about your document content
                  </p>
                </div>
              </div>

              <div className="group relative overflow-hidden rounded-lg border bg-background p-4 transition-colors hover:bg-accent">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-transparent opacity-50"></div>
                <div className="relative">
                  <FileText className="h-6 w-6 text-primary" />
                  <h3 className="mt-3 font-semibold">PDF Processing</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Seamlessly process and analyze PDF documents
                  </p>
                </div>
              </div>

              <div className="group relative overflow-hidden rounded-lg border bg-background p-4 transition-colors hover:bg-accent">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-transparent opacity-50"></div>
                <div className="relative">
                  <Zap className="h-6 w-6 text-primary" />
                  <h3 className="mt-3 font-semibold">Quick Integration</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Easily embed the guide widget into your website
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-center">
            <Card className="relative overflow-hidden border-none bg-background/60 shadow-xl backdrop-blur-sm">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-transparent" />
              <CardHeader className="space-y-1">
                <CardTitle className="text-2xl font-bold tracking-tight">
                  {activeTab === "login" ? "Welcome back" : "Create an account"}
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  {activeTab === "login"
                    ? "Enter your credentials to access your account"
                    : "Sign up for a new account to get started"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="login">Login</TabsTrigger>
                    <TabsTrigger value="register">Register</TabsTrigger>
                  </TabsList>

                  <TabsContent value="login" className="space-y-4">
                    <Form {...loginForm}>
                      <form
                        onSubmit={loginForm.handleSubmit((data) => {
                          loginMutation.mutate(data, {
                            onError: (error: Error) => {
                              loginForm.setValue("password", "");
                              toast({
                                title: "Login failed",
                                description: error.message || "Invalid email or password",
                                variant: "destructive",
                              });
                            }
                          });
                        })}
                        className="space-y-4"
                      >
                        <FormField
                          control={loginForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Mail className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                                  <Input
                                    type="email"
                                    placeholder="Enter your email"
                                    className="pl-10"
                                    {...field}
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={loginForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Password</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Lock className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                                  <Input
                                    type="password"
                                    placeholder="Enter your password"
                                    className="pl-10"
                                    {...field}
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button
                          type="submit"
                          className="w-full transition-all hover:scale-[1.02]"
                          disabled={loginMutation.isPending}
                        >
                          {loginMutation.isPending && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          Sign In
                        </Button>
                      </form>
                    </Form>
                  </TabsContent>

                  <TabsContent value="register" className="space-y-4">
                    <Form {...registerForm}>
                      <form
                        onSubmit={registerForm.handleSubmit((data) => {
                          registerMutation.mutate(data, {
                            onError: (error: Error) => {
                              registerForm.setValue("password", "");
                              toast({
                                title: "Registration failed",
                                description: error.message,
                                variant: "destructive",
                              });
                            },
                            onSuccess: (response: RegisterResponse) => {
                              if (response.status === "email_failed") {
                                toast({
                                  title: "Account created",
                                  description: "However, the verification email could not be sent. You can request a new one later.",
                                  variant: "destructive",
                                });
                              } else {
                                toast({
                                  title: "Registration successful",
                                  description: "Please check your email to verify your account.",
                                });
                              }
                              setActiveTab("login");
                              registerForm.reset();
                            },
                          });
                        })}
                        className="space-y-4"
                      >
                        <FormField
                          control={registerForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Mail className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                                  <Input
                                    placeholder="Enter your email"
                                    className="pl-10"
                                    {...field}
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={registerForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Password</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Lock className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                                  <Input
                                    type="password"
                                    placeholder="Enter your password"
                                    className="pl-10"
                                    {...field}
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button
                          type="submit"
                          className="w-full transition-all hover:scale-[1.02]"
                          disabled={registerMutation.isPending}
                        >
                          {registerMutation.isPending && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          Create Account
                        </Button>
                      </form>
                    </Form>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}