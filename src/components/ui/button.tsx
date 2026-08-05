import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-5 [&_svg]:shrink-0 h-[44px] px-5 select-none",
  {
    variants: {
      variant: {
        default: "bg-[#2563EB] text-white hover:bg-[#1D4ED8] active:bg-[#1E40AF]",
        secondary: "bg-white dark:bg-[#18181B] text-[#111827] dark:text-[#FAFAFA] border border-[#E5E7EB] dark:border-[#27272A] hover:bg-[#F5F5F5] dark:hover:bg-[#27272A]",
        outline: "bg-white dark:bg-[#18181B] text-[#111827] dark:text-[#FAFAFA] border border-[#E5E7EB] dark:border-[#27272A] hover:bg-[#F5F5F5] dark:hover:bg-[#27272A]",
        ghost: "bg-transparent text-[#111827] dark:text-[#FAFAFA] hover:bg-[#F5F5F5] dark:hover:bg-[#27272A]",
        danger: "bg-[#DC2626] text-white hover:bg-[#B91C1C] active:bg-[#991B1B]",
        destructive: "bg-[#DC2626] text-white hover:bg-[#B91C1C] active:bg-[#991B1B]",
        link: "text-[#2563EB] underline-offset-4 hover:underline h-auto px-0",
      },
      size: {
        default: "h-[44px] px-5 text-sm",
        sm: "h-[36px] px-3.5 text-xs rounded-md",
        lg: "h-[48px] px-6 text-base rounded-lg",
        icon: "h-[44px] w-[44px] p-0 justify-center",
        "icon-sm": "h-[36px] w-[36px] p-0 justify-center",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
