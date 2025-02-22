import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { User, LogOut, Settings, Users, BarChart, Cpu } from "lucide-react";
import { useWizardStore } from "@/store/wizardStore";

export function Navigation() {
  const { user, logoutMutation } = useAuth();
  const resetWizard = useWizardStore((state) => state.reset);

  const handleLogout = () => {
    resetWizard();
    logoutMutation.mutate();
  };

  return (
    <nav className="border-b">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <NavigationMenu>
          <NavigationMenuList>
            <NavigationMenuItem>
              <Link href="/">
                <NavigationMenuLink className="font-bold">
                  End User Guide
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>
            {user?.isAdmin && (
              <NavigationMenuItem>
                <NavigationMenuTrigger>Admin Panel</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="grid gap-1 p-2 w-[200px]">
                    <Link href="/admin/users">
                      <NavigationMenuLink className="flex w-full items-center gap-2 rounded-md p-2 hover:bg-accent">
                        <Users className="h-4 w-4" />
                        User Management
                      </NavigationMenuLink>
                    </Link>
                    <Link href="/admin/model-settings">
                      <NavigationMenuLink className="flex w-full items-center gap-2 rounded-md p-2 hover:bg-accent">
                        <Cpu className="h-4 w-4" />
                        Model Settings
                      </NavigationMenuLink>
                    </Link>
                    <Link href="/admin/usage-stats">
                      <NavigationMenuLink className="flex w-full items-center gap-2 rounded-md p-2 hover:bg-accent">
                        <BarChart className="h-4 w-4" />
                        Usage Statistics
                      </NavigationMenuLink>
                    </Link>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>
            )}
          </NavigationMenuList>
        </NavigationMenu>

        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <User className="h-4 w-4" />
                  <span>{user.email}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <Link href="/profile">
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    Profile Settings
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  disabled={logoutMutation.isPending}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/auth">
              <Button size="sm">
                <User className="mr-2 h-4 w-4" />
                Login
              </Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}