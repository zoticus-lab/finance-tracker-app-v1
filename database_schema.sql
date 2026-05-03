-- ============================================================
-- PERSONAL FINANCE MANAGEMENT APP - MySQL Database Schema
-- ============================================================
-- This schema supports:
-- - Multi-account management
-- - Hierarchical 2-level categories
-- - 3-way transactions (Income, Expense, Transfer)
-- - Budgets with period tracking
-- - Goals with progress tracking
-- - User-specific dashboard card configuration
-- Script akan otomatis membuat database jika belum ada
-- ============================================================

CREATE DATABASE IF NOT EXISTS `personal_finance` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `personal_finance`;

-- ============================================================
-- 1. USERS TABLE
-- ============================================================
CREATE TABLE users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    default_currency VARCHAR(3) DEFAULT 'USD',
    profile_picture_url VARCHAR(255),
    date_of_birth DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_email (email),
    INDEX idx_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 2. ACCOUNTS TABLE (Wallets)
-- ============================================================
CREATE TABLE accounts (
    account_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    account_name VARCHAR(100) NOT NULL,
    account_type ENUM('bank', 'cash', 'savings', 'credit_card', 'investment', 'other') DEFAULT 'bank',
    balance DECIMAL(14, 2) DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'USD',
    color_code VARCHAR(7) DEFAULT '#3498db',
    icon VARCHAR(50),
    institution_name VARCHAR(100),
    account_number VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 3. CATEGORIES TABLE (Hierarchical 2-level structure)
-- ============================================================
CREATE TABLE categories (
    category_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    parent_category_id INT DEFAULT NULL,
    category_name VARCHAR(100) NOT NULL,
    category_type ENUM('income', 'expense') NOT NULL,
    icon VARCHAR(50),
    color_code VARCHAR(7) DEFAULT '#95a5a6',
    is_system_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (parent_category_id) REFERENCES categories(category_id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_parent_category_id (parent_category_id),
    INDEX idx_category_type (category_type),
    INDEX idx_is_system_default (is_system_default)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 4. TRANSACTIONS TABLE (Income, Expense, Transfer)
-- ============================================================
CREATE TABLE transactions (
    transaction_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    account_id INT NOT NULL,
    transaction_type ENUM('income', 'expense', 'transfer') NOT NULL,
    amount DECIMAL(14, 2) NOT NULL,
    category_id INT,
    description VARCHAR(255),
    transaction_date DATE NOT NULL,
    transaction_time TIME,
    notes TEXT,
    receipt_url VARCHAR(255),
    is_recurring BOOLEAN DEFAULT FALSE,
    recurring_pattern VARCHAR(50),
    tags VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES accounts(account_id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_account_id (account_id),
    INDEX idx_transaction_type (transaction_type),
    INDEX idx_transaction_date (transaction_date),
    INDEX idx_category_id (category_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 5. TRANSFERS TABLE (Tracks transfer transactions between accounts)
-- ============================================================
CREATE TABLE transfers (
    transfer_id INT PRIMARY KEY AUTO_INCREMENT,
    transaction_id INT NOT NULL,
    from_account_id INT NOT NULL,
    to_account_id INT NOT NULL,
    amount DECIMAL(14, 2) NOT NULL,
    exchange_rate DECIMAL(10, 4) DEFAULT 1.0000,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (transaction_id) REFERENCES transactions(transaction_id) ON DELETE CASCADE,
    FOREIGN KEY (from_account_id) REFERENCES accounts(account_id) ON DELETE CASCADE,
    FOREIGN KEY (to_account_id) REFERENCES accounts(account_id) ON DELETE CASCADE,
    INDEX idx_from_account_id (from_account_id),
    INDEX idx_to_account_id (to_account_id),
    INDEX idx_transaction_id (transaction_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 6. BUDGETS TABLE (Spending limits per category/period)
-- ============================================================
CREATE TABLE budgets (
    budget_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    category_id INT,
    budget_name VARCHAR(100),
    budget_limit DECIMAL(14, 2) NOT NULL,
    period_type ENUM('daily', 'weekly', 'monthly', 'yearly') NOT NULL DEFAULT 'monthly',
    period_start_date DATE NOT NULL,
    period_end_date DATE NOT NULL,
    spent_amount DECIMAL(14, 2) DEFAULT 0.00,
    overspend_warning BOOLEAN DEFAULT TRUE,
    alert_threshold DECIMAL(5, 2) DEFAULT 80.00,
    description TEXT,
    color_code VARCHAR(7) DEFAULT '#e74c3c',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_category_id (category_id),
    INDEX idx_period_type (period_type),
    INDEX idx_period_start_date (period_start_date),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 7. GOALS TABLE (Saving targets with progress)
-- ============================================================
CREATE TABLE goals (
    goal_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    account_id INT,
    goal_name VARCHAR(100) NOT NULL,
    target_amount DECIMAL(14, 2) NOT NULL,
    current_amount DECIMAL(14, 2) DEFAULT 0.00,
    target_date DATE,
    goal_status ENUM('active', 'completed', 'abandoned', 'paused') DEFAULT 'active',
    goal_category VARCHAR(50),
    color_code VARCHAR(7) DEFAULT '#2ecc71',
    icon VARCHAR(50),
    description TEXT,
    priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES accounts(account_id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_account_id (account_id),
    INDEX idx_goal_status (goal_status),
    INDEX idx_target_date (target_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 8. DASHBOARD CARDS CONFIGURATION TABLE
-- (Stores user-specific dashboard customization)
-- ============================================================
CREATE TABLE dashboard_cards (
    card_config_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    card_type VARCHAR(50) NOT NULL,
    card_title VARCHAR(100),
    is_enabled BOOLEAN DEFAULT TRUE,
    card_position INT DEFAULT 0,
    card_size ENUM('small', 'medium', 'large') DEFAULT 'medium',
    layout_column INT DEFAULT 1,
    custom_config JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_card_type (user_id, card_type),
    INDEX idx_user_id (user_id),
    INDEX idx_is_enabled (is_enabled),
    INDEX idx_card_position (card_position)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 9. RECURRING TRANSACTIONS TABLE (For handling recurring patterns)
-- ============================================================
CREATE TABLE recurring_transactions (
    recurring_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    account_id INT NOT NULL,
    category_id INT,
    transaction_type ENUM('income', 'expense') NOT NULL,
    amount DECIMAL(14, 2) NOT NULL,
    description VARCHAR(255),
    recurrence_type ENUM('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly') NOT NULL,
    recurrence_day INT,
    recurrence_month INT,
    start_date DATE NOT NULL,
    end_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    last_executed_date DATE,
    next_due_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES accounts(account_id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_next_due_date (next_due_date),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 10. ANALYTICS & INSIGHTS DATA TABLE
-- (Pre-calculated metrics for dashboard performance)
-- ============================================================
CREATE TABLE analytics_snapshots (
    snapshot_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    snapshot_date DATE NOT NULL,
    total_income DECIMAL(14, 2) DEFAULT 0.00,
    total_expense DECIMAL(14, 2) DEFAULT 0.00,
    net_balance DECIMAL(14, 2) DEFAULT 0.00,
    total_accounts_balance DECIMAL(14, 2) DEFAULT 0.00,
    total_budgets_available DECIMAL(14, 2) DEFAULT 0.00,
    total_budgets_spent DECIMAL(14, 2) DEFAULT 0.00,
    total_goals_balance DECIMAL(14, 2) DEFAULT 0.00,
    transaction_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_date (user_id, snapshot_date),
    INDEX idx_user_id (user_id),
    INDEX idx_snapshot_date (snapshot_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 11. EXPORT/IMPORT LOGS TABLE
-- (Tracks CSV exports and imports for audit trail)
-- ============================================================
CREATE TABLE data_export_logs (
    export_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    export_type ENUM('transactions', 'accounts', 'budgets', 'goals', 'full_export') NOT NULL,
    file_name VARCHAR(255),
    file_size INT,
    record_count INT,
    date_range_start DATE,
    date_range_end DATE,
    export_status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
    export_format VARCHAR(20) DEFAULT 'csv',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_export_status (export_status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 12. AUDIT LOG TABLE
-- (For tracking user actions and data changes)
-- ============================================================
CREATE TABLE audit_logs (
    log_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    action VARCHAR(255) NOT NULL,
    entity_type VARCHAR(50),
    entity_id INT,
    old_values JSON,
    new_values JSON,
    ip_address VARCHAR(45),
    user_agent VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_entity_type (entity_type),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================

-- View: Account Summary with Total Balance
CREATE VIEW account_summary AS
SELECT 
    a.account_id,
    a.user_id,
    a.account_name,
    a.account_type,
    a.balance,
    a.currency,
    a.color_code,
    COUNT(DISTINCT t.transaction_id) as transaction_count,
    MAX(t.created_at) as last_transaction_date
FROM accounts a
LEFT JOIN transactions t ON a.account_id = t.account_id
GROUP BY a.account_id, a.user_id, a.account_name, a.account_type, a.balance, a.currency, a.color_code;

-- View: Monthly Budget Status
CREATE VIEW monthly_budget_status AS
SELECT 
    b.budget_id,
    b.user_id,
    b.category_id,
    b.budget_name,
    b.budget_limit,
    b.spent_amount,
    ROUND((b.spent_amount / b.budget_limit) * 100, 2) as spent_percentage,
    CASE 
        WHEN b.spent_amount > b.budget_limit THEN 'overspent'
        WHEN (b.spent_amount / b.budget_limit) >= (b.alert_threshold / 100) THEN 'warning'
        ELSE 'on_track'
    END as budget_status,
    (b.budget_limit - b.spent_amount) as remaining_amount,
    b.period_start_date,
    b.period_end_date
FROM budgets b
WHERE b.is_active = TRUE;

-- View: Goal Progress
CREATE VIEW goal_progress AS
SELECT 
    g.goal_id,
    g.user_id,
    g.goal_name,
    g.target_amount,
    g.current_amount,
    ROUND((g.current_amount / g.target_amount) * 100, 2) as progress_percentage,
    DATEDIFF(g.target_date, CURDATE()) as days_remaining,
    CASE 
        WHEN g.current_amount >= g.target_amount THEN 'completed'
        WHEN DATEDIFF(g.target_date, CURDATE()) < 0 THEN 'overdue'
        ELSE 'in_progress'
    END as goal_status,
    (g.target_amount - g.current_amount) as amount_remaining
FROM goals g
WHERE g.goal_status IN ('active', 'completed');

-- View: Daily Cash Flow
CREATE VIEW daily_cash_flow AS
SELECT 
    t.transaction_date,
    t.user_id,
    SUM(CASE WHEN t.transaction_type = 'income' THEN t.amount ELSE 0 END) as daily_income,
    SUM(CASE WHEN t.transaction_type = 'expense' THEN t.amount ELSE 0 END) as daily_expense,
    SUM(CASE WHEN t.transaction_type = 'income' THEN t.amount 
             WHEN t.transaction_type = 'expense' THEN -t.amount 
             ELSE 0 END) as daily_net
FROM transactions t
GROUP BY t.transaction_date, t.user_id;

-- ============================================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- ============================================================

-- Additional composite indexes for common queries
CREATE INDEX idx_transaction_user_date ON transactions(user_id, transaction_date);
CREATE INDEX idx_transaction_account_type ON transactions(account_id, transaction_type);
CREATE INDEX idx_budget_user_period ON budgets(user_id, period_start_date, period_end_date);
CREATE INDEX idx_goal_user_status ON goals(user_id, goal_status);
CREATE INDEX idx_category_user_type ON categories(user_id, category_type);

-- ============================================================
-- END OF SCHEMA
-- ============================================================
