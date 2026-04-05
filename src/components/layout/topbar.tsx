"use client"

import { useState, useEffect } from "react"
import { Search, Sun, Moon, User } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function Topbar() {
  const [isDark, setIsDark] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Initialize dark mode from localStorage or system preference
  useEffect(() => {
    setMounted(true)
    const savedTheme = localStorage.getItem("theme")
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    const initialDark = savedTheme === "dark" || (!savedTheme && prefersDark)
    setIsDark(initialDark)
    if (initialDark) {
      document.documentElement.classList.add("dark")
    }
  }, [])

  const toggleDarkMode = () => {
    const newDark = !isDark
    setIsDark(newDark)
    if (newDark) {
      document.documentElement.classList.add("dark")
      localStorage.setItem("theme", "dark")
    } else {
      document.documentElement.classList.remove("dark")
      localStorage.setItem("theme", "light")
    }
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
      {/* Search */}
      <div className="flex items-center gap-4 flex-1 max-w-md">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
          <Input
            type="search"
            placeholder="Buscar..."
            className="h-10 w-full rounded-[10px] border-border bg-background pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Dark mode toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleDarkMode}
          className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
          suppressHydrationWarning
        >
          {mounted ? (
            isDark ? (
              <Sun className="h-4 w-4" strokeWidth={1.5} />
            ) : (
              <Moon className="h-4 w-4" strokeWidth={1.5} />
            )
          ) : (
            <Moon className="h-4 w-4" strokeWidth={1.5} />
          )}
          <span className="sr-only">Cambiar tema</span>
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-full p-0 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground outline-none"
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src="" alt="Usuario" />
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                <User className="h-4 w-4" strokeWidth={1.5} />
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-card border-border">
            <DropdownMenuLabel className="text-foreground">
              <div className="flex flex-col">
                <span className="font-medium">Usuario</span>
                <span className="text-xs text-muted-foreground">usuario@ejemplo.com</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem className="text-foreground hover:bg-sidebar-accent hover:text-foreground cursor-pointer">
              Perfil
            </DropdownMenuItem>
            <DropdownMenuItem className="text-foreground hover:bg-sidebar-accent hover:text-foreground cursor-pointer">
              Configuración
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem className="text-destructive hover:bg-destructive/10 cursor-pointer">
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
