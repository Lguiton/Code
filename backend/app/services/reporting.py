import duckdb
import os
import pandas as pd

def generate_tenant_monthly_report(tenant_id: str) -> pd.DataFrame:
"""
Zero-ETL Analytical Aggregation. 
Uses DuckDB to attach to Postgres and perform fast OLAP queries.
"""
pg_url = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/eivanta_code")

# Initialize an in-memory DuckDB connection
con = duckdb.connect()

# Install and load the Postgres scanner extension
con.execute("INSTALL postgres;")
con.execute("LOAD postgres;")

# Attach the live Postgres database directly
con.execute(f"ATTACH '{pg_url}' AS pg_db (TYPE postgres);")

# Run the complex analytical aggregation workload
query = f"""
    SELECT 
        log_type,
        COUNT(*) as total_logs_submitted,
        SUM(extracted_volume_gallons) as total_volume_processed,
        AVG(ai_confidence_score) as average_ai_confidence,
        COUNT(CASE WHEN structural_integrity_flag = false THEN 1 END) as flagged_structural_issues
    FROM pg_db.compliance_logs
    WHERE tenant_id = '{tenant_id}'
      AND status = 'VERIFIED'
      AND timestamp >= date_trunc('month', current_date)
    GROUP BY log_type;
"""

# Execute and return as a Pandas DataFrame for easy PDF generation
report_df = con.execute(query).df()
return report_df

if __name__ == "__main__":
# Test execution
print("Executing DuckDB Analytical Query over Postgres...")
df = generate_tenant_monthly_report("tenant-alpha-001")
print(df.head())
