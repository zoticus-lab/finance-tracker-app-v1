<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\Goal;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class ChatController extends Controller
{
    private const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
    private const DEFAULT_GEMINI_MODEL = 'gemini-2.0-flash';

    /**
     * Chat with AI assistant
     * Provides financial context and advice based on user's data
     */
    public function chat(Request $request)
    {
        if (!filter_var((string) env('CHATBOT_ENABLED', 'false'), FILTER_VALIDATE_BOOLEAN)) {
            return response()->json([
                'success' => false,
                'message' => 'Fitur chatbot sedang dinonaktifkan sementara.',
            ], 503);
        }

        $user = $request->user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $request->validate([
            'message' => 'required|string|max:1000',
        ]);

        $userMessage = $request->input('message');

        // Collect financial context
        $context = $this->buildFinancialContext($user);

        // Build prompt with context
        $systemPrompt = $this->buildSystemPrompt($context);
        $fullPrompt = $systemPrompt . "\n\nUser: " . $userMessage;

        $geminiApiKey = (string) env('GEMINI_API_KEY', '');
        $geminiModel = (string) env('GEMINI_MODEL', self::DEFAULT_GEMINI_MODEL);

        if ($geminiApiKey === '') {
            return response()->json([
                'success' => false,
                'message' => 'Gemini belum dikonfigurasi. Isi GEMINI_API_KEY di backend/.env.',
            ], 503);
        }

        try {
            $payload = [
                'contents' => [
                    [
                        'parts' => [
                            ['text' => $fullPrompt],
                        ],
                    ],
                ],
                'generationConfig' => [
                    'temperature' => 0.4,
                    'maxOutputTokens' => 700,
                ],
            ];

            $modelCandidates = array_values(array_unique([
                $geminiModel,
                self::DEFAULT_GEMINI_MODEL,
                'gemini-flash-latest',
            ]));

            $responseData = null;
            $lastProviderError = 'Gemini API tidak tersedia atau key tidak valid.';

            foreach ($modelCandidates as $candidate) {
                $response = Http::timeout(60)->post(
                    self::GEMINI_BASE_URL . '/' . $candidate . ':generateContent?key=' . urlencode($geminiApiKey),
                    $payload
                );

                if ($response->successful()) {
                    $responseData = $response->json();
                    break;
                }

                $providerBody = $response->json();
                $providerMessage = (string) ($providerBody['error']['message'] ?? 'Unknown provider error');
                $lastProviderError = $providerMessage;

                // Try next fallback model only when model is not found/unsupported
                if (str_contains(strtolower($providerMessage), 'not found') || str_contains(strtolower($providerMessage), 'not supported')) {
                    continue;
                }

                return response()->json([
                    'success' => false,
                    'message' => 'Gemini error: ' . $providerMessage,
                ], 503);
            }

            if (!$responseData) {
                return response()->json([
                    'success' => false,
                    'message' => 'Gemini error: ' . $lastProviderError,
                ], 503);
            }

            $aiResponse = $responseData['candidates'][0]['content']['parts'][0]['text'] ?? '';

            if ($aiResponse === '') {
                return response()->json([
                    'success' => false,
                    'message' => 'Gemini tidak mengembalikan jawaban. Coba lagi beberapa saat.',
                ], 502);
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'message' => $aiResponse,
                    'context_summary' => $context['summary'],
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal menghubungi Gemini API: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Build financial context from user's data
     */
    private function buildFinancialContext($user)
    {
        // Last 30 days transactions
        $thirtyDaysAgo = now()->subDays(30);
        $transactions = Transaction::where('user_id', $user->user_id)
            ->where('transaction_date', '>=', $thirtyDaysAgo)
            ->get();

        // Account balances
        $accounts = Account::where('user_id', $user->user_id)->get();

        // Goals
        $goals = Goal::where('user_id', $user->user_id)->get();

        // Calculate totals
        $totalIncome = $transactions->where('transaction_type', 'income')->sum('amount');
        $totalExpense = $transactions->where('transaction_type', 'expense')->sum('amount');
        $totalBalance = $accounts->sum('balance');

        // Goal progress
        $activeGoals = $goals->filter(fn($g) => $g->status === 'active')->count();
        $completedGoals = $goals->filter(fn($g) => $g->status === 'achieved')->count();

        // Income by category (last 30 days)
        $incomeByCategory = $transactions
            ->where('transaction_type', 'income')
            ->groupBy('category')
            ->map(fn($items) => $items->sum('amount'));

        // Expense by category (last 30 days)
        $expenseByCategory = $transactions
            ->where('transaction_type', 'expense')
            ->groupBy('category')
            ->map(fn($items) => $items->sum('amount'));

        return [
            'totalBalance' => $totalBalance,
            'totalIncome' => $totalIncome,
            'totalExpense' => $totalExpense,
            'accountCount' => $accounts->count(),
            'activeGoals' => $activeGoals,
            'completedGoals' => $completedGoals,
            'incomeByCategory' => $incomeByCategory->toArray(),
            'expenseByCategory' => $expenseByCategory->toArray(),
            'accountDetails' => $accounts->map(fn($a) => [
                'name' => $a->account_name,
                'type' => $a->account_type,
                'balance' => $a->balance,
            ])->toArray(),
            'summary' => "Total Balance: " . number_format($totalIncome - $totalExpense, 0, '.', ',') . " | Income (30d): " . number_format($totalIncome, 0, '.', ',') . " | Expense (30d): " . number_format($totalExpense, 0, '.', ','),
        ];
    }

    /**
     * Build system prompt for AI assistant
     */
    private function buildSystemPrompt($context)
    {
        $accounts = json_encode($context['accountDetails']);
        $incomeByCategory = json_encode($context['incomeByCategory']);
        $expenseByCategory = json_encode($context['expenseByCategory']);

        return <<<PROMPT
Anda adalah asisten keuangan pribadi yang bijaksana dan membantu. Anda memberikan nasihat finansial praktis dalam bahasa Indonesia.

Konteks Keuangan Pengguna (30 hari terakhir):
- Total Saldo: Rp. {$context['totalBalance']}
- Total Penghasilan: Rp. {$context['totalIncome']}
- Total Pengeluaran: Rp. {$context['totalExpense']}
- Jumlah Akun: {$context['accountCount']}
- Goal Aktif: {$context['activeGoals']}
- Goal Tercapai: {$context['completedGoals']}

Rincian Akun:
$accounts

Penghasilan per Kategori (30d):
$incomeByCategory

Pengeluaran per Kategori (30d):
$expenseByCategory

Gunakan data ini untuk memberikan:
1. Analisis pengeluaran yang relevan
2. Saran penghematan yang spesifik
3. Rekomendasi investasi atau savings
4. Tips merencanakan pembelian berdasarkan pola pengeluaran
5. Motivasi mencapai savings goals

Selalu berikan jawaban dalam Bahasa Indonesia yang ramah dan praktis. Format jawaban dengan bullet points atau paragraf yang mudah dibaca.
PROMPT;
    }
}
