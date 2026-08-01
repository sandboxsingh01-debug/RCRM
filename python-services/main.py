from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import sqlite3
import json
from typing import Optional
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = "../backend/database/crm.db"

@app.post("/api/import/preview")
async def preview_excel(file: UploadFile = File(...)):
    """Preview Excel file columns and first few rows"""
    try:
        df = pd.read_excel(file.file)
        
        preview = {
            "columns": df.columns.tolist(),
            "row_count": len(df),
            "preview_data": df.head(5).to_dict('records')
        }
        
        return {"success": True, "data": preview}
    except Exception as e:
        return {"success": False, "message": str(e)}

@app.post("/api/import/leads")
async def import_leads(
    file: UploadFile = File(...),
    mapping: str = Form(...)
):
    """Import leads from Excel with column mapping"""
    try:
        df = pd.read_excel(file.file)
        column_mapping = json.loads(mapping)
        
        # Rename columns based on mapping
        df = df.rename(columns=column_mapping)
        
        # Connect to database
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        imported = 0
        errors = []
        
        for idx, row in df.iterrows():
            try:
                lead_id = f"LD{pd.Timestamp.now().timestamp():.0f}{idx}"
                
                cursor.execute("""
                    INSERT INTO leads (
                        lead_id, company_name, contact_person, mobile, 
                        whatsapp_number, email, address, city, state, 
                        gst_number, industry_type, lead_source, notes
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    lead_id,
                    row.get('company_name'),
                    row.get('contact_person'),
                    row.get('mobile'),
                    row.get('whatsapp_number'),
                    row.get('email'),
                    row.get('address'),
                    row.get('city'),
                    row.get('state'),
                    row.get('gst_number'),
                    row.get('industry_type'),
                    row.get('lead_source'),
                    row.get('notes')
                ))
                imported += 1
            except Exception as e:
                errors.append(f"Row {idx + 1}: {str(e)}")
        
        conn.commit()
        conn.close()
        
        return {
            "success": True,
            "imported": imported,
            "errors": errors
        }
    except Exception as e:
        return {"success": False, "message": str(e)}

@app.post("/api/import/customers")
async def import_customers(
    file: UploadFile = File(...),
    mapping: str = Form(...)
):
    """Import customers from Excel"""
    try:
        df = pd.read_excel(file.file)
        column_mapping = json.loads(mapping)
        df = df.rename(columns=column_mapping)
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        imported = 0
        errors = []
        
        for idx, row in df.iterrows():
            try:
                customer_id = f"CUST{pd.Timestamp.now().timestamp():.0f}{idx}"
                
                cursor.execute("""
                    INSERT INTO customers (
                        customer_id, company_name, contact_person, mobile,
                        whatsapp_number, email, gst_number, billing_address,
                        city, state, software_purchased, purchase_date
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    customer_id,
                    row.get('company_name'),
                    row.get('contact_person'),
                    row.get('mobile'),
                    row.get('whatsapp_number'),
                    row.get('email'),
                    row.get('gst_number'),
                    row.get('billing_address'),
                    row.get('city'),
                    row.get('state'),
                    row.get('software_purchased'),
                    row.get('purchase_date')
                ))
                
                # Auto-create training schedule
                new_customer_id = cursor.lastrowid
                trainings = [
                    (new_customer_id, 1, 'SOFTWARE OVERVIEW'),
                    (new_customer_id, 2, 'BASIC TRAINING (SALE & PURCHASE)'),
                    (new_customer_id, 3, 'ACCOUNTANCY'),
                    (new_customer_id, 4, 'GST TRAINING'),
                    (new_customer_id, 5, 'REPORTING TRAINING')
                ]
                
                cursor.executemany(
                    'INSERT INTO training_schedule (customer_id, day_number, training_title) VALUES (?, ?, ?)',
                    trainings
                )
                
                imported += 1
            except Exception as e:
                errors.append(f"Row {idx + 1}: {str(e)}")
        
        conn.commit()
        conn.close()
        
        return {
            "success": True,
            "imported": imported,
            "errors": errors
        }
    except Exception as e:
        return {"success": False, "message": str(e)}

@app.get("/api/analytics/summary")
def get_analytics_summary():
    """Get analytics summary"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        stats = {}
        
        # Lead conversion rate
        cursor.execute("SELECT COUNT(*) FROM leads WHERE status = 'lead'")
        stats['total_leads'] = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM leads WHERE status = 'customer'")
        stats['converted_customers'] = cursor.fetchone()[0]
        
        stats['conversion_rate'] = (
            (stats['converted_customers'] / stats['total_leads'] * 100)
            if stats['total_leads'] > 0 else 0
        )
        
        # Average ticket resolution time
        cursor.execute("""
            SELECT AVG(julianday(resolved_at) - julianday(created_at)) 
            FROM tickets WHERE status = 'resolved'
        """)
        result = cursor.fetchone()[0]
        stats['avg_resolution_days'] = round(result, 2) if result else 0
        
        conn.close()
        
        return {"success": True, "data": stats}
    except Exception as e:
        return {"success": False, "message": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
