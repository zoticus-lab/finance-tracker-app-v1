<?php
namespace App\Http\Controllers\API;
use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Helpers\CategoryIconHelper;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class CategoryController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $categories = Category::where(function ($q) use ($user) {
                $q->where('user_id', $user->user_id)
                  ->orWhere('is_system_default', true);
            })
            ->orderBy('category_name')
            ->get()
            ->map(fn ($cat) => [
                'id' => $cat->category_id,
                'name' => $cat->category_name,
                'type' => $cat->category_type,
                'parent_category_id' => $cat->parent_category_id,
                'icon' => $cat->icon,
                'color_code' => $cat->color_code,
                'is_system_default' => (bool) $cat->is_system_default,
            ]);

        return response()->json(['success' => true, 'data' => $categories]);
    }

    public function getByType(Request $request, $type)
    {
        if (!in_array($type, ['income', 'expense'], true)) {
            return response()->json(['success' => false, 'message' => 'Invalid category type'], 422);
        }

        $user = $request->user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $categories = Category::where('category_type', $type)
            ->where(function ($q) use ($user) {
                $q->where('user_id', $user->user_id)
                  ->orWhere('is_system_default', true);
            })
            ->orderBy('category_name')
            ->get()
            ->map(fn ($cat) => [
                'id' => $cat->category_id,
                'name' => $cat->category_name,
                'type' => $cat->category_type,
                'icon' => $cat->icon,
                'color_code' => $cat->color_code,
            ]);

        return response()->json(['success' => true, 'data' => $categories]);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:100',
            'type' => 'required|in:income,expense',
            'parent_category_id' => 'nullable|integer',
            'icon' => 'nullable|string|max:50',
            'color_code' => 'nullable|string|max:7',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        // Auto-generate icon if not provided
        $icon = $request->icon ?? CategoryIconHelper::getIconForCategory($request->name, $request->type);
        $color = $request->color_code ?? CategoryIconHelper::getColorForCategory($request->name);

        $category = Category::create([
            'user_id' => $user->user_id,
            'parent_category_id' => $request->parent_category_id,
            'category_name' => $request->name,
            'category_type' => $request->type,
            'icon' => $icon,
            'color_code' => $color,
            'is_system_default' => false,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Category created successfully',
            'data' => [
                'id' => $category->category_id,
                'name' => $category->category_name,
                'type' => $category->category_type,
                'parent_category_id' => $category->parent_category_id,
                'icon' => $category->icon,
                'color_code' => $category->color_code,
                'is_system_default' => (bool) $category->is_system_default,
            ],
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $category = Category::where('category_id', $id)
            ->where('user_id', $user->user_id)
            ->first();

        if (!$category) {
            return response()->json(['success' => false, 'message' => 'Category not found'], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:100',
            'type' => 'sometimes|required|in:income,expense',
            'parent_category_id' => 'nullable|integer',
            'icon' => 'nullable|string|max:50',
            'color_code' => 'nullable|string|max:7',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $newName = $request->name ?? $category->category_name;
        $newType = $request->type ?? $category->category_type;
        
        // Auto-generate icon/color if not provided but name changed
        $icon = $request->icon ?? ($request->name ? CategoryIconHelper::getIconForCategory($newName, $newType) : $category->icon);
        $color = $request->color_code ?? ($request->name ? CategoryIconHelper::getColorForCategory($newName) : $category->color_code);

        $category->update([
            'category_name' => $newName,
            'category_type' => $newType,
            'parent_category_id' => $request->has('parent_category_id') ? $request->parent_category_id : $category->parent_category_id,
            'icon' => $icon,
            'color_code' => $color,
        ]);

        return response()->json(['success' => true, 'message' => 'Category updated successfully']);
    }

    public function destroy(Request $request, $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $category = Category::where('category_id', $id)
            ->where('user_id', $user->user_id)
            ->first();

        if (!$category) {
            return response()->json(['success' => false, 'message' => 'Category not found'], 404);
        }

        $category->delete();
        return response()->json(['success' => true, 'message' => 'Category deleted successfully']);
    }
}
