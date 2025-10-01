import { Card, CardContent, CardHeader, CardTitle } from "./card"
import { cn } from "@/lib/utils"

interface MetricCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  value: string | number
  subValue?: string | number
  icon: React.ReactNode
  trend?: "up" | "down"
  trendValue?: string | number
  className?: string
}

export function MetricCard({
  title,
  value,
  subValue,
  icon,
  trend,
  trendValue,
  className,
  ...props
}: MetricCardProps) {
  return (
    <Card className={cn("overflow-hidden", className)} {...props}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="h-4 w-4 text-muted-foreground">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {(subValue || trend) && (
          <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-1">
            {trend && (
              <span 
                className={cn(
                  "flex items-center",
                  trend === "up" ? "text-emerald-500" : "text-red-500"
                )}
              >
                {trend === "up" ? "↑" : "↓"}
                {trendValue && (
                  <span className="ml-1">{trendValue}</span>
                )}
              </span>
            )}
            {subValue && (
              <span>{subValue}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}