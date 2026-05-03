<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Account;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class AccountController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $accounts = Account::where('user_id', $user->user_id)
            ->orderByDesc('created_at')
            ->get()
            ->map(function ($account) {
                return [
                    'id' => $account->account_id,
                    'name' => $account->account_name,
                    'account_type' => $account->account_type,
                    'balance' => (float) $account->balance,
                    'currency' => $account->currency,
                    'is_active' => (bool) $account->is_active,
                ];
            });

        return response()->json(['success' => true, 'data' => $accounts]);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:100',
            'account_type' => 'required|in:bank,cash,savings,credit_card,investment,other',
            'balance' => 'nullable|numeric|min:0',
            'currency' => 'nullable|string|size:3',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $account = Account::create([
            'user_id' => $user->user_id,
            'account_name' => $request->name,
            'account_type' => $request->account_type,
            'balance' => $request->balance ?? 0,
            'currency' => strtoupper($request->currency ?? 'IDR'),
            'is_active' => true,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Account created successfully',
            'data' => [
                'id' => $account->account_id,
                'name' => $account->account_name,
                'account_type' => $account->account_type,
                'balance' => (float) $account->balance,
                'currency' => $account->currency,
                'is_active' => (bool) $account->is_active,
            ],
        ], 201);
    }

    public function show(Request $request, $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $account = Account::where('user_id', $user->user_id)
            ->where('account_id', $id)
            ->first();

        if (!$account) {
            return response()->json(['success' => false, 'message' => 'Account not found'], 404);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $account->account_id,
                'name' => $account->account_name,
                'account_type' => $account->account_type,
                'balance' => (float) $account->balance,
                'currency' => $account->currency,
                'is_active' => (bool) $account->is_active,
            ],
        ]);
    }

    public function update(Request $request, $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $account = Account::where('user_id', $user->user_id)
            ->where('account_id', $id)
            ->first();

        if (!$account) {
            return response()->json(['success' => false, 'message' => 'Account not found'], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:100',
            'account_type' => 'sometimes|required|in:bank,cash,savings,credit_card,investment,other',
            'balance' => 'sometimes|numeric|min:0',
            'currency' => 'sometimes|string|size:3',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $account->update([
            'account_name' => $request->name ?? $account->account_name,
            'account_type' => $request->account_type ?? $account->account_type,
            'balance' => $request->balance ?? $account->balance,
            'currency' => strtoupper($request->currency ?? $account->currency),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Account updated successfully',
            'data' => [
                'id' => $account->account_id,
                'name' => $account->account_name,
                'account_type' => $account->account_type,
                'balance' => (float) $account->balance,
                'currency' => $account->currency,
                'is_active' => (bool) $account->is_active,
            ],
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $account = Account::where('user_id', $user->user_id)
            ->where('account_id', $id)
            ->first();

        if (!$account) {
            return response()->json(['success' => false, 'message' => 'Account not found'], 404);
        }

        $account->delete();

        return response()->json(['success' => true, 'message' => 'Account deleted successfully']);
    }

    public function getSummary(Request $request, $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $account = Account::where('user_id', $user->user_id)
            ->where('account_id', $id)
            ->first();

        if (!$account) {
            return response()->json(['success' => false, 'message' => 'Account not found'], 404);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $account->account_id,
                'name' => $account->account_name,
                'balance' => (float) $account->balance,
                'currency' => $account->currency,
                'transaction_count' => 0,
            ],
        ]);
    }
}
