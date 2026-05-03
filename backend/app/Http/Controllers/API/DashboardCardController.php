<?php
namespace App\Http\Controllers\API;
use App\Http\Controllers\Controller;
use App\Models\DashboardCard;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class DashboardCardController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $cards = DashboardCard::where('user_id', $user->user_id)
            ->orderBy('card_position')
            ->get();

        return response()->json(['success' => true, 'data' => $cards]);
    }

    public function getEnabled(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $cards = DashboardCard::where('user_id', $user->user_id)
            ->where('is_enabled', true)
            ->orderBy('card_position')
            ->get();

        return response()->json(['success' => true, 'data' => $cards]);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $validator = Validator::make($request->all(), [
            'card_type' => 'required|string|max:50',
            'card_title' => 'nullable|string|max:100',
            'is_enabled' => 'nullable|boolean',
            'card_position' => 'nullable|integer|min:0',
            'card_size' => 'nullable|in:small,medium,large',
            'layout_column' => 'nullable|integer|min:1',
            'custom_config' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $card = DashboardCard::create([
            'user_id' => $user->user_id,
            'card_type' => $request->card_type,
            'card_title' => $request->card_title,
            'is_enabled' => $request->boolean('is_enabled', true),
            'card_position' => $request->card_position ?? 0,
            'card_size' => $request->card_size ?? 'medium',
            'layout_column' => $request->layout_column ?? 1,
            'custom_config' => $request->custom_config,
        ]);

        return response()->json(['success' => true, 'message' => 'Dashboard card created', 'data' => $card], 201);
    }

    public function update(Request $request, $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $card = DashboardCard::where('card_config_id', $id)
            ->where('user_id', $user->user_id)
            ->first();

        if (!$card) {
            return response()->json(['success' => false, 'message' => 'Dashboard card not found'], 404);
        }

        $card->update($request->only(['card_title', 'is_enabled', 'card_position', 'card_size', 'layout_column', 'custom_config']));

        return response()->json(['success' => true, 'message' => 'Dashboard card updated', 'data' => $card]);
    }

    public function destroy(Request $request, $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $card = DashboardCard::where('card_config_id', $id)
            ->where('user_id', $user->user_id)
            ->first();

        if (!$card) {
            return response()->json(['success' => false, 'message' => 'Dashboard card not found'], 404);
        }

        $card->delete();
        return response()->json(['success' => true, 'message' => 'Dashboard card deleted']);
    }

    public function reorder(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $validator = Validator::make($request->all(), [
            'items' => 'required|array',
            'items.*.id' => 'required|integer',
            'items.*.position' => 'required|integer|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        foreach ($request->items as $item) {
            DashboardCard::where('card_config_id', $item['id'])
                ->where('user_id', $user->user_id)
                ->update(['card_position' => $item['position']]);
        }

        return response()->json(['success' => true, 'message' => 'Dashboard cards reordered']);
    }
}
