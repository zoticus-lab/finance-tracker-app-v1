-- ============================================================
-- PERSONAL FINANCE APP - SQL QUERY EXAMPLES & USE CASES
-- ============================================================
-- Practical queries demonstrating how to use the schema
-- ============================================================

-- ============================================================
-- 1. DASHBOARD QUERIES
-- ============================================================

-- Get overall account summary for user dashboard
SELECT 
    COUNT(DISTINCT a.account_id) as total_accounts,
    SUM(a.balance) as total_balance,
    COUNT(DISTINCT t.transaction_id) as total_transactions
FROM accounts a
LEFT JOIN transactions t ON a.account_id = t.account_id
WHERE a.user_id = 1
GROUP BY a.user_id;

-- Get all accounts with balances (for account card)
SELECT 
    a.account_id,
    a.account_name,
    a.account_type,
    a.balance,
    a.currency,
    a.color_code,
    (SELECT COUNT(*) FROM transactions WHERE account_id = a.account_id) as transaction_count
FROM accounts a
WHERE a.user_id = 1 AND a.is_active = TRUE
ORDER BY a.created_at DESC;

-- Get daily balance trend (last 30 days) for chart
SELECT 
    t.transaction_date,
    SUM(a.balance) as total_balance
FROM (
    SELECT DISTINCT transaction_date FROM transactions 
    WHERE user_id = 1 AND transaction_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
) as dates
LEFT JOIN transactions t ON t.transaction_date = dates.transaction_date
LEFT JOIN accounts a ON t.account_id = a.account_id
WHERE t.user_id = 1
GROUP BY t.transaction_date
ORDER BY t.transaction_date ASC;

-- Get monthly cash flow (income vs expense) for bar chart
SELECT 
    DATE_FORMAT(t.transaction_date, '%Y-%m') as month,
    SUM(CASE WHEN t.transaction_type = 'income' THEN t.amount ELSE 0 END) as income,
    SUM(CASE WHEN t.transaction_type = 'expense' THEN t.amount ELSE 0 END) as expense,
    SUM(CASE WHEN t.transaction_type = 'income' THEN t.amount 
             WHEN t.transaction_type = 'expense' THEN -t.amount ELSE 0 END) as net_cash_flow
FROM transactions t
WHERE t.user_id = 1 AND t.transaction_type IN ('income', 'expense')
    AND t.transaction_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
GROUP BY DATE_FORMAT(t.transaction_date, '%Y-%m')
ORDER BY month ASC;

-- Get expense breakdown by category (donut chart)
SELECT 
    c.category_id,
    c.category_name,
    c.color_code,
    SUM(t.amount) as total_spent,
    ROUND(SUM(t.amount) / (SELECT SUM(amount) FROM transactions 
        WHERE user_id = 1 AND transaction_type = 'expense' 
        AND transaction_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)) * 100, 2) as percentage
FROM transactions t
JOIN categories c ON t.category_id = c.category_id
WHERE t.user_id = 1 AND t.transaction_type = 'expense'
    AND t.transaction_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
GROUP BY c.category_id, c.category_name, c.color_code
ORDER BY total_spent DESC;

-- Get last 10 transactions (for list view)
SELECT 
    t.transaction_id,
    t.transaction_type,
    t.amount,
    c.category_name,
    a.account_name,
    t.description,
    t.transaction_date,
    c.color_code
FROM transactions t
LEFT JOIN categories c ON t.category_id = c.category_id
LEFT JOIN accounts a ON t.account_id = a.account_id
WHERE t.user_id = 1
ORDER BY t.transaction_date DESC, t.created_at DESC
LIMIT 10;

-- ============================================================
-- 2. CATEGORY MANAGEMENT QUERIES
-- ============================================================

-- Get all expense categories (hierarchical)
SELECT 
    c.category_id,
    c.category_name,
    c.parent_category_id,
    pc.category_name as parent_name,
    c.color_code,
    c.icon
FROM categories c
LEFT JOIN categories pc ON c.parent_category_id = pc.category_id
WHERE c.user_id = 1 AND c.category_type = 'expense'
ORDER BY COALESCE(c.parent_category_id, c.category_id), c.category_id;

-- Get subcategories for a parent category
SELECT 
    c.category_id,
    c.category_name,
    c.color_code,
    c.icon,
    COUNT(t.transaction_id) as usage_count
FROM categories c
LEFT JOIN transactions t ON c.category_id = t.category_id
WHERE c.parent_category_id = 5 AND c.user_id = 1
GROUP BY c.category_id, c.category_name, c.color_code, c.icon;

-- ============================================================
-- 3. BUDGET QUERIES
-- ============================================================

-- Get current month budget status
SELECT 
    b.budget_id,
    b.budget_name,
    c.category_name,
    b.budget_limit,
    b.spent_amount,
    ROUND((b.spent_amount / b.budget_limit) * 100, 2) as spent_percentage,
    (b.budget_limit - b.spent_amount) as remaining_amount,
    CASE 
        WHEN b.spent_amount > b.budget_limit THEN 'OVERSPENT'
        WHEN (b.spent_amount / b.budget_limit) >= (b.alert_threshold / 100) THEN 'WARNING'
        ELSE 'ON_TRACK'
    END as budget_status,
    b.period_start_date,
    b.period_end_date
FROM budgets b
LEFT JOIN categories c ON b.category_id = c.category_id
WHERE b.user_id = 1 
    AND b.is_active = TRUE
    AND CURDATE() BETWEEN b.period_start_date AND b.period_end_date
ORDER BY (b.spent_amount / b.budget_limit) DESC;

-- Calculate spent amount for budget (triggered when transaction is created)
UPDATE budgets b
SET b.spent_amount = (
    SELECT COALESCE(SUM(t.amount), 0)
    FROM transactions t
    WHERE t.user_id = b.user_id 
        AND t.category_id = b.category_id
        AND t.transaction_type = 'expense'
        AND t.transaction_date BETWEEN b.period_start_date AND b.period_end_date
)
WHERE b.user_id = 1 AND b.is_active = TRUE;

-- Get budgets that are about to be exceeded (alert calculation)
SELECT 
    b.budget_id,
    b.budget_name,
    c.category_name,
    b.budget_limit,
    b.spent_amount,
    ROUND((b.spent_amount / b.budget_limit) * 100, 2) as spent_percentage,
    (b.budget_limit - b.spent_amount) as remaining_amount
FROM budgets b
LEFT JOIN categories c ON b.category_id = c.category_id
WHERE b.user_id = 1
    AND b.is_active = TRUE
    AND b.overspend_warning = TRUE
    AND (b.spent_amount / b.budget_limit) >= 0.85;

-- ============================================================
-- 4. GOAL QUERIES
-- ============================================================

-- Get all goals with progress information
SELECT 
    g.goal_id,
    g.goal_name,
    g.target_amount,
    g.current_amount,
    ROUND((g.current_amount / g.target_amount) * 100, 2) as progress_percentage,
    (g.target_amount - g.current_amount) as amount_remaining,
    DATEDIFF(g.target_date, CURDATE()) as days_remaining,
    g.target_date,
    g.goal_status,
    g.priority,
    g.color_code
FROM goals g
WHERE g.user_id = 1 AND g.goal_status = 'active'
ORDER BY g.priority DESC, g.progress_percentage DESC;

-- Get goals near completion (>80% done)
SELECT 
    g.goal_id,
    g.goal_name,
    g.target_amount,
    g.current_amount,
    ROUND((g.current_amount / g.target_amount) * 100, 2) as progress_percentage,
    DATEDIFF(g.target_date, CURDATE()) as days_remaining
FROM goals g
WHERE g.user_id = 1 
    AND g.goal_status = 'active'
    AND (g.current_amount / g.target_amount) >= 0.80
ORDER BY progress_percentage DESC;

-- ============================================================
-- 5. TRANSACTION QUERIES
-- ============================================================

-- Get transactions for a specific date range with category hierarchy
SELECT 
    t.transaction_id,
    t.transaction_type,
    t.amount,
    a.account_name,
    c.category_name as sub_category,
    pc.category_name as parent_category,
    t.description,
    t.transaction_date,
    t.created_at
FROM transactions t
LEFT JOIN categories c ON t.category_id = c.category_id
LEFT JOIN categories pc ON c.parent_category_id = pc.category_id
LEFT JOIN accounts a ON t.account_id = a.account_id
WHERE t.user_id = 1 
    AND t.transaction_date BETWEEN '2026-03-01' AND '2026-03-31'
ORDER BY t.transaction_date DESC;

-- Get transactions by account
SELECT 
    t.transaction_id,
    t.transaction_type,
    t.amount,
    c.category_name,
    t.description,
    t.transaction_date
FROM transactions t
LEFT JOIN categories c ON t.category_id = c.category_id
WHERE t.account_id = 1
ORDER BY t.transaction_date DESC
LIMIT 50;

-- Get transfer history
SELECT 
    t.transfer_id,
    t.transaction_id,
    fa.account_name as from_account,
    ta.account_name as to_account,
    t.amount,
    t.exchange_rate,
    tr.created_at
FROM transfers t
JOIN accounts fa ON t.from_account_id = fa.account_id
JOIN accounts ta ON t.to_account_id = ta.account_id
JOIN transactions tr ON t.transaction_id = tr.transaction_id
WHERE tr.user_id = 1
ORDER BY tr.created_at DESC;

-- Export transactions (CSV export support)
SELECT 
    t.transaction_date,
    t.transaction_type,
    a.account_name,
    c.category_name,
    t.amount,
    t.description,
    t.notes
FROM transactions t
LEFT JOIN categories c ON t.category_id = c.category_id
LEFT JOIN accounts a ON t.account_id = a.account_id
WHERE t.user_id = 1 
    AND t.transaction_date BETWEEN ? AND ?
ORDER BY t.transaction_date DESC;

-- ============================================================
-- 6. RECURRING TRANSACTION QUERIES
-- ============================================================

-- Get active recurring transactions
SELECT 
    r.recurring_id,
    r.transaction_type,
    r.amount,
    c.category_name,
    a.account_name,
    r.recurrence_type,
    r.next_due_date,
    r.last_executed_date,
    r.description
FROM recurring_transactions r
LEFT JOIN categories c ON r.category_id = c.category_id
LEFT JOIN accounts a ON r.account_id = a.account_id
WHERE r.user_id = 1 
    AND r.is_active = TRUE
    AND r.end_date IS NULL OR r.end_date >= CURDATE()
ORDER BY r.next_due_date ASC;

-- Find overdue recurring transactions (for batch processing)
SELECT 
    r.recurring_id,
    r.transaction_type,
    r.amount,
    c.category_id,
    a.account_id,
    r.description,
    r.next_due_date
FROM recurring_transactions r
LEFT JOIN categories c ON r.category_id = c.category_id
LEFT JOIN accounts a ON r.account_id = a.account_id
WHERE r.user_id = 1 
    AND r.is_active = TRUE
    AND r.next_due_date <= CURDATE()
ORDER BY r.next_due_date ASC;

-- ============================================================
-- 7. ANALYTICS & STATISTICS QUERIES
-- ============================================================

-- Get monthly summary statistics
SELECT 
    DATE_FORMAT(t.transaction_date, '%Y-%m') as month,
    SUM(CASE WHEN t.transaction_type = 'income' THEN t.amount ELSE 0 END) as total_income,
    SUM(CASE WHEN t.transaction_type = 'expense' THEN t.amount ELSE 0 END) as total_expense,
    COUNT(DISTINCT t.transaction_id) as transaction_count,
    COUNT(DISTINCT CASE WHEN t.transaction_type = 'income' THEN t.transaction_id END) as income_count,
    COUNT(DISTINCT CASE WHEN t.transaction_type = 'expense' THEN t.transaction_id END) as expense_count
FROM transactions t
WHERE t.user_id = 1
GROUP BY DATE_FORMAT(t.transaction_date, '%Y-%m')
ORDER BY month DESC;

-- Get top expense categories (last 90 days)
SELECT 
    c.category_id,
    c.category_name,
    COUNT(t.transaction_id) as transaction_count,
    SUM(t.amount) as total_amount,
    AVG(t.amount) as avg_amount,
    MAX(t.amount) as max_amount
FROM transactions t
JOIN categories c ON t.category_id = c.category_id
WHERE t.user_id = 1 
    AND t.transaction_type = 'expense'
    AND t.transaction_date >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)
GROUP BY c.category_id, c.category_name
ORDER BY total_amount DESC
LIMIT 10;

-- Calculate average spending by day of week
SELECT 
    DAYNAME(t.transaction_date) as day_name,
    DAYOFWEEK(t.transaction_date) as day_num,
    COUNT(t.transaction_id) as transaction_count,
    SUM(t.amount) as total_amount,
    AVG(t.amount) as avg_amount
FROM transactions t
WHERE t.user_id = 1 
    AND t.transaction_type = 'expense'
    AND t.transaction_date >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)
GROUP BY DAYOFWEEK(t.transaction_date), DAYNAME(t.transaction_date)
ORDER BY day_num;

-- Get annual spending trend (predict end-of-month balance)
SELECT 
    DATE_FORMAT(t.transaction_date, '%Y-%m') as month,
    SUM(CASE WHEN t.transaction_type = 'income' THEN t.amount ELSE 0 END) as income,
    SUM(CASE WHEN t.transaction_type = 'expense' THEN t.amount ELSE 0 END) as expense,
    (SUM(CASE WHEN t.transaction_type = 'income' THEN t.amount ELSE 0 END) - 
     SUM(CASE WHEN t.transaction_type = 'expense' THEN t.amount ELSE 0 END)) as net,
    (SELECT SUM(a.balance) FROM accounts a WHERE a.user_id = t.user_id) as month_end_balance
FROM transactions t
WHERE t.user_id = 1 
    AND t.transaction_type IN ('income', 'expense')
    AND t.transaction_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
GROUP BY DATE_FORMAT(t.transaction_date, '%Y-%m')
ORDER BY month ASC;

-- ============================================================
-- 8. DASHBOARD CUSTOMIZATION QUERIES
-- ============================================================

-- Get user's dashboard card configuration
SELECT 
    dc.card_config_id,
    dc.card_type,
    dc.card_title,
    dc.is_enabled,
    dc.card_position,
    dc.card_size,
    dc.layout_column,
    dc.custom_config
FROM dashboard_cards dc
WHERE dc.user_id = 1
ORDER BY dc.card_position ASC;

-- Get enabled cards only (for frontend rendering)
SELECT 
    dc.card_type,
    dc.card_title,
    dc.card_size,
    dc.layout_column,
    dc.custom_config
FROM dashboard_cards dc
WHERE dc.user_id = 1 AND dc.is_enabled = TRUE
ORDER BY dc.card_position ASC;

-- Update card configuration (rearrange dashboard)
UPDATE dashboard_cards
SET card_position = CASE 
    WHEN card_type = 'balance_trend' THEN 1
    WHEN card_type = 'cash_flow' THEN 2
    WHEN card_type = 'expenses_structure' THEN 3
    WHEN card_type = 'goal_progress' THEN 4
END,
is_enabled = CASE 
    WHEN card_type IN ('balance_trend', 'cash_flow', 'goal_progress') THEN TRUE
    WHEN card_type = 'budget_overview' THEN FALSE
END,
updated_at = CURDATE()
WHERE user_id = 1;

-- ============================================================
-- 9. ACCOUNT MANAGEMENT QUERIES
-- ============================================================

-- Get all user accounts with recent activity
SELECT 
    a.account_id,
    a.account_name,
    a.account_type,
    a.balance,
    a.currency,
    a.color_code,
    COUNT(t.transaction_id) as recent_transaction_count,
    MAX(t.transaction_date) as last_transaction_date
FROM accounts a
LEFT JOIN transactions t ON a.account_id = t.account_id 
    AND t.transaction_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
WHERE a.user_id = 1 AND a.is_active = TRUE
GROUP BY a.account_id, a.account_name, a.account_type, a.balance, a.currency, a.color_code
ORDER BY a.created_at DESC;

-- ============================================================
-- 10. AUDIT & COMPLIANCE QUERIES
-- ============================================================

-- Get user activity log (last 100 actions)
SELECT 
    al.log_id,
    al.action,
    al.entity_type,
    al.entity_id,
    al.created_at,
    al.ip_address
FROM audit_logs al
WHERE al.user_id = 1
ORDER BY al.created_at DESC
LIMIT 100;

-- Get all data changes for a specific transaction
SELECT 
    al.log_id,
    al.action,
    al.old_values,
    al.new_values,
    al.created_at
FROM audit_logs al
WHERE al.user_id = 1 
    AND al.entity_type = 'transaction'
    AND al.entity_id = 123
ORDER BY al.created_at ASC;

-- Get export history for data recovery
SELECT 
    del.export_id,
    del.export_type,
    del.file_name,
    del.record_count,
    del.export_status,
    del.created_at
FROM data_export_logs del
WHERE del.user_id = 1
ORDER BY del.created_at DESC
LIMIT 10;

-- ============================================================
-- 11. DATA MAINTENANCE QUERIES
-- ============================================================

-- Archive old transactions (move to archive table, optional)
-- This query identifies transactions older than 2 years
SELECT 
    transaction_id,
    user_id,
    account_id,
    transaction_date
FROM transactions
WHERE transaction_date < DATE_SUB(CURDATE(), INTERVAL 2 YEAR)
AND user_id = 1;

-- Calculate total account balance (integrity check)
SELECT 
    a.account_id,
    a.account_name,
    a.balance as stored_balance,
    (SELECT COALESCE(SUM(
        CASE 
            WHEN t.transaction_type = 'income' THEN t.amount
            WHEN t.transaction_type = 'expense' THEN -t.amount
            ELSE 0
        END
    ), 0)
    FROM transactions t
    WHERE t.account_id = a.account_id) as calculated_balance
FROM accounts a
WHERE a.user_id = 1;

-- ============================================================
-- 12. INSERTION EXAMPLES
-- ============================================================

-- Example: Create a new income transaction
-- Step 1: Insert transaction
INSERT INTO transactions 
(user_id, account_id, transaction_type, amount, category_id, description, transaction_date, created_at)
VALUES 
(1, 1, 'income', 2500.00, 10, 'Monthly Salary', CURDATE(), NOW());

-- Step 2: Update account balance
UPDATE accounts 
SET balance = balance + 2500.00 
WHERE account_id = 1;

-- Step 3: Log action
INSERT INTO audit_logs 
(user_id, action, entity_type, entity_id, new_values, created_at)
VALUES 
(1, 'transaction_created', 'transaction', LAST_INSERT_ID(), 
 JSON_OBJECT('type', 'income', 'amount', 2500, 'category', 10), NOW());

-- Example: Create a transfer between accounts
-- Step 1: Insert transaction
INSERT INTO transactions 
(user_id, account_id, transaction_type, amount, description, transaction_date)
VALUES 
(1, 1, 'transfer', 500.00, 'Transfer to Savings', CURDATE());

-- Step 2: Insert transfer details
INSERT INTO transfers 
(transaction_id, from_account_id, to_account_id, amount)
VALUES 
(LAST_INSERT_ID(), 1, 2, 500.00);

-- Step 3: Update both account balances
UPDATE accounts SET balance = balance - 500.00 WHERE account_id = 1;
UPDATE accounts SET balance = balance + 500.00 WHERE account_id = 2;

-- Example: Create recurring transaction
INSERT INTO recurring_transactions 
(user_id, account_id, category_id, transaction_type, amount, description, 
 recurrence_type, start_date, next_due_date, is_active)
VALUES 
(1, 1, 5, 'expense', 99.99, 'Netflix Subscription', 'monthly', 
 CURDATE(), DATE_ADD(CURDATE(), INTERVAL 1 MONTH), TRUE);

-- ============================================================
-- END OF QUERY EXAMPLES
-- ============================================================
