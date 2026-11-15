import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { SimpleNavigation } from "@/components/simple-navigation"
import { WeeklyMenuView } from "@/components/weekly-menu-view"
import { createClient } from "@/lib/supabase/server"
import { mondayIsoFor, normalizeWeekStart } from "@/lib/weekly-menu/weekly-menu-domain"
import { readWeeklyMenu } from "@/lib/weekly-menu/weekly-menu-server-operations"

export default async function WeeklyMenuPage({
  params,
  searchParams,
}: {
  params: Promise<{ week: string }>
  searchParams: Promise<{ target?: string | string[] }>
}) {
  const now = new Date()
  const [{ week }, query, cookieStore] = await Promise.all([params, searchParams, cookies()])
  const supabase = createClient(cookieStore)
  const { data: { user }, error: sessionError } = await supabase.auth.getUser()
  if (sessionError || !user) redirect("/login")

  let canonicalWeek: string
  try {
    canonicalWeek = normalizeWeekStart(week, now)
  } catch {
    redirect(`/weekly-menu/${mondayIsoFor(now)}`)
  }
  if (canonicalWeek !== week) redirect(`/weekly-menu/${canonicalWeek}`)
  if (Array.isArray(query.target)) redirect(`/weekly-menu/${canonicalWeek}`)

  const input: { week: string; target?: string } = { week: canonicalWeek }
  if (query.target) input.target = query.target
  const result = await readWeeklyMenu(supabase, input, now)
  if (result.status === 401) redirect("/login")

  return (
    <div className="min-h-screen bg-gray-50">
      <SimpleNavigation />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Planificador Semanal</h1>
          <p className="mt-2 text-gray-600">Organiza tus comidas para toda la semana</p>
        </div>
        {result.status === 200 && !("error" in result.body) ? (
          <WeeklyMenuView initialMenu={result.body} />
        ) : (
          <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-4 text-red-700">
            {"error" in result.body ? result.body.error : "No se pudo cargar el menú semanal"}
          </p>
        )}
      </main>
    </div>
  )
}
