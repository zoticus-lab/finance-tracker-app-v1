#!/bin/bash
# Quick Setup Script untuk Fitur Utang Piutang
# Uncomment dan jalankan sesuai kebutuhan

# ===== DATABASE SETUP =====

# Option 1: Run Laravel Migrations (Recommended)
# cd backend
# php artisan migrate

# Option 2: Run specific migrations only
# php artisan migrate --path=database/migrations/2024_03_28_create_debts_table.php
# php artisan migrate --path=database/migrations/2024_03_28_create_debt_payments_table.php
# php artisan migrate --path=database/migrations/2024_03_28_create_credits_table.php
# php artisan migrate --path=database/migrations/2024_03_28_create_credit_payments_table.php

# Option 3: Manual SQL (if PHP not available)
# mysql -u root -p personal_finance < database/migrations/utang_piutang_schema.sql

# ===== Laravel SETUP =====
# cd backend

# Clear cache after adding new models
# php artisan cache:clear
# php artisan config:cache

# Refresh autoloader
# composer dump-autoload

# ===== VERIFY MIGRATIONS =====
# php artisan migrate:status
# php artisan route:list | grep -E "(debt|credit)"

# ===== FRONTEND BUILD =====
# cd ../frontend

# Development mode
# npm run dev

# Production build
# npm run build

# ===== TEST ENDPOINTS (using curl) =====

# Test Debts List (requires auth token)
# curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8000/api/debts

# Test Credits List
# curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8000/api/credits

# ===== FRONTEND ACCESS =====
# Development: http://localhost:5173 (or configured port)
# Production: http://localhost or your domain

# ===== VERIFICATION STEPS =====
# 1. Login to app
# 2. Click menu "Hutang" or "Piutang"
# 3. Create test record
# 4. Verify in database: SELECT * FROM debts/credits;
# 5. Add payment and verify progress updates
# 6. Delete payment and verify recalculation
# 7. Complete flow testing
