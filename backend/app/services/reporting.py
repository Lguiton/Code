import logging

import duckdb
import pandas as pd

from app.core.config import get_settings

logger = logging.getLogger(__name__)


def generate_tenant_monthly_report(tenant_id: str) -> pd.DataFrame:
    """Zero-ETL analytical aggregation over Postgres via DuckDB.

    ``tenant_id`` is passed as a bound parameter — never interpolated into the
    SQL string — so a malicious tenant identifier cannot break out of the query.
    """
    settings = get_settings()

    con = duckdb.connect()
    try:
        con.execute("INSTALL postgres;")
        con.execute("LOAD postgres;")

        # DATABASE_URL is operator-controlled server config, not user input.
        con.execute(f"ATTACH '{settings.DATABASE_URL}' AS pg_db (TYPE postgres);")

        query = """
            SELECT
                log_type,
                COUNT(*) AS total_logs_submitted,
                SUM(extracted_volume_gallons) AS total_volume_processed,
                AVG(ai_confidence_score) AS average_ai_confidence,
                COUNT(CASE WHEN structural_integrity_flag = false THEN 1 END) AS flagged_structural_issues
            FROM pg_db.compliance_logs
            WHERE tenant_id = ?
              AND status = 'VERIFIED'
              AND timestamp >= date_trunc('month', current_date)
            GROUP BY log_type;
        """
        return con.execute(query, [tenant_id]).df()
    finally:
        con.close()


if __name__ == "__main__":
    print("Executing DuckDB analytical query over Postgres...")
    print(generate_tenant_monthly_report("tenant-alpha-001").head())
