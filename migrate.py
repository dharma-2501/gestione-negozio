# ============================
# MIGRAZIONE VECCHIO → NUOVO DATABASE
# Primi 6 caratteri di "description" diventano categoria
# ============================
import sqlite3
import os
import sys
from datetime import datetime


# ==================== CONFIGURA I PERCORSI ====================
OLD_DB_PATH = "/Users/drgreen/Workspace/gestione-negozio/wh.db"
NEW_DB_PATH = "/Users/drgreen/Library/Application Support/gestione-negozio/negozio.db"

print(f"OLD_DB_PATH: {OLD_DB_PATH}")
print(f"NEW_DB_PATH: {NEW_DB_PATH}")

if not os.path.exists(OLD_DB_PATH):
    print("❌ Il file del vecchio database non esiste.")
    sys.exit(1)

if not os.path.isfile(OLD_DB_PATH):
    print("❌ Il percorso del vecchio database non è un file valido.")
    sys.exit(1)

if not os.access(OLD_DB_PATH, os.R_OK):
    print("❌ Il file del vecchio database esiste ma non è leggibile.")
    sys.exit(1)

print("✅ Il file del vecchio database esiste ed è leggibile.")
print("🚀 Inizio migrazione dal vecchio database...")


print("🚀 Inizio migrazione dal vecchio database...")

old_conn = sqlite3.connect(OLD_DB_PATH)
new_conn = sqlite3.connect(NEW_DB_PATH)

old_cur = old_conn.cursor()
new_cur = new_conn.cursor()

try:
    # Mappatura vecchio ID → nuovo ID prodotto
    old_to_new_id = {}
    inserted_count = 0
    skipped_count = 0

    # 1. Migra prodotti da Warehouse (permette duplicati di barcode)
    print("📦 Migrazione prodotti da Warehouse...")
    old_cur.execute("SELECT id, barcode, description, instock, public_price, private_price FROM Warehouse")
    
    for row in old_cur.fetchall():
        old_id = row[0]
        barcode = row[1]
        full_description = row[2] or f"Prodotto {barcode or 'senza nome'}"
        
        # Estrazione categoria (primi 6 caratteri)
        category = full_description[:6].strip()
        clean_name = full_description[6:].strip()
        if not clean_name:
            clean_name = full_description.strip()

        # Evita nome vuoto
        if not clean_name:
            clean_name = f"Prodotto {barcode or old_id}"
        
        public_price = float(row[4]) if row[4] is not None else 0.0
        private_price = float(row[5]) if row[5] is not None else None

        # Crea categoria se non esiste
        new_cur.execute("INSERT OR IGNORE INTO categories (name) VALUES (?)", (category,))

        try:
            # Inserisci prodotto (senza OR IGNORE → permette barcode duplicati)
            new_cur.execute("""
                INSERT INTO products 
                    (name, price, purchase_price, category, barcode, min_stock, created_at)
                VALUES (?, ?, ?, ?, ?, 5, CURRENT_TIMESTAMP)
            """, (clean_name, public_price, private_price, category, barcode))

            new_product_id = new_cur.lastrowid
            old_to_new_id[old_id] = new_product_id
            inserted_count += 1

        except Exception as e:
            print(f"⚠️  Riga saltata (ID {old_id}): {e}")
            skipped_count += 1
            continue

    new_conn.commit()
    print(f"✅ Prodotti migrati: {inserted_count} | Saltati: {skipped_count}")

    # 2. Migra stock usando la mappatura ID (funziona anche senza barcode)
    print("📦 Migrazione stock iniziale...")
    stock_count = 0
    old_cur.execute("SELECT id, instock FROM Warehouse")
    for old_id, instock in old_cur.fetchall():
        if old_id in old_to_new_id and instock and instock > 0:
            new_prod_id = old_to_new_id[old_id]
            new_cur.execute("""
                INSERT INTO stock_batches (product_id, quantity, entry_date, notes)
                VALUES (?, ?, CURRENT_TIMESTAMP, 'Migrazione dal vecchio database')
            """, (new_prod_id, instock))
            stock_count += 1

    new_conn.commit()
    print(f"✅ Stock migrato in stock_batches: {stock_count} record")

    # 3. Migra vendite (approssimativa)
    print("📦 Migrazione vendite...")
    try:
        old_cur.execute("SELECT * FROM Sales")
        for sale in old_cur.fetchall():
            barcode = sale[1] if len(sale) > 1 else None
            sale_date = sale[4] if len(sale) > 4 else datetime.now().isoformat()
            total = float(sale[5]) if len(sale) > 5 and sale[5] is not None else 0.0

            if not barcode:
                continue

            new_cur.execute("SELECT id FROM products WHERE barcode = ?", (barcode,))
            prod = new_cur.fetchone()
            if prod:
                prod_id = prod[0]
                new_cur.execute("INSERT INTO sales (date, total) VALUES (?, ?)", (sale_date, total))
                sale_id = new_cur.lastrowid
                new_cur.execute("""
                    INSERT INTO sale_items (sale_id, product_id, quantity, price)
                    VALUES (?, ?, 1, ?)
                """, (sale_id, prod_id, total))
    except Exception as e:
        print(f"⚠️ Tabella Sales non trovata o diversa: {e}")

    new_conn.commit()
    print("\n🎉 MIGRAZIONE COMPLETATA CON SUCCESSO!")

except Exception as e:
    print(f"❌ Errore durante la migrazione: {e}")
finally:
    old_conn.close()
    new_conn.close()

print("Script terminato.")