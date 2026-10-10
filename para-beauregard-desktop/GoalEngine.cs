namespace ParaBeauregard.Desktop;

public static class GoalEngine
{
    public static IReadOnlyList<DaySummary> Calculate(IEnumerable<Sale> sales, decimal baseTarget, DateTime? from = null, DateTime? to = null)
    {
        var grouped = sales.GroupBy(s => s.Date.Date).ToDictionary(g => g.Key, g => g.ToList());
        var start = (from ?? (grouped.Keys.DefaultIfEmpty(DateTime.Today).Min())).Date;
        var end = (to ?? (grouped.Keys.DefaultIfEmpty(DateTime.Today).Max())).Date;
        var result = new List<DaySummary>(); var carry = 0m;
        for (var day = start; day <= end; day = day.AddDays(1))
        {
            grouped.TryGetValue(day, out var daySales); daySales ??= [];
            var revenue = daySales.Sum(s => s.Revenue); var cost = daySales.Sum(s => s.Cost); var profit = daySales.Sum(s => s.Profit);
            var target = baseTarget + carry; var difference = profit - target; var next = Math.Max(target - profit, 0);
            result.Add(new DaySummary(day, revenue, cost, profit, baseTarget, carry, target, difference, next, daySales.Count, daySales.Sum(s => s.Quantity)));
            carry = next;
        }
        return result;
    }
}
