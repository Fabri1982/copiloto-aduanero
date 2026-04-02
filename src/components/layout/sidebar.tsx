"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import {
  LayoutDashboard,
  FolderOpen,
  AlertTriangle,
  FileText,
  CreditCard,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
} from "lucide-react"

interface SidebarProps {
  collapsed?: boolean
  onToggle?: () => void
}

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Expedientes", href: "/cases", icon: FolderOpen },
  { name: "Excepciones", href: "/exceptions", icon: AlertTriangle },
  { name: "Provisiones", href: "/provisions", icon: FileText },
  { name: "Pagos", href: "/payments", icon: CreditCard },
]

const bottomNavigation = [
  { name: "Configuración", href: "/settings", icon: Settings },
]

export function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === href || pathname === "/"
    }
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  const NavItem = ({ item }: { item: typeof navigation[0] }) => {
    const active = isActive(item.href)
    const Icon = item.icon

    return (
      <Link
        href={item.href}
        onClick={() => setMobileOpen(false)}
        className={cn(
          "flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-medium transition-colors",
          active
            ? "bg-[var(--primary-soft)] text-[var(--primary)]"
            : "text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
        )}
      >
        <Icon className="h-5 w-5 flex-shrink-0" strokeWidth={1.5} />
        {!collapsed && <span className="truncate">{item.name}</span>}
      </Link>
    )
  }

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          {!collapsed && (
            <span className="text-lg font-semibold tracking-tight text-[var(--text)]">
              Copiloto
            </span>
          )}
          {collapsed && (
            <span className="text-lg font-semibold tracking-tight text-[var(--primary)]">
              C
            </span>
          )}
        </Link>
        {onToggle && !collapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="h-8 w-8 text-[var(--text-muted)] hover:text-[var(--text)]"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
        {onToggle && collapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="h-8 w-8 text-[var(--text-muted)] hover:text-[var(--text)]"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <nav className="flex flex-col gap-1">
          {navigation.map((item) => (
            <NavItem key={item.name} item={item} />
          ))}
        </nav>
      </div>

      {/* Bottom Navigation */}
      <div className="border-t border-[var(--border)] px-3 py-4">
        <nav className="flex flex-col gap-1">
          {bottomNavigation.map((item) => (
            <NavItem key={item.name} item={item} />
          ))}
        </nav>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile Sidebar */}
      <div className="lg:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger
            className="fixed left-4 top-4 z-40 inline-flex h-10 w-10 items-center justify-center rounded-md text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Abrir menú</span>
          </SheetTrigger>
          <SheetContent side="left" className="w-[260px] p-0 bg-[var(--surface)] border-r border-[var(--border)]">
            <SidebarContent />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col border-r border-[var(--border)] bg-[var(--surface)] transition-all duration-300 ease-in-out",
          collapsed ? "w-16" : "w-60"
        )}
      >
        <SidebarContent />
      </aside>
    </>
  )
}
