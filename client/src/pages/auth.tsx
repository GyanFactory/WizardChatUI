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
import { z } from "zod";
import { Redirect } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Mail, Lock, User, Bot, MessageSquare, FileText, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = loginSchema.extend({
  name: z.string().min(2, "Name must be at least 2 characters"),
});

type RegisterResponse = {
  message: string;
  status: "success" | "error" | "email_failed";
};

export default function AuthPage() {
  const { loginMutation, registerMutation, user } = useAuth();
  const { toast } = useToast();

  const loginForm = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const registerForm = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  // Redirect if already logged in
  if (user) {
    return <Redirect to="/" />;
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-gradient-to-b from-background to-muted/20">
      <div className="container flex items-center justify-center py-10 md:py-16">
        <div className="grid w-full gap-8 lg:grid-cols-2 lg:gap-16">
          <div className="flex flex-col justify-center">
            <Card className="relative overflow-hidden border-none bg-background/60 shadow-xl backdrop-blur-sm">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-transparent" />
              <CardHeader className="space-y-1">
                <CardTitle className="text-2xl font-bold tracking-tight">
                  Welcome back
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Enter your credentials to access your account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="login" className="space-y-6">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="login" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                      Login
                    </TabsTrigger>
                    <TabsTrigger value="register" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                      Register
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="login" className="space-y-4">
                    <Form {...loginForm}>
                      <form
                        onSubmit={loginForm.handleSubmit((data) =>
                          loginMutation.mutate(data)
                        )}
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
                                  variant: "warning",
                                });
                              } else {
                                toast({
                                  title: "Registration successful",
                                  description: "Please check your email to verify your account.",
                                });
                              }
                            },
                          });
                        })}
                        className="space-y-4"
                      >
                        <FormField
                          control={registerForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Name</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <User className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                                  <Input
                                    placeholder="Enter your name"
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

          <div className="hidden lg:block">
            <div className="flex h-full flex-col justify-center space-y-8">
              <div className="space-y-4">
                <h1 className="text-4xl font-bold tracking-tight text-primary">
                  AI-Powered Document Assistant
                </h1>
                <p className="text-xl text-muted-foreground">
                  Transform your documents into interactive knowledge bases with our
                  intelligent chatbot.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-start space-x-3 rounded-lg border bg-card p-4 shadow-sm">
                  <Bot className="h-6 w-6 text-primary" />
                  <div>
                    <h3 className="font-semibold">Smart AI Chat</h3>
                    <p className="text-sm text-muted-foreground">
                      Engage in natural conversations with AI trained on your documents
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 rounded-lg border bg-card p-4 shadow-sm">
                  <MessageSquare className="h-6 w-6 text-primary" />
                  <div>
                    <h3 className="font-semibold">Interactive QA</h3>
                    <p className="text-sm text-muted-foreground">
                      Get instant answers to questions about your document content
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 rounded-lg border bg-card p-4 shadow-sm">
                  <FileText className="h-6 w-6 text-primary" />
                  <div>
                    <h3 className="font-semibold">PDF Processing</h3>
                    <p className="text-sm text-muted-foreground">
                      Seamlessly process and analyze PDF documents
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 rounded-lg border bg-card p-4 shadow-sm">
                  <Zap className="h-6 w-6 text-primary" />
                  <div>
                    <h3 className="font-semibold">Quick Integration</h3>
                    <p className="text-sm text-muted-foreground">
                      Easily embed the chat widget into your website
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}