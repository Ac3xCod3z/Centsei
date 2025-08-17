
"use client";

import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AreaChart, BarChart, Calendar, TrendingDown, TrendingUp, Expand, Info, ToggleLeft, ToggleRight, Cake, Flag } from 'lucide-react';
import type { Entry, Goal, Birthday } from '@/lib/types';
import { aggregateData, type AggregatedDataPoint, getTopCategories } from '@/lib/data-aggregator';
import { generateSeasonalForecast, ForecastDataPoint } from '@/lib/seasonal-forecast';
import { format, subDays, startOfYear, endOfYear, subMonths, parseISO } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Bar, Cell, ReferenceDot } from 'recharts';
import { formatCurrency, cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Switch } from './ui/switch';
import { Label } from './ui/label';

type Granularity = 'week' | 'month' | 'year';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-2 bg-background/90 backdrop-blur-sm border rounded-lg shadow-lg text-sm">
        <p className="label font-semibold mb-2">{label}</p>
        {payload.map((p: any) => (
            <div key={p.dataKey} style={{ color: p.color }} className="flex justify-between gap-4">
                <span>{p.name}:</span>
                <span className="font-bold">{formatCurrency(p.value)}</span>
            </div>
        ))}
         {payload[0].payload.event && (
          <div className="mt-2 pt-2 border-t border-border">
            <p className="font-semibold text-primary">{payload[0].payload.event}</p>
          </div>
        )}
      </div>
    );
  }

  return null;
};

type ChartInfoContentProps = {
    chartTitle: string;
}

const ChartInfoContent: React.FC<ChartInfoContentProps> = ({ chartTitle }) => {
    switch (chartTitle) {
        case 'Cash Flow':
            return (
                <>
                    <AlertDialogTitle>Cash Flow Explained</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                       <div>
                        <p>This chart visualizes the movement of money into and out of your account over time.</p>
                        <ul className="list-disc pl-5 mt-2 space-y-1 text-muted-foreground">
                            <li><strong>Income:</strong> All money you've received.</li>
                            <li><strong>Expenses:</strong> All money you've spent.</li>
                            <li><strong>Net:</strong> The difference between Income and Expenses (Income - Expenses). A positive net means you earned more than you spent.</li>
                        </ul>
                        <p className="text-sm text-muted-foreground mt-2">Use this to understand your overall financial health and profitability for a given period.</p>
                       </div>
                    </AlertDialogDescription>
                </>
            );
        case 'Category Trends':
            return (
                <>
                    <AlertDialogTitle>Category Trends Explained</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                        <div>
                         <p>This chart breaks down your spending into your top 5 categories, helping you see where your money goes. The "Other" category lumps together all remaining expenses.</p>
                         <p className="text-sm text-muted-foreground mt-2">Use this to identify areas where you might be overspending and to track the impact of budget changes on specific categories.</p>
                        </div>
                    </AlertDialogDescription>
                </>
            );
        case 'Savings Balance':
             return (
                <>
                    <AlertDialogTitle>Savings Balance Explained</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                        <div>
                         <p>This chart shows the growth of your cumulative balance over time. It's calculated by taking a starting balance and adding the "Net" from each period.</p>
                         <p className="text-sm text-muted-foreground mt-2">This is a powerful indicator of your wealth accumulation. A steadily rising line is a sign of strong financial discipline.</p>
                        </div>
                    </AlertDialogDescription>
                </>
            );
        case 'Recurring vs Variable':
             return (
                <>
                    <AlertDialogTitle>Recurring vs. Variable Spending</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                       <div>
                        <p>This chart splits your expenses into two types to help you understand your financial flexibility.</p>
                        <ul className="list-disc pl-5 mt-2 space-y-1 text-muted-foreground">
                            <li><strong>Recurring:</strong> Fixed costs that happen regularly, like rent, subscriptions, and loan payments.</li>
                            <li><strong>Variable:</strong> Flexible costs that change each period, like groceries, recreation, and shopping.</li>
                        </ul>
                         <p className="text-sm text-muted-foreground mt-2">Understanding this split can show you where you have the most room to cut back if needed.</p>
                       </div>
                    </AlertDialogDescription>
                </>
            );
        case 'Goal Progress':
            return (
                <>
                    <AlertDialogTitle>Goal Progress Explained</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                       <div>
                        <p>This bar shows how close you are to achieving your primary savings goal.</p>
                        <p className="text-sm text-muted-foreground mt-2">Keep contributing to fill up the bar and reach your target! You can manage your goals from the main menu.</p>
                       </div>
                    </AlertDialogDescription>
                </>
            );
        case 'Seasonal Spend':
             return (
                <>
                    <AlertDialogTitle>Seasonal Spend Forecast</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                        <div>
                         <p>This chart predicts upcoming spending spikes based on holidays and birthdays.</p>
                         <ul className="list-disc pl-5 mt-2 space-y-1 text-muted-foreground">
                            <li><strong>Baseline Spend:</strong> Your typical, average monthly spending on variable costs.</li>
                            <li><strong>Forecast Spend:</strong> The baseline plus estimated extra costs for upcoming events.</li>
                            <li><strong>Actual Spend:</strong> How much you've actually spent so far in the current period.</li>
                         </ul>
                         <p className="text-sm text-muted-foreground mt-2">Use this to anticipate and prepare for irregular expenses before they happen.</p>
                        </div>
                    </AlertDialogDescription>
                </>
            );
        default:
            return null;
    }
}

type LineChartCardProps = {
  title: string;
  children: React.ReactNode;
  granularity?: Granularity;
  onGranularityChange?: (g: Granularity) => void;
  dateRange?: { start: Date; end: Date };
  onDateRangeChange?: (range: { start: Date; end: Date }) => void;
  onExpand?: () => void;
  className?: string;
  headerControls?: React.ReactNode;
};

const LineChartCard = ({ title, children, className, headerControls, onExpand }: LineChartCardProps) => {
    return (
        <Card className={cn("flex flex-col relative", className)}>
             <CardHeader>
                <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{title}</CardTitle>
                    {onExpand && (
                       <Button variant="ghost" size="icon" className="h-8 w-8 -my-2 -mr-2" onClick={onExpand}>
                           <Expand className="h-4 w-4" />
                       </Button>
                    )}
                </div>
                 <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2">
                    {headerControls && (
                        <div className="flex items-center gap-2">
                            {headerControls}
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
                <div className="h-64 w-full">
                    {children}
                </div>
            </CardContent>
            <AlertDialog>
                <AlertDialogTrigger asChild>
                     <Button variant="ghost" size="icon" className="absolute bottom-2 right-2 h-7 w-7 text-muted-foreground">
                        <Info className="h-4 w-4" />
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                       <ChartInfoContent chartTitle={title} />
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction>Got it!</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    );
};


type EnsoInsightsDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  entries: Entry[];
  goals: Goal[];
  birthdays: Birthday[];
  timezone: string;
};

export function EnsoInsightsDialog({
  isOpen,
  onClose,
  entries,
  goals,
  birthdays,
  timezone,
}: EnsoInsightsDialogProps) {

  const hasEnoughData = entries.length > 5;
  
  const [cashFlowGranularity, setCashFlowGranularity] = useState<Granularity>('month');
  const [cashFlowDateRange, setCashFlowDateRange] = useState({ start: subDays(new Date(), 90), end: new Date() });

  const [categoryTrendsGranularity, setCategoryTrendsGranularity] = useState<Granularity>('month');
  const [categoryTrendsDateRange, setCategoryTrendsDateRange] = useState({ start: subDays(new Date(), 90), end: new Date() });
  
  const [savingsBalanceGranularity, setSavingsBalanceGranularity] = useState<Granularity>('month');
  const [savingsBalanceDateRange, setSavingsBalanceDateRange] = useState({ start: subDays(new Date(), 90), end: new Date() });

  const [rvvGranularity, setRvvGranularity] = useState<Granularity>('month');
  const [rvvDateRange, setRvvDateRange] = useState({ start: subDays(new Date(), 90), end: new Date() });

  const [expandedChart, setExpandedChart] = useState<string | null>(null);

  const [hiddenLines, setHiddenLines] = useState<string[]>([]);
  
  // State for Seasonal Spend chart
  const [seasonalGranularity, setSeasonalGranularity] = useState<Granularity>('month');
  const [seasonalDateRange, setSeasonalDateRange] = useState({ start: new Date(), end: endOfYear(new Date()) });
  const [includeHolidays, setIncludeHolidays] = useState(true);
  const [includeBirthdays, setIncludeBirthdays] = useState(true);

  
  const topCategories = useMemo(() => {
    if (!hasEnoughData) return [];
    return getTopCategories(entries, 5);
  }, [entries, hasEnoughData]);

  const cashFlowChartData = useMemo(() => {
    if (!hasEnoughData) return [];
    return aggregateData(entries, cashFlowDateRange, cashFlowGranularity, timezone, topCategories);
  }, [entries, cashFlowDateRange, cashFlowGranularity, timezone, hasEnoughData, topCategories]);
  
  const categoryTrendsChartData = useMemo(() => {
    if (!hasEnoughData) return [];
    return aggregateData(entries, categoryTrendsDateRange, categoryTrendsGranularity, timezone, topCategories);
  }, [entries, categoryTrendsDateRange, categoryTrendsGranularity, timezone, hasEnoughData, topCategories]);
  
  const savingsBalanceChartData = useMemo(() => {
    if (!hasEnoughData) return [];
    return aggregateData(entries, savingsBalanceDateRange, savingsBalanceGranularity, timezone, topCategories);
  }, [entries, savingsBalanceDateRange, savingsBalanceGranularity, timezone, hasEnoughData, topCategories]);
  
  const rvvChartData = useMemo(() => {
    if (!hasEnoughData) return [];
    return aggregateData(entries, rvvDateRange, rvvGranularity, timezone, topCategories);
  }, [entries, rvvDateRange, rvvGranularity, timezone, hasEnoughData, topCategories]);


  const seasonalForecastData = useMemo(() => {
    if (!hasEnoughData) return [];
    return generateSeasonalForecast(
        entries,
        birthdays,
        seasonalDateRange,
        seasonalGranularity,
        timezone,
        includeHolidays,
        includeBirthdays
    );
  }, [entries, birthdays, seasonalDateRange, seasonalGranularity, timezone, includeHolidays, includeBirthdays, hasEnoughData]);

  const primaryGoal = useMemo(() => goals.length > 0 ? goals[0] : null, [goals]);

  const goalProgressData = useMemo(() => {
      if (!primaryGoal) return [];
      
      const savedAmount = primaryGoal.savedAmount;
      const targetAmount = primaryGoal.targetAmount;
      const remaining = Math.max(0, targetAmount - savedAmount);
      
      return [
        { name: 'Saved', value: savedAmount, fill: 'hsl(var(--primary))' },
        { name: 'Remaining', value: remaining, fill: 'hsl(var(--muted))' }
      ]

  }, [primaryGoal])

  const formatXAxis = (tickItem: string, granularity: Granularity) => {
    if (granularity === 'month') return format(new Date(tickItem), 'MMM');
    if (granularity === 'year') return tickItem;
    return format(new Date(tickItem), 'MMM d');
  };

  const toggleLineVisibility = (dataKey: string) => {
    setHiddenLines(prev => 
        prev.includes(dataKey) 
            ? prev.filter(k => k !== dataKey) 
            : [...prev, dataKey]
    );
  };
  
  const renderLegend = (props: any) => {
    const { payload } = props;
    return (
        <div className="flex items-center justify-center flex-wrap gap-x-4 gap-y-2 pt-4">
            {payload.map((entry: any, index: number) => (
                <Button
                    key={`item-${index}`}
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleLineVisibility(entry.dataKey)}
                    className={cn(
                        "text-xs",
                        hiddenLines.includes(entry.dataKey) && "opacity-50"
                    )}
                >
                    <div className="w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: entry.color }} />
                    {entry.value}
                </Button>
            ))}
        </div>
    );
  }

  const renderChart = (title: string, isExpanded = false) => {
    let currentGranularity: Granularity = 'month';
    let currentAggregatedData: any[] = [];
    
    const chartMargin = isExpanded ? { top: 5, right: 30, left: 20, bottom: 20 } : { top: 5, right: 20, left: -10, bottom: 5 };
    
    switch (title) {
        case 'Cash Flow':
            currentGranularity = cashFlowGranularity;
            currentAggregatedData = cashFlowChartData;
            return (
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={currentAggregatedData} margin={chartMargin}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis 
                            dataKey="date" 
                            tickFormatter={(tick) => formatXAxis(tick, currentGranularity)}
                            tick={{ fontSize: 12 }}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis 
                            tickFormatter={(value) => formatCurrency(value)}
                            tick={{ fontSize: 12 }}
                            tickLine={false}
                            axisLine={false}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--accent) / 0.1)' }} />
                        <Legend content={renderLegend} />
                        <Line name="Income" type="monotone" dataKey="income" stroke="hsl(142.1 76.2% 36.3%)" strokeWidth={2} dot={false} hide={hiddenLines.includes('income')} />
                        <Line name="Expenses" type="monotone" dataKey="expenses" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} hide={hiddenLines.includes('expenses')} />
                        <Line name="Net" type="monotone" dataKey="net" stroke="hsl(var(--foreground))" strokeWidth={2} dot={false} hide={hiddenLines.includes('net')} />
                    </LineChart>
                </ResponsiveContainer>
            );
        case 'Category Trends':
             const categoryColors = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))", "hsl(var(--muted-foreground))"];
             const trendDataKeys = [...topCategories.map(c => `category_${c}`), 'category_other'];
             currentGranularity = categoryTrendsGranularity;
             currentAggregatedData = categoryTrendsChartData;
             return (
                 <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={currentAggregatedData} margin={chartMargin}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" tickFormatter={(tick) => formatXAxis(tick, currentGranularity)} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                        <YAxis tickFormatter={(value) => formatCurrency(value)} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--accent) / 0.1)' }} />
                        <Legend content={renderLegend} />
                        {trendDataKeys.map((key, index) => (
                             <Line 
                                key={key}
                                name={key.replace('category_', '').replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                type="monotone" 
                                dataKey={key} 
                                stroke={categoryColors[index % categoryColors.length]} 
                                strokeWidth={2} 
                                dot={false} 
                                hide={hiddenLines.includes(key)} 
                             />
                        ))}
                    </LineChart>
                 </ResponsiveContainer>
             );
        case 'Savings Balance':
             currentGranularity = savingsBalanceGranularity;
             currentAggregatedData = savingsBalanceChartData;
             return (
                 <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={currentAggregatedData} margin={chartMargin}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" tickFormatter={(tick) => formatXAxis(tick, currentGranularity)} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                        <YAxis tickFormatter={(value) => formatCurrency(value)} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--accent) / 0.1)' }} />
                        <Legend content={renderLegend} />
                        <Line name="Balance" type="monotone" dataKey="endOfPeriodBalance" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} hide={hiddenLines.includes('endOfPeriodBalance')} />
                    </LineChart>
                 </ResponsiveContainer>
             );
         case 'Recurring vs Variable':
             currentGranularity = rvvGranularity;
             currentAggregatedData = rvvChartData;
             return (
                 <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={currentAggregatedData} margin={chartMargin}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" tickFormatter={(tick) => formatXAxis(tick, currentGranularity)} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                        <YAxis tickFormatter={(value) => formatCurrency(value)} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--accent) / 0.1)' }} />
                        <Legend content={renderLegend} />
                        <Line name="Recurring" type="monotone" dataKey="recurring" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} hide={hiddenLines.includes('recurring')} />
                        <Line name="Variable" type="monotone" dataKey="variable" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} hide={hiddenLines.includes('variable')} />
                    </LineChart>
                 </ResponsiveContainer>
             );
        case 'Goal Progress':
            if (!primaryGoal || !goalProgressData) {
                return <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Set a goal to see your progress here.</div>;
            }
             return (
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={goalProgressData} stackOffset="expand">
                         <XAxis type="number" hide />
                         <YAxis type="category" dataKey="name" hide />
                         <Tooltip cursor={{ fill: 'transparent' }} content={({ active, payload }) => {
                           if (active && payload && payload.length) {
                             return <div className="p-2 bg-background/90 backdrop-blur-sm border rounded-lg shadow-lg text-sm">{`${payload[0].name}: ${formatCurrency(payload[0].value)}`}</div>;
                           }
                           return null;
                         }} />
                         <Bar dataKey="value" barSize={40} background={{ fill: 'hsl(var(--muted))' }}>
                            {goalProgressData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                         </Bar>
                    </BarChart>
                 </ResponsiveContainer>
             );
        case 'Seasonal Spend':
             currentGranularity = seasonalGranularity;
             currentAggregatedData = seasonalForecastData;
             return (
                 <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={currentAggregatedData} margin={chartMargin}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" tickFormatter={(tick) => formatXAxis(tick, currentGranularity)} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                        <YAxis tickFormatter={(value) => formatCurrency(value)} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--accent) / 0.1)' }} />
                        <Legend content={renderLegend} />
                        <Line name="Baseline" type="monotone" dataKey="baselineSpend" stroke="hsl(var(--muted-foreground))" strokeWidth={2} strokeDasharray="5 5" dot={false} hide={hiddenLines.includes('baselineSpend')} />
                        <Line name="Forecast" type="monotone" dataKey="forecastSpend" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} hide={hiddenLines.includes('forecastSpend')} />
                        <Line name="Actual" type="monotone" dataKey="actualSpend" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} hide={hiddenLines.includes('actualSpend')} />
                        {currentAggregatedData.map((point) => (
                            point.event ? (
                                <ReferenceDot 
                                    key={point.date} 
                                    x={point.date} 
                                    y={point.forecastSpend} 
                                    r={5} 
                                    fill="hsl(var(--primary))" 
                                    stroke="hsl(var(--background))" 
                                    strokeWidth={2} 
                                />
                            ) : null
                        ))}
                    </LineChart>
                 </ResponsiveContainer>
             );

        default:
            return <div className="flex items-center justify-center h-full text-muted-foreground">Coming Soon</div>;
    }
  }

 const dateRanges = {
    '30D': { start: subDays(new Date(), 30), end: new Date() },
    '90D': { start: subDays(new Date(), 90), end: new Date() },
    'YTD': { start: startOfYear(new Date()), end: new Date() },
    '12M': { start: subMonths(new Date(), 12), end: new Date() },
};

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AreaChart />
              Enso Insights
            </DialogTitle>
            <DialogDescription>
              A calm, auto-generated view of your money’s patterns.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="-mx-6 px-6">
              <div className="py-4">
              {!hasEnoughData ? (
                   <div className="flex flex-col items-center justify-center h-full text-center p-8">
                      <Alert className="max-w-md">
                          <AreaChart className="h-4 w-4" />
                          <AlertTitle>Patience, Grasshopper</AlertTitle>
                          <AlertDescription>
                            Your journey to financial enlightenment has just begun. Record more entries to unlock these powerful insights.
                          </AlertDescription>
                      </Alert>
                       <Button className="mt-4" onClick={() => {onClose(); /* Open add entry dialog */ }}>Add Your First Entry</Button>
                  </div>
              ) : (
                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <LineChartCard 
                          title="Cash Flow" 
                          onExpand={() => setExpandedChart('Cash Flow')}
                          className="animate-fade-in-up"
                          headerControls={
                            <>
                                <Tabs value={cashFlowGranularity} onValueChange={(value) => setCashFlowGranularity(value as Granularity)}>
                                    <TabsList className="grid w-full grid-cols-3 h-8 text-xs">
                                        <TabsTrigger value="week" className="h-6">W</TabsTrigger>
                                        <TabsTrigger value="month" className="h-6">M</TabsTrigger>
                                        <TabsTrigger value="year" className="h-6">Y</TabsTrigger>
                                    </TabsList>
                                </Tabs>
                                <div className="flex items-center justify-center gap-1 pt-0">
                                    {Object.entries(dateRanges).map(([key, value]) => (
                                        <Button
                                            key={key}
                                            variant={format(cashFlowDateRange.start, 'yyyy-MM-dd') === format(value.start, 'yyyy-MM-dd') ? "secondary" : "ghost"}
                                            size="sm"
                                            onClick={() => setCashFlowDateRange(value)}
                                            className="h-7 px-2 text-xs"
                                        >
                                            {key}
                                        </Button>
                                    ))}
                                </div>
                            </>
                          }
                      >
                           {renderChart('Cash Flow')}
                      </LineChartCard>
                      <LineChartCard 
                        title="Category Trends" 
                        onExpand={() => setExpandedChart('Category Trends')} 
                        className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}
                        headerControls={
                             <>
                                <Tabs value={categoryTrendsGranularity} onValueChange={(value) => setCategoryTrendsGranularity(value as Granularity)}>
                                    <TabsList className="grid w-full grid-cols-3 h-8 text-xs">
                                        <TabsTrigger value="week" className="h-6">W</TabsTrigger>
                                        <TabsTrigger value="month" className="h-6">M</TabsTrigger>
                                        <TabsTrigger value="year" className="h-6">Y</TabsTrigger>
                                    </TabsList>
                                </Tabs>
                                <div className="flex items-center justify-center gap-1 pt-0">
                                    {Object.entries(dateRanges).map(([key, value]) => (
                                        <Button
                                            key={key}
                                            variant={format(categoryTrendsDateRange.start, 'yyyy-MM-dd') === format(value.start, 'yyyy-MM-dd') ? "secondary" : "ghost"}
                                            size="sm"
                                            onClick={() => setCategoryTrendsDateRange(value)}
                                            className="h-7 px-2 text-xs"
                                        >
                                            {key}
                                        </Button>
                                    ))}
                                </div>
                            </>
                        }
                       >
                           {renderChart('Category Trends')}
                       </LineChartCard>
                      <LineChartCard 
                        title="Savings Balance" 
                        onExpand={() => setExpandedChart('Savings Balance')} 
                        className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}
                         headerControls={
                             <>
                                <Tabs value={savingsBalanceGranularity} onValueChange={(value) => setSavingsBalanceGranularity(value as Granularity)}>
                                    <TabsList className="grid w-full grid-cols-3 h-8 text-xs">
                                        <TabsTrigger value="week" className="h-6">W</TabsTrigger>
                                        <TabsTrigger value="month" className="h-6">M</TabsTrigger>
                                        <TabsTrigger value="year" className="h-6">Y</TabsTrigger>
                                    </TabsList>
                                </Tabs>
                                <div className="flex items-center justify-center gap-1 pt-0">
                                    {Object.entries(dateRanges).map(([key, value]) => (
                                        <Button
                                            key={key}
                                            variant={format(savingsBalanceDateRange.start, 'yyyy-MM-dd') === format(value.start, 'yyyy-MM-dd') ? "secondary" : "ghost"}
                                            size="sm"
                                            onClick={() => setSavingsBalanceDateRange(value)}
                                            className="h-7 px-2 text-xs"
                                        >
                                            {key}
                                        </Button>
                                    ))}
                                </div>
                            </>
                        }
                      >
                        {renderChart('Savings Balance')}
                      </LineChartCard>
                      <LineChartCard 
                        title="Recurring vs Variable" 
                        onExpand={() => setExpandedChart('Recurring vs Variable')} 
                        className="animate-fade-in-up" 
                        style={{ animationDelay: '0.3s' }}
                         headerControls={
                             <>
                                <Tabs value={rvvGranularity} onValueChange={(value) => setRvvGranularity(value as Granularity)}>
                                    <TabsList className="grid w-full grid-cols-3 h-8 text-xs">
                                        <TabsTrigger value="week" className="h-6">W</TabsTrigger>
                                        <TabsTrigger value="month" className="h-6">M</TabsTrigger>
                                        <TabsTrigger value="year" className="h-6">Y</TabsTrigger>
                                    </TabsList>
                                </Tabs>
                                <div className="flex items-center justify-center gap-1 pt-0">
                                    {Object.entries(dateRanges).map(([key, value]) => (
                                        <Button
                                            key={key}
                                            variant={format(rvvDateRange.start, 'yyyy-MM-dd') === format(value.start, 'yyyy-MM-dd') ? "secondary" : "ghost"}
                                            size="sm"
                                            onClick={() => setRvvDateRange(value)}
                                            className="h-7 px-2 text-xs"
                                        >
                                            {key}
                                        </Button>
                                    ))}
                                </div>
                            </>
                        }
                      >
                        {renderChart('Recurring vs Variable')}
                      </LineChartCard>
                       <LineChartCard 
                        title="Seasonal Spend" 
                        onExpand={() => setExpandedChart('Seasonal Spend')}
                        headerControls={
                           <div className="flex items-center gap-2">
                               <div className="flex items-center space-x-2">
                                   <Switch id="holidays-toggle" checked={includeHolidays} onCheckedChange={setIncludeHolidays} />
                                   <Label htmlFor="holidays-toggle" className="text-xs">Holidays</Label>
                               </div>
                                <div className="flex items-center space-x-2">
                                   <Switch id="birthdays-toggle" checked={includeBirthdays} onCheckedChange={setIncludeBirthdays} />
                                   <Label htmlFor="birthdays-toggle" className="text-xs">Birthdays</Label>
                               </div>
                           </div>
                        }
                        className="animate-fade-in-up" 
                        style={{ animationDelay: '0.4s' }}
                      >
                        {renderChart('Seasonal Spend')}
                      </LineChartCard>
                      <Card className="animate-fade-in-up relative" style={{ animationDelay: '0.5s' }}>
                        <CardHeader>
                            <CardTitle className="text-base">
                                {primaryGoal ? `Goal: ${primaryGoal.name}` : 'Goal Progress'}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="h-64">
                           {renderChart('Goal Progress')}
                        </CardContent>
                         <AlertDialog>
                            <AlertDialogTrigger asChild>
                                 <Button variant="ghost" size="icon" className="absolute bottom-2 right-2 h-7 w-7 text-muted-foreground">
                                    <Info className="h-4 w-4" />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                   <ChartInfoContent chartTitle={'Goal Progress'} />
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogAction>Got it!</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                      </Card>
                   </div>
              )}
              </div>
          </ScrollArea>
          
          <DialogFooter className="border-t pt-4">
            <Button type="button" variant="secondary" onClick={onClose}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Expanded Chart Dialog */}
      <Dialog open={!!expandedChart} onOpenChange={() => setExpandedChart(null)}>
          <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>{expandedChart}</DialogTitle>
              </DialogHeader>
              <div className="flex-1 -mx-6 -mb-6 px-6 pb-6">
                {expandedChart && renderChart(expandedChart, true)}
              </div>
          </DialogContent>
      </Dialog>
    </>
  );
}
