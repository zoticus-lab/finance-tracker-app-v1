<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\API\{
    AuthController,
    AccountController,
    TransactionController,
    BudgetController,
    GoalController,
    CategoryController,
    DashboardController,
    DashboardCardController,
    DebtController,
    CreditController,
    BackupController,
    ChatController,
};

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

// Public routes (no auth required)
Route::prefix('auth')->group(function () {
    Route::post('register', [AuthController::class, 'register']);
    Route::post('login', [AuthController::class, 'login']);
});

// Protected routes (auth required)
Route::middleware('auth:sanctum')->group(function () {
    
    // Auth Routes
    Route::prefix('auth')->group(function () {
        Route::post('logout', [AuthController::class, 'logout']);
        Route::get('me', [AuthController::class, 'me']);
        Route::post('refresh', [AuthController::class, 'refresh']);
        Route::put('profile', [AuthController::class, 'updateProfile']);
    });

    // Accounts Routes
    Route::prefix('accounts')->group(function () {
        Route::get('/', [AccountController::class, 'index']);
        Route::post('/', [AccountController::class, 'store']);
        Route::get('{id}', [AccountController::class, 'show']);
        Route::put('{id}', [AccountController::class, 'update']);
        Route::delete('{id}', [AccountController::class, 'destroy']);
        Route::get('{id}/summary', [AccountController::class, 'getSummary']);
    });

    // Transactions Routes
    Route::prefix('transactions')->group(function () {
        Route::get('/', [TransactionController::class, 'index']);
        Route::post('income', [TransactionController::class, 'storeIncome']);
        Route::post('expense', [TransactionController::class, 'storeExpense']);
        Route::post('transfer', [TransactionController::class, 'storeTransfer']);
        Route::put('{id}', [TransactionController::class, 'update']);
        Route::delete('{id}', [TransactionController::class, 'destroy']);
    });

    // Categories Routes
    Route::prefix('categories')->group(function () {
        Route::get('/', [CategoryController::class, 'index']);
        Route::get('type/{type}', [CategoryController::class, 'getByType']);
        Route::post('/', [CategoryController::class, 'store']);
        Route::put('{id}', [CategoryController::class, 'update']);
        Route::delete('{id}', [CategoryController::class, 'destroy']);
    });

    // Budgets Routes
    Route::prefix('budgets')->group(function () {
        Route::get('/', [BudgetController::class, 'index']);
        Route::get('current-month', [BudgetController::class, 'getCurrentMonth']);
        Route::post('/', [BudgetController::class, 'store']);
        Route::get('{id}', [BudgetController::class, 'show']);
        Route::put('{id}', [BudgetController::class, 'update']);
        Route::delete('{id}', [BudgetController::class, 'destroy']);
    });

    // Goals Routes
    Route::prefix('goals')->group(function () {
        Route::get('/', [GoalController::class, 'index']);
        Route::get('active', [GoalController::class, 'getActive']);
        Route::post('upload-image', [GoalController::class, 'uploadImage']);
        Route::post('/', [GoalController::class, 'store']);
        Route::get('{id}', [GoalController::class, 'show']);
        Route::put('{id}', [GoalController::class, 'update']);
        Route::put('{id}/progress', [GoalController::class, 'updateProgress']);
        Route::delete('{id}', [GoalController::class, 'destroy']);
    });

    // Dashboard Routes
    Route::prefix('dashboard')->group(function () {
        Route::get('summary', [DashboardController::class, 'getSummary']);
        Route::get('cash-flow', [DashboardController::class, 'getCashFlow']);
        Route::get('expense-breakdown', [DashboardController::class, 'getExpenseBreakdown']);
        Route::get('balance-trend', [DashboardController::class, 'getBalanceTrend']);
        Route::get('top-categories', [DashboardController::class, 'getTopCategories']);
    });

    // Dashboard Cards Routes
    Route::prefix('dashboard-cards')->group(function () {
        Route::get('/', [DashboardCardController::class, 'index']);
        Route::get('enabled', [DashboardCardController::class, 'getEnabled']);
        Route::post('/', [DashboardCardController::class, 'store']);
        Route::put('{id}', [DashboardCardController::class, 'update']);
        Route::delete('{id}', [DashboardCardController::class, 'destroy']);
        Route::post('reorder', [DashboardCardController::class, 'reorder']);
    });

    // Debts Routes
    Route::prefix('debts')->group(function () {
        Route::get('/', [DebtController::class, 'index']);
        Route::get('active', [DebtController::class, 'getActive']);
        Route::post('/', [DebtController::class, 'store']);
        Route::get('{id}', [DebtController::class, 'show']);
        Route::put('{id}', [DebtController::class, 'update']);
        Route::post('{id}/payments', [DebtController::class, 'addPayment']);
        Route::delete('{id}/payments/{paymentId}', [DebtController::class, 'deletePayment']);
        Route::delete('{id}', [DebtController::class, 'destroy']);
    });

    // Credits Routes
    Route::prefix('credits')->group(function () {
        Route::get('/', [CreditController::class, 'index']);
        Route::get('active', [CreditController::class, 'getActive']);
        Route::post('/', [CreditController::class, 'store']);
        Route::get('{id}', [CreditController::class, 'show']);
        Route::put('{id}', [CreditController::class, 'update']);
        Route::post('{id}/payments', [CreditController::class, 'addPayment']);
        Route::delete('{id}/payments/{paymentId}', [CreditController::class, 'deletePayment']);
        Route::delete('{id}', [CreditController::class, 'destroy']);
    });

    // Chat Routes (AI Assistant)
    Route::prefix('chat')->group(function () {
        Route::post('/', [ChatController::class, 'chat']);
    });

    // Backup Routes
    Route::prefix('backup')->group(function () {
        Route::get('export', [BackupController::class, 'export']);
        Route::post('import', [BackupController::class, 'import']);
        Route::post('rollback', [BackupController::class, 'rollbackLastImport']);
    });

});

// Health check (no auth)
Route::get('/health', function () {
    return response()->json([
        'success' => true,
        'message' => 'API is running',
    ]);
});
