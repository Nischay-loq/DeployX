from fastapi import APIRouter
import psycopg2
import psycopg2.extras

router = APIRouter()

# Database connection
def get_connection():
    return psycopg2.connect(
        dbname="deployx",
        user="postgres",
        password="YOUR_PASSWORD",
        host="localhost",
        port="5432"
    )

@router.get("/devices")
def get_devices():
    conn = get_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    query = """
        SELECT 
            d.id, 
            d.device_name, 
            d.ip_address::text AS ip_address,
            d.mac_address, 
            d.os, 
            d.status, 
            d.connection_type, 
            d.last_seen, 
            dg.group_name
        FROM devices d
        LEFT JOIN device_groups dg 
        ON d.group_id = dg.id
        ORDER BY d.last_seen DESC;
    """
    cur.execute(query)
    devices = cur.fetchall()

    cur.close()
    conn.close()

    # Return as plain array
    return devices
