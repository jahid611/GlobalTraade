import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95 backdrop-blur-md border",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 border-primary/20 shadow-[0_4px_15px_rgba(168,85,247,0.3)]",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 border-destructive/20",
        outline:
          "border-white/10 bg-white/5 hover:bg-white/10 text-white",
        secondary:
          "bg-white text-black hover:bg-white/90 border-transparent shadow-lg",
        ghost: "border-transparent hover:bg-white/10 text-white/70 hover:text-white",
        link: "text-primary underline-offset-4 hover:underline border-transparent bg-transparent",
      },
      size: {
        default: "h-11 px-6 py-2",
        sm: "h-9 rounded-full px-4",
        lg: "h-14 rounded-full px-10 text-lg",
        icon: "h-10 w-10",
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