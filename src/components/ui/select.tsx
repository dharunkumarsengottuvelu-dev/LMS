"use client"

import * as React from "react"
import { Select as SelectPrimitive } from "@base-ui/react/select"

import { cn } from "@/lib/utils"
import { ChevronDownIcon, CheckIcon } from "lucide-react"

const Select = SelectPrimitive.Root

function SelectGroup({ className, ...props }: SelectPrimitive.Group.Props) {
  return (
    <SelectPrimitive.Group
      data-slot="select-group"
      className={cn("scroll-my-1 p-1", className)}
      {...props}
    />
  )
}

export function formatDropdownLabel(val: any, placeholder?: string): string {
  if (val === undefined || val === null || val === "") {
    return placeholder || "Select option";
  }

  if (typeof val !== "string") {
    return String(val);
  }

  // If it's a UUID, return placeholder
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)) {
    return placeholder || "Select option";
  }

  const trimmed = val.trim();

  // Known dictionary for MNC enterprise system values (Title Case / Proper Case)
  const mncLabels: Record<string, string> = {
    all: "All",
    today: "Today",
    yesterday: "Yesterday",
    tomorrow: "Tomorrow",
    active: "Active",
    inactive: "Inactive",
    live: "Live Now",
    scheduled: "Scheduled",
    completed: "Completed",
    cancelled: "Cancelled",
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
    flagged: "Flagged",
    suspended: "Suspended",
    draft: "Draft",
    published: "Published",
    archived: "Archived",
    in_progress: "In Progress",
    "in-progress": "In Progress",
    not_started: "Not Started",
    "not-started": "Not Started",
    "7d": "Last 7 Days",
    "30d": "Last 30 Days",
    custom: "Custom Range",
    super_admin: "Super Admin",
    admin: "Admin",
    trainer: "Trainer",
    student: "Student",
    institution: "Institution",
    recruiter: "Recruiter",
    manager: "Manager",
    founder: "Founder",
    ceo: "CEO",
    easy: "Easy",
    medium: "Medium",
    hard: "Hard",
    beginner: "Beginner",
    intermediate: "Intermediate",
    advanced: "Advanced",
    sql: "SQL",
    mcq: "MCQ",
    dsa: "DSA",
    api: "API",
    java: "Java",
    python: "Python",
    cpp: "C++",
    c: "C",
    javascript: "JavaScript",
    typescript: "TypeScript",
    none: "None",
    male: "Male",
    female: "Female",
    other: "Other",
  };

  const lower = trimmed.toLowerCase();
  if (mncLabels[lower]) {
    return mncLabels[lower];
  }

  // If snake_case or kebab-case, capitalize each word: "first_batch" -> "First Batch"
  if (trimmed.includes("_") || (trimmed.includes("-") && !trimmed.includes(" "))) {
    return trimmed
      .split(/[-_]/)
      .filter(Boolean)
      .map((part) => {
        const pLower = part.toLowerCase();
        if (mncLabels[pLower]) return mncLabels[pLower];
        return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
      })
      .join(" ");
  }

  // If all lowercase: Capitalize first letter, keep rest small
  if (trimmed === trimmed.toLowerCase()) {
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  }

  // If already properly capitalized or mixed case (e.g. "Batch 1"), keep as is
  return trimmed;
}

function SelectValue({ className, children, ...props }: SelectPrimitive.Value.Props) {
  if (children !== undefined) {
    return (
      <SelectPrimitive.Value
        data-slot="select-value"
        className={cn("flex flex-1 text-left truncate", className)}
        {...props}
      >
        {children}
      </SelectPrimitive.Value>
    )
  }

  return (
    <SelectPrimitive.Value
      data-slot="select-value"
      className={cn("flex flex-1 text-left truncate", className)}
      {...props}
    >
      {(value: any) => formatDropdownLabel(value, typeof props.placeholder === "string" ? props.placeholder : undefined)}
    </SelectPrimitive.Value>
  )
}

function SelectTrigger({
  className,
  size = "default",
  children,
  ...props
}: SelectPrimitive.Trigger.Props & {
  size?: "sm" | "default"
}) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        "flex w-full items-center justify-between gap-2 rounded-xl border border-input bg-transparent px-3.5 py-2.5 text-sm transition-colors outline-none select-none focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon className="pointer-events-none size-4 text-muted-foreground shrink-0 flex items-center justify-center">
        <ChevronDownIcon className="size-4" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

function SelectContent({
  className,
  children,
  side = "bottom",
  sideOffset = 4,
  align = "start",
  alignOffset = 0,
  alignItemWithTrigger = false,
  ...props
}: SelectPrimitive.Popup.Props &
  Pick<
    SelectPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset" | "alignItemWithTrigger"
  >) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        alignItemWithTrigger={alignItemWithTrigger}
        className="isolate z-[10005] w-[var(--anchor-width)] min-w-[12rem]"
      >
        <SelectPrimitive.Popup
          data-slot="select-content"
          data-align-trigger={alignItemWithTrigger}
          className={cn(
            "relative isolate z-[10005] max-h-(--available-height) min-w-[12rem] p-1.5 overflow-x-hidden overflow-y-auto rounded-xl bg-white dark:bg-[#18181B] text-popover-foreground shadow-2xl border border-border duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            className
          )}
          {...props}
        >
          <SelectPrimitive.List className="space-y-0.5">{children}</SelectPrimitive.List>
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  )
}

function SelectLabel({
  className,
  ...props
}: SelectPrimitive.GroupLabel.Props) {
  return (
    <SelectPrimitive.GroupLabel
      data-slot="select-label"
      className={cn("px-2.5 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider", className)}
      {...props}
    />
  )
}

function SelectItem({
  className,
  children,
  label: explicitLabel,
  ...props
}: SelectPrimitive.Item.Props) {
  const formattedChildren =
    typeof children === "string" ? formatDropdownLabel(children) : children;

  const resolvedLabel =
    explicitLabel ||
    (typeof formattedChildren === "string" ? formattedChildren : undefined);

  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      label={resolvedLabel}
      className={cn(
        "relative flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm outline-none select-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 transition-colors",
        className
      )}
      {...props}
    >
      <SelectPrimitive.ItemText className="flex-1 truncate font-medium">
        {formattedChildren}
      </SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="ml-auto shrink-0 flex items-center justify-center">
        <CheckIcon className="size-4 text-[#2563EB]" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  )
}

function SelectSeparator({
  className,
  ...props
}: SelectPrimitive.Separator.Props) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn("pointer-events-none -mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  )
}

function SelectScrollUpButton({ className }: { className?: string }) {
  return null;
}

function SelectScrollDownButton({ className }: { className?: string }) {
  return null;
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}
