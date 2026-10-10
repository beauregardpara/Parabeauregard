using Microsoft.Data.Sqlite;
using System.Globalization;

namespace ParaBeauregard.Desktop;

public sealed class Database
{
    private readonly string _folder;
    private readonly string _connectionString;
    public string DatabasePath { get; }
    public string BackupFolder { get; }
    public Database()
    {
        _folder = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "ParaBeauregard");
        Directory.CreateDirectory(_folder); BackupFolder = Path.Combine(_folder, "backups"); Directory.CreateDirectory(BackupFolder);
        DatabasePath = Path.Combine(_folder, "ventes.db"); _connectionString = $"Data Source={DatabasePath}";
        Initialize();
    }
    private SqliteConnection Open() { var c = new SqliteConnection(_connectionString); c.Open(); return c; }
    private void Initialize()
    {
        using var c = Open(); using var cmd = c.CreateCommand();
        cmd.CommandText = @"PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, name TEXT NOT NULL, brand TEXT, category TEXT, sku TEXT, purchase REAL NOT NULL, sale REAL NOT NULL);
CREATE TABLE IF NOT EXISTS sales (id TEXT PRIMARY KEY, day TEXT NOT NULL, product TEXT NOT NULL, brand TEXT, category TEXT, sku TEXT, quantity REAL NOT NULL, purchase REAL NOT NULL, sale REAL NOT NULL, payment TEXT, notes TEXT);";
        cmd.ExecuteNonQuery();
        using var seed = c.CreateCommand(); seed.CommandText = "INSERT OR IGNORE INTO settings(key,value) VALUES ('daily_target','200')"; seed.ExecuteNonQuery();
    }
    public decimal Target { get { using var c = Open(); using var q = c.CreateCommand(); q.CommandText = "SELECT value FROM settings WHERE key='daily_target'"; return decimal.Parse((string?)q.ExecuteScalar() ?? "200", CultureInfo.InvariantCulture); } set { using var c = Open(); using var q = c.CreateCommand(); q.CommandText = "INSERT INTO settings(key,value) VALUES ('daily_target',$v) ON CONFLICT(key) DO UPDATE SET value=$v"; q.Parameters.AddWithValue("$v", value.ToString(CultureInfo.InvariantCulture)); q.ExecuteNonQuery(); } }
    public List<Sale> Sales()
    { using var c = Open(); using var q = c.CreateCommand(); q.CommandText = "SELECT * FROM sales ORDER BY day DESC"; using var r = q.ExecuteReader(); var list = new List<Sale>(); while (r.Read()) list.Add(new Sale(Guid.Parse(r.GetString(0)), DateTime.Parse(r.GetString(1), CultureInfo.InvariantCulture), r.GetString(2), r.GetString(3), r.GetString(4), r.GetString(5), r.GetDecimal(6), r.GetDecimal(7), r.GetDecimal(8), r.GetString(9), r.GetString(10))); return list; }
    public List<Product> Products()
    { using var c = Open(); using var q = c.CreateCommand(); q.CommandText = "SELECT * FROM products ORDER BY name"; using var r = q.ExecuteReader(); var list = new List<Product>(); while (r.Read()) list.Add(new Product(Guid.Parse(r.GetString(0)), r.GetString(1), r.GetString(2), r.GetString(3), r.GetString(4), r.GetDecimal(5), r.GetDecimal(6))); return list; }
    public void SaveSale(Sale s) { using var c = Open(); using var q = c.CreateCommand(); q.CommandText = "INSERT INTO sales VALUES ($id,$day,$p,$b,$cat,$sku,$qty,$buy,$sell,$pay,$notes) ON CONFLICT(id) DO UPDATE SET day=$day,product=$p,brand=$b,category=$cat,sku=$sku,quantity=$qty,purchase=$buy,sale=$sell,payment=$pay,notes=$notes"; Add(q, s); q.ExecuteNonQuery(); Backup(); }
    private static void Add(SqliteCommand q, Sale s) { q.Parameters.AddWithValue("$id", s.Id.ToString()); q.Parameters.AddWithValue("$day", s.Date.ToString("O")); q.Parameters.AddWithValue("$p", s.Product); q.Parameters.AddWithValue("$b", s.Brand); q.Parameters.AddWithValue("$cat", s.Category); q.Parameters.AddWithValue("$sku", s.Sku); q.Parameters.AddWithValue("$qty", s.Quantity); q.Parameters.AddWithValue("$buy", s.PurchasePrice); q.Parameters.AddWithValue("$sell", s.SalePrice); q.Parameters.AddWithValue("$pay", s.Payment); q.Parameters.AddWithValue("$notes", s.Notes); }
    public void Delete(Guid id) { using var c = Open(); using var q = c.CreateCommand(); q.CommandText = "DELETE FROM sales WHERE id=$id"; q.Parameters.AddWithValue("$id", id.ToString()); q.ExecuteNonQuery(); Backup(); }
    public void SaveProduct(Product p) { using var c = Open(); using var q = c.CreateCommand(); q.CommandText = "INSERT INTO products VALUES ($id,$n,$b,$c,$s,$buy,$sell) ON CONFLICT(id) DO UPDATE SET name=$n,brand=$b,category=$c,sku=$s,purchase=$buy,sale=$sell"; q.Parameters.AddWithValue("$id", p.Id.ToString()); q.Parameters.AddWithValue("$n", p.Name); q.Parameters.AddWithValue("$b", p.Brand); q.Parameters.AddWithValue("$c", p.Category); q.Parameters.AddWithValue("$s", p.Sku); q.Parameters.AddWithValue("$buy", p.PurchasePrice); q.Parameters.AddWithValue("$sell", p.SalePrice); q.ExecuteNonQuery(); }
    public string Backup() { var file = Path.Combine(BackupFolder, $"ventes-{DateTime.Now:yyyyMMdd-HHmmss}.db"); File.Copy(DatabasePath, file, true); return file; }
    public void Restore(string file) { File.Copy(file, DatabasePath, true); }
}
