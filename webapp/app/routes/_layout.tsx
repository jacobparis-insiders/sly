import type { ClientLoaderFunctionArgs } from "@remix-run/react"
import { Outlet, Link, useSubmit } from "@remix-run/react"
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
  SidebarSeparator,
  SidebarFooter,
} from "#app/components/ui/sidebar.tsx"
import { Icon } from "#app/components/icon.tsx"
import type { BreadcrumbHandle } from "#app/components/ui/breadcrumbs.js"
import { Breadcrumbs } from "#app/components/ui/breadcrumbs.js"
import { ClientOnly } from "remix-utils/client-only"
import { requireCliConnection } from "#app/use-connection.js"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "#app/components/ui/dropdown-menu.js"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "#app/components/ui/avatar.js"
import { useOptionalUser } from "#app/root.js"

export const handle: BreadcrumbHandle = {
  breadcrumb: "pkgless",
}

export const shouldRevalidate = () => false
let hasCliConnection = false
export async function clientLoader({ request }: ClientLoaderFunctionArgs) {
  // Only run this guard on initial page load
  if (!hasCliConnection) {
    hasCliConnection = await requireCliConnection(request)
  }

  return null
}

export default function App() {
  return (
    <Layout>
      <Outlet />
    </Layout>
  )
}

function Layout({ children }: { children?: React.ReactNode }) {
  const user = useOptionalUser()
  const submit = useSubmit()
  return (
    <div>
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <Sidebar className="border-r">
            <SidebarHeader>
              <Link to="/">
                <h2 className="px-4 text-lg font-semibold tracking-tight">
                  ❖ pkgless
                </h2>
              </Link>
            </SidebarHeader>
            <SidebarContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link to="/dashboard">
                      <Icon name="home" className="mr-2" />
                      Dashboard
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                {/* {Object.entries(config.libraries).map(([library, lib]) => (
                  <SidebarMenuItem key={library}>
                    <SidebarMenuButton asChild>
                      <Link to={`/libraries/${library}`}>
                        <Icon name="library" className="mr-2" />
                        {(lib as Config["libraries"][string]).name || library}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))} */}
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link to="/new">
                      <Icon name="plus" className="mr-2" />
                      Add pkg
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarSeparator />

                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link to="/configuration">
                      <Icon name="cog" className="mr-2" />
                      pkgless.json
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarContent>
            {user ? (
              <SidebarFooter>
                <DropdownMenu modal>
                  <DropdownMenuTrigger title={user.profile.displayName} asChild>
                    <button className="flex w-full items-center gap-x-2 overflow-hidden text-ellipsis rounded-md bg-neutral-800 p-2 shadow-neutral-900 transition hover:bg-neutral-700 md:shadow-lg">
                      <Avatar className="h-6 w-6 shrink-0">
                        <AvatarImage
                          src={user.profile.photos[0].value}
                          alt={user.profile.displayName}
                        />
                        <AvatarFallback>
                          {user.profile.displayName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="overflow-hidden text-ellipsis text-center font-mono text-sm">
                        {user.profile.displayName}
                      </div>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-40 font-mono">
                    <DropdownMenuItem
                      onSelect={() => {
                        submit({}, { method: "POST", action: "/logout" })
                      }}
                    >
                      log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarFooter>
            ) : null}
          </Sidebar>
          <SidebarInset className="flex-1">
            <div>
              <div className="bg-diamond absolute inset-0" />
              <div className="relative grid grid-cols-[repeat(auto-fit,100px)]">
                <div className="col-span-full w-full relative z-10 my-auto flex h-svh max-w-7xl flex-1 flex-col items-start justify-center px-4 sm:px-6 lg:px-8">
                  <div className="flex h-full flex-col w-full">
                    <header className="flex h-14 lg:h-[60px] items-center justify-between gap-4 mb-8">
                      <div className="flex items-center gap-4">
                        <SidebarTrigger className="border bg-white shadow-smooth" />

                        <Breadcrumbs className="drop-shadow-smooth font-mono" />
                      </div>
                    </header>

                    <main className="flex-1 @container">
                      <ClientOnly>
                        {() => {
                          return children
                        }}
                      </ClientOnly>
                    </main>
                  </div>
                </div>
              </div>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </div>
  )
}
