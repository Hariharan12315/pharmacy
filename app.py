from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import mysql.connector
from datetime import datetime
import os
from dotenv import load_dotenv
import requests
import uuid

load_dotenv()

# --- Credentials ---
TWILIO_SID   = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_PHONE = os.getenv("TWILIO_FROM_NUMBER")
FAST2SMS_KEY = os.getenv("FAST2SMS_API_KEY")

# Twilio (imported lazily so app starts even if not installed)
try:
    from twilio.rest import Client as TwilioClient
    twilio_client = TwilioClient(TWILIO_SID, TWILIO_TOKEN)
except Exception:
    twilio_client = None

# ── Flask setup ────────────────────────────────────────────────────────────────
# Serve the React production build from ./frontend/dist
REACT_BUILD = os.path.join(os.path.dirname(__file__), 'frontend', 'dist')

app = Flask(__name__, static_folder=REACT_BUILD, static_url_path='')
CORS(app)   # allow Vite dev-server proxy and direct API calls

# ── MySQL config ───────────────────────────────────────────────────────────────
DB_CONFIG = {
    'host':     os.getenv('DB_HOST', 'localhost'),
    'user':     os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD', ''),
    'database': os.getenv('DB_NAME', 'pharmacy_db'),
    'port':     int(os.getenv('DB_PORT', 3306)),
}

def get_db():
    try:
        return mysql.connector.connect(**DB_CONFIG)
    except mysql.connector.Error as err:
        print(f"DB Error: {err}")
        return None


def init_database():
    try:
        conn = mysql.connector.connect(
            host=DB_CONFIG['host'], user=DB_CONFIG['user'],
            password=DB_CONFIG['password'], port=DB_CONFIG['port']
        )
        cur = conn.cursor()
        cur.execute(f"CREATE DATABASE IF NOT EXISTS {DB_CONFIG['database']}")
        cur.execute(f"USE {DB_CONFIG['database']}")

        cur.execute("""
        CREATE TABLE IF NOT EXISTS medicines (
            id VARCHAR(36) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            manufacturer VARCHAR(255) NOT NULL,
            category VARCHAR(100) NOT NULL,
            current_stock INT NOT NULL DEFAULT 0,
            min_stock_level INT NOT NULL DEFAULT 10,
            price_per_unit DECIMAL(10,2) NOT NULL,
            expiry_date DATE NOT NULL,
            batch_number VARCHAR(100) NOT NULL,
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )""")

        cur.execute("""
        CREATE TABLE IF NOT EXISTS customers (
            id VARCHAR(36) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            phone VARCHAR(20) NOT NULL UNIQUE,
            email VARCHAR(255),
            address TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )""")

        cur.execute("""
        CREATE TABLE IF NOT EXISTS transactions (
            id VARCHAR(36) PRIMARY KEY,
            customer_id VARCHAR(36) NOT NULL,
            medicine_id VARCHAR(36) NOT NULL,
            quantity INT NOT NULL,
            unit_price DECIMAL(10,2) NOT NULL,
            total_amount DECIMAL(10,2) NOT NULL,
            status VARCHAR(50) DEFAULT 'completed',
            sms_notification_sent BOOLEAN DEFAULT FALSE,
            voice_call_scheduled BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customers(id),
            FOREIGN KEY (medicine_id) REFERENCES medicines(id)
        )""")

        cur.execute("""
        CREATE TABLE IF NOT EXISTS notifications (
            id VARCHAR(36) PRIMARY KEY,
            customer_id VARCHAR(36) NOT NULL,
            medicine_id VARCHAR(36),
            type VARCHAR(50) NOT NULL,
            message TEXT NOT NULL,
            status VARCHAR(50) DEFAULT 'pending',
            scheduled_at TIMESTAMP NULL,
            sent_at TIMESTAMP NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customers(id),
            FOREIGN KEY (medicine_id) REFERENCES medicines(id)
        )""")

        # Sample data (only inserted once)
        cur.execute("SELECT COUNT(*) FROM medicines")
        if cur.fetchone()[0] == 0:
            sample = [
                (str(uuid.uuid4()), 'Paracetamol 500mg', 'PharmaCorp',  'Analgesic',        50, 10, 5.50,  '2026-12-15', 'PAR2024001', 'Pain reliever & fever reducer'),
                (str(uuid.uuid4()), 'Amoxicillin 250mg', 'MediPharma', 'Antibiotic',        30, 10, 12.75, '2026-08-30', 'AMX2024002', 'Broad-spectrum antibiotic'),
                (str(uuid.uuid4()), 'Ibuprofen 400mg',   'HealthPlus', 'Anti-inflammatory', 20, 15, 8.25,  '2026-11-20', 'IBU2024003', 'Anti-inflammatory pain relief'),
                (str(uuid.uuid4()), 'Vitamin C 500mg',   'NutriCare',  'Supplements',       80, 20, 4.00,  '2027-06-01', 'VTC2024004', 'Immune system support'),
            ]
            cur.executemany("""
                INSERT INTO medicines
                  (id,name,manufacturer,category,current_stock,min_stock_level,
                   price_per_unit,expiry_date,batch_number,description)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            """, sample)

        cur.execute("SELECT COUNT(*) FROM customers")
        if cur.fetchone()[0] == 0:
            cust = [
                (str(uuid.uuid4()), 'John Smith',    '+911234567890', 'john@email.com',  '123 Main St'),
                (str(uuid.uuid4()), 'Priya Sharma',  '+919876543210', 'priya@email.com', '45 MG Road'),
                (str(uuid.uuid4()), 'Rajan Pillai',  '+919500001234', 'rajan@email.com', '12 Anna Nagar'),
            ]
            cur.executemany(
                "INSERT INTO customers (id,name,phone,email,address) VALUES (%s,%s,%s,%s,%s)",
                cust
            )

        conn.commit(); cur.close(); conn.close()
        print("✅ Database ready.")
        return True
    except mysql.connector.Error as err:
        print(f"❌ DB init failed: {err}")
        return False


# ── Notification helpers ───────────────────────────────────────────────────────
def send_sms(phone, message):
    url = "https://www.fast2sms.com/dev/bulkV2"
    try:
        r = requests.post(url,
            data={"sender_id":"TXTIND","message":message,"language":"english",
                  "route":"v3","numbers":phone},
            headers={"authorization": FAST2SMS_KEY,
                     "Content-Type": "application/x-www-form-urlencoded"})
        print("📱 SMS:", r.text)
    except Exception as e:
        print("SMS error:", e)

def send_voice_call(phone, message):
    if not twilio_client:
        print("Twilio not configured, skipping voice call.")
        return
    try:
        call = twilio_client.calls.create(
            twiml=f'<Response><Say voice="alice">{message}</Say></Response>',
            to=phone, from_=TWILIO_PHONE
        )
        print(f"📞 Call SID: {call.sid}")
    except Exception as e:
        print("Call error:", e)


# ── React SPA catch-all ────────────────────────────────────────────────────────
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_react(path):
    # Serve API routes normally; everything else → React index.html
    if path.startswith('api/'):
        return jsonify({"error": "Not found"}), 404
    full = os.path.join(REACT_BUILD, path)
    if path and os.path.exists(full):
        return send_from_directory(REACT_BUILD, path)
    return send_from_directory(REACT_BUILD, 'index.html')


# ── API Routes ─────────────────────────────────────────────────────────────────
@app.route('/api/dashboard/stats')
def dashboard_stats():
    conn = get_db()
    if not conn: return jsonify({"error": "DB error"}), 500
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute("SELECT COUNT(*) as c FROM medicines"); tm = cur.fetchone()['c']
        cur.execute("SELECT COUNT(*) as c FROM medicines WHERE current_stock <= min_stock_level"); ls = cur.fetchone()['c']
        cur.execute("SELECT COUNT(*) as c FROM customers"); tc = cur.fetchone()['c']
        cur.execute("SELECT COALESCE(SUM(total_amount),0) as t FROM transactions WHERE DATE(created_at)=CURDATE()"); ts = float(cur.fetchone()['t'])
        return jsonify({"totalMedicines": tm, "lowStockItems": ls, "totalCustomers": tc, "todaysSales": ts})
    finally:
        cur.close(); conn.close()


@app.route('/api/medicines', methods=['GET'])
def get_medicines():
    conn = get_db()
    if not conn: return jsonify({"error": "DB error"}), 500
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute("SELECT * FROM medicines ORDER BY created_at DESC")
        rows = cur.fetchall()
        for r in rows:
            r['price_per_unit'] = str(r['price_per_unit'])
            r['expiry_date']    = r['expiry_date'].isoformat()
            r['created_at']     = r['created_at'].isoformat()
        return jsonify(rows)
    finally:
        cur.close(); conn.close()


@app.route('/api/medicines', methods=['POST'])
def add_medicine():
    conn = get_db()
    if not conn: return jsonify({"error": "DB error"}), 500
    cur = conn.cursor(dictionary=True)
    d = request.json
    mid = str(uuid.uuid4())
    try:
        cur.execute("""
            INSERT INTO medicines
              (id,name,manufacturer,category,current_stock,min_stock_level,
               price_per_unit,expiry_date,batch_number,description)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """, (mid, d['name'], d['manufacturer'], d['category'],
              d['currentStock'], d['minStockLevel'], d['pricePerUnit'],
              d['expiryDate'], d['batchNumber'], d.get('description','')))
        conn.commit()
        cur.execute("SELECT * FROM medicines WHERE id=%s", (mid,))
        r = cur.fetchone()
        r['price_per_unit'] = str(r['price_per_unit'])
        r['expiry_date']    = r['expiry_date'].isoformat()
        r['created_at']     = r['created_at'].isoformat()
        return jsonify(r), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close(); conn.close()


@app.route('/api/customers', methods=['GET'])
def get_customers():
    conn = get_db()
    if not conn: return jsonify({"error": "DB error"}), 500
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute("SELECT * FROM customers ORDER BY created_at DESC")
        rows = cur.fetchall()
        for r in rows:
            r['created_at'] = r['created_at'].isoformat()
        return jsonify(rows)
    finally:
        cur.close(); conn.close()


@app.route('/api/customers', methods=['POST'])
def add_customer():
    conn = get_db()
    if not conn: return jsonify({"error": "DB error"}), 500
    cur = conn.cursor(dictionary=True)
    d = request.json
    cid = str(uuid.uuid4())
    try:
        cur.execute(
            "INSERT INTO customers (id,name,phone,email,address) VALUES (%s,%s,%s,%s,%s)",
            (cid, d['name'], d['phone'], d.get('email'), d.get('address'))
        )
        conn.commit()
        cur.execute("SELECT * FROM customers WHERE id=%s", (cid,))
        r = cur.fetchone(); r['created_at'] = r['created_at'].isoformat()
        return jsonify(r), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close(); conn.close()


@app.route('/api/transactions', methods=['GET'])
def get_transactions():
    conn = get_db()
    if not conn: return jsonify({"error": "DB error"}), 500
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute("""
            SELECT t.*, c.name as customer_name, m.name as medicine_name
            FROM transactions t
            JOIN customers c ON t.customer_id = c.id
            JOIN medicines  m ON t.medicine_id = m.id
            ORDER BY t.created_at DESC
        """)
        rows = cur.fetchall()
        for r in rows:
            r['unit_price']   = str(r['unit_price'])
            r['total_amount'] = str(r['total_amount'])
            r['created_at']   = r['created_at'].isoformat()
        return jsonify(rows)
    finally:
        cur.close(); conn.close()


@app.route('/api/transactions', methods=['POST'])
def add_transaction():
    conn = get_db()
    if not conn: return jsonify({"error": "DB error"}), 500
    cur = conn.cursor(dictionary=True)
    d = request.json
    try:
        phone        = d.get('phone', '')
        cust_name    = d.get('customer_name', 'Customer')
        med_name     = d.get('medicine_name', '')
        qty          = int(d.get('quantity', 1))
        unit_price   = float(d.get('unit_price', 0))
        total_amount = float(d.get('total', 0))
        send_sms_flag = d.get('send_sms', 'no') == 'yes'

        # Get or create customer
        cur.execute("SELECT id FROM customers WHERE phone=%s", (phone,))
        cust = cur.fetchone()
        if cust:
            cid = cust['id']
        else:
            cid = str(uuid.uuid4())
            cur.execute("INSERT INTO customers (id,name,phone) VALUES (%s,%s,%s)", (cid, cust_name, phone))

        # Get medicine
        cur.execute("SELECT id, expiry_date FROM medicines WHERE name=%s", (med_name,))
        med = cur.fetchone()
        if not med:
            return jsonify({"error": "Medicine not found"}), 404
        mid, expiry = med['id'], med['expiry_date']

        # Insert transaction
        tid = str(uuid.uuid4())
        cur.execute("""
            INSERT INTO transactions
              (id,customer_id,medicine_id,quantity,unit_price,total_amount,status,sms_notification_sent)
            VALUES (%s,%s,%s,%s,%s,%s,'completed',%s)
        """, (tid, cid, mid, qty, unit_price, total_amount, send_sms_flag))

        # Reduce stock
        cur.execute("UPDATE medicines SET current_stock = current_stock - %s WHERE id=%s", (qty, mid))
        conn.commit()

        # Notifications
        if send_sms_flag:
            msg = (f"Hello {cust_name}, you purchased {med_name} x{qty} for ₹{total_amount:.2f}. "
                   f"Expiry: {expiry}. Thank you — MediStock Pro.")
            send_sms(phone.replace('+91',''), msg)
            send_voice_call(phone, f"Hello {cust_name}. Reminder: your medicine {med_name} expires on {expiry}. Please check and renew if needed.")

        return jsonify({"status": "success"}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close(); conn.close()


@app.route('/api/notifications', methods=['GET'])
def get_notifications():
    conn = get_db()
    if not conn: return jsonify({"error": "DB error"}), 500
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute("""
            SELECT n.*, c.name as customer_name, m.name as medicine_name
            FROM notifications n
            JOIN customers c ON n.customer_id = c.id
            LEFT JOIN medicines m ON n.medicine_id = m.id
            ORDER BY n.created_at DESC
        """)
        rows = cur.fetchall()
        for r in rows:
            for k in ('created_at','scheduled_at','sent_at'):
                if r.get(k): r[k] = r[k].isoformat()
        return jsonify(rows)
    finally:
        cur.close(); conn.close()


# ──────────────────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    print("Initializing database...")
    init_database()
    print("Starting Flask on http://localhost:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)
