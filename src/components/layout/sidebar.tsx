'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  ShoppingCart,
  ClipboardList,
  Users,
  Package,
  UserCheck,
  Building2,
  LogOut,
  ChevronDown,
  Store,
} from 'lucide-react'
import { useState } from 'react'
import { SessionData } from '@/lib/types'

interface SidebarProps {
  session: SessionData
}

const navItems = [
  { href: '/pedidos/novo', label: 'Novo Pedido', icon: ShoppingCart, exact: true },
  { href: '/pedidos', label: 'Pedidos', icon: ClipboardList, exact: true },
]

const cadastroItems = [
  { href: '/clientes', label: 'Clientes', icon: Users },
  { href: '/produtos', label: 'Produtos', icon: Package },
  { href: '/vendedores', label: 'Vendedores', icon: UserCheck },
]

const adminItems = [
  { href: '/empresas', label: 'Empresas', icon: Building2 },
]

function NavLink({
  href,
  label,
  icon: Icon,
  exact,
}: {
  href: string
  label: string
  icon: React.ElementType
  exact?: boolean
}) {
  const pathname = usePathname()
  const active = exact ? pathname === href : pathname.startsWith(href)

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        active
          ? 'bg-blue-600 text-white'
          : 'text-gray-300 hover:bg-gray-800 hover:text-white'
      }`}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      {label}
    </Link>
  )
}

export function Sidebar({ session }: SidebarProps) {
  const router = useRouter()
  const [empresaOpen, setEmpresaOpen] = useState(false)
  const [logoutLoading, setLogoutLoading] = useState(false)

  const empresaAtual = session.empresas.find((e) => e.id === session.empresaAtualId)

  async function handleTrocarEmpresa(empresaId: string) {
    await fetch('/api/auth/empresa', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ empresaId }),
    })
    setEmpresaOpen(false)
    router.refresh()
  }

  async function handleLogout() {
    setLogoutLoading(true)
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <aside className="fixed inset-y-0 left-0 w-60 bg-gray-900 flex flex-col z-20">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <ShoppingCart className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-semibold text-sm leading-tight">
            Aluguel de<br />Carrinho
          </span>
        </div>

        {/* Empresa switcher */}
        <div className="relative">
          <button
            onClick={() => setEmpresaOpen((v) => !v)}
            className="w-full flex items-center gap-2 bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded-lg text-left transition-colors"
          >
            <Store className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <span className="text-xs text-gray-200 truncate flex-1">
              {empresaAtual?.fantasia ?? 'Selecionar empresa'}
            </span>
            <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${empresaOpen ? 'rotate-180' : ''}`} />
          </button>

          {empresaOpen && session.empresas.length > 1 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-30 overflow-hidden">
              {session.empresas.map((e) => (
                <button
                  key={e.id}
                  onClick={() => handleTrocarEmpresa(e.id)}
                  className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                    e.id === session.empresaAtualId
                      ? 'text-blue-400 bg-gray-700'
                      : 'text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {e.fantasia}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Navegação */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {navItems.map((item) => (
          <NavLink key={item.href} {...item} />
        ))}

        <div className="pt-3">
          <p className="px-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Cadastros
          </p>
          {cadastroItems.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
        </div>

        {session.isAdmin && (
          <div className="pt-3">
            <p className="px-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Administração
            </p>
            {adminItems.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-gray-800">
        <div className="px-3 py-2 mb-1">
          <p className="text-xs text-gray-400">Logado como</p>
          <p className="text-sm text-white font-medium">{session.login}</p>
        </div>
        <button
          onClick={handleLogout}
          disabled={logoutLoading}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-red-400 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </button>
      </div>
    </aside>
  )
}
