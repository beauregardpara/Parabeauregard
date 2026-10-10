namespace ParaBeauregard.Desktop;

public sealed record Sale(Guid Id, DateTime Date, string Product, string Brand, string Category, string Sku,
    decimal Quantity, decimal PurchasePrice, decimal SalePrice, string Payment, string Notes)
{
    public decimal Cost => Quantity * PurchasePrice;
    public decimal Revenue => Quantity * SalePrice;
    public decimal UnitProfit => SalePrice - PurchasePrice;
    public decimal Profit => Quantity * UnitProfit;
}

public sealed record Product(Guid Id, string Name, string Brand, string Category, string Sku, decimal PurchasePrice, decimal SalePrice);
public sealed record DaySummary(DateTime Day, decimal Revenue, decimal Cost, decimal Profit, decimal BaseTarget, decimal PreviousDelay, decimal Target, decimal Difference, decimal CarriedDelay, int SalesCount, decimal Quantity)
{
    public decimal Progress => Target == 0 ? 0 : Math.Clamp(Profit / Target * 100, 0, 100);
    public decimal Remaining => Math.Max(Target - Profit, 0);
    public decimal Surplus => Math.Max(Profit - Target, 0);
}
