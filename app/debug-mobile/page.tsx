"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"

interface DeviceInfo {
  userAgent: string
  platform: string
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  screenWidth: number
  screenHeight: number
  viewportWidth: number
  viewportHeight: number
  devicePixelRatio: number
  orientation: string
  touchSupport: boolean
  timestamp: string
}

export default function DebugMobilePage() {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null)

  const loadDeviceInfo = () => {
    const userAgent = navigator.userAgent
    const platform = navigator.platform

    // Detectar tipo de dispositivo
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
    const isTablet = /iPad|Android(?=.*\bMobile\b)(?=.*\bSafari\b)|Android(?=.*(?:\bTablet\b|\bTab\b))/i.test(userAgent)
    const isDesktop = !isMobile && !isTablet

    // Información de pantalla
    const screenWidth = screen.width
    const screenHeight = screen.height
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const devicePixelRatio = window.devicePixelRatio || 1

    // Orientación
    const orientation = screen.orientation?.type || "unknown"

    // Soporte táctil
    const touchSupport = "ontouchstart" in window || navigator.maxTouchPoints > 0

    setDeviceInfo({
      userAgent,
      platform,
      isMobile,
      isTablet,
      isDesktop,
      screenWidth,
      screenHeight,
      viewportWidth,
      viewportHeight,
      devicePixelRatio,
      orientation,
      touchSupport,
      timestamp: new Date().toISOString(),
    })
  }

  useEffect(() => {
    loadDeviceInfo()

    // Actualizar cuando cambie el tamaño de la ventana
    const handleResize = () => {
      loadDeviceInfo()
    }

    window.addEventListener("resize", handleResize)
    window.addEventListener("orientationchange", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
      window.removeEventListener("orientationchange", handleResize)
    }
  }, [])

  if (!deviceInfo) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Cargando información del dispositivo...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Debug Móvil</h1>
          <p className="text-gray-600 mt-2">Información detallada del dispositivo y navegador</p>
        </div>
        <Button onClick={loadDeviceInfo} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tipo de Dispositivo */}
        <Card>
          <CardHeader>
            <CardTitle>Tipo de Dispositivo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p>
                <strong>Móvil:</strong>{" "}
                <span className={deviceInfo.isMobile ? "text-green-600" : "text-gray-500"}>
                  {deviceInfo.isMobile ? "Sí" : "No"}
                </span>
              </p>
              <p>
                <strong>Tablet:</strong>{" "}
                <span className={deviceInfo.isTablet ? "text-green-600" : "text-gray-500"}>
                  {deviceInfo.isTablet ? "Sí" : "No"}
                </span>
              </p>
              <p>
                <strong>Escritorio:</strong>{" "}
                <span className={deviceInfo.isDesktop ? "text-green-600" : "text-gray-500"}>
                  {deviceInfo.isDesktop ? "Sí" : "No"}
                </span>
              </p>
              <p>
                <strong>Soporte táctil:</strong>{" "}
                <span className={deviceInfo.touchSupport ? "text-green-600" : "text-gray-500"}>
                  {deviceInfo.touchSupport ? "Sí" : "No"}
                </span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Información de Pantalla */}
        <Card>
          <CardHeader>
            <CardTitle>Pantalla</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p>
                <strong>Resolución:</strong> {deviceInfo.screenWidth} x {deviceInfo.screenHeight}
              </p>
              <p>
                <strong>Viewport:</strong> {deviceInfo.viewportWidth} x {deviceInfo.viewportHeight}
              </p>
              <p>
                <strong>Pixel Ratio:</strong> {deviceInfo.devicePixelRatio}
              </p>
              <p>
                <strong>Orientación:</strong> {deviceInfo.orientation}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Navegador */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Navegador</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p>
                <strong>Plataforma:</strong> {deviceInfo.platform}
              </p>
              <p>
                <strong>User Agent:</strong>
              </p>
              <p className="text-sm bg-gray-100 p-2 rounded break-all">{deviceInfo.userAgent}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CSS Media Queries Test */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Test de Media Queries CSS</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-red-100 rounded block sm:hidden">
              <p className="text-sm font-semibold">XS</p>
              <p className="text-xs">Solo móviles pequeños</p>
            </div>
            <div className="p-4 bg-orange-100 rounded hidden sm:block md:hidden">
              <p className="text-sm font-semibold">SM</p>
              <p className="text-xs">Móviles grandes</p>
            </div>
            <div className="p-4 bg-yellow-100 rounded hidden md:block lg:hidden">
              <p className="text-sm font-semibold">MD</p>
              <p className="text-xs">Tablets</p>
            </div>
            <div className="p-4 bg-green-100 rounded hidden lg:block">
              <p className="text-sm font-semibold">LG</p>
              <p className="text-xs">Escritorio</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Información Raw */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Datos Raw (JSON)</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-100 p-4 rounded-md overflow-auto text-sm">{JSON.stringify(deviceInfo, null, 2)}</pre>
        </CardContent>
      </Card>
    </div>
  )
}
