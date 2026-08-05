"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4 text-[#16A34A]" />
        ),
        info: (
          <InfoIcon className="size-4 text-[#2563EB]" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4 text-[#F59E0B]" />
        ),
        error: (
          <OctagonXIcon className="size-4 text-[#DC2626]" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin text-[#2563EB]" />
        ),
      }}
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
