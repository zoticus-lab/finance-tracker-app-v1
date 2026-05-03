<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;

class CategoryTemplateSeeder extends Seeder
{
    public function run(): void
    {
        // Income categories with specific icons
        $income = [
            ['Salary', 'briefcase', '#2ecc71'],
            ['Bonus', 'trophy', '#27ae60'],
            ['Freelance', 'code', '#16a085'],
            ['Business Profit', 'trending-up', '#1abc9c'],
            ['Investment Return', 'trending-up', '#0984e3'],
            ['Interest', 'percent', '#3498db'],
            ['Rental Income', 'home', '#2980b9'],
            ['Cashback', 'gift', '#8e44ad'],
            ['Refund', 'undo', '#9b59b6'],
            ['Gift Received', 'gift', '#af7ac5'],
            ['Commission', 'percent', '#d7bde2'],
            ['Overtime', 'clock', '#c39bd3'],
            ['Reimbursement', 'dollar-sign', '#bb8fce'],
            ['Scholarship', 'book', '#a569bd'],
            ['Allowance', 'dollar-sign', '#884ea0'],
            ['Dana Masuk dari Hutang', 'arrow-down', '#e74c3c'],
            ['Pembayaran Piutang', 'check-circle', '#27ae60'],
        ];

        // Expense categories with specific icons
        $expenseGroups = [
            'Food & Drinks' => [
                ['Groceries', 'shopping-cart', '#e74c3c'],
                ['Dining Out', 'coffee', '#c0392b'],
                ['Coffee & Tea', 'coffee', '#a93226'],
                ['Snacks', 'utensils', '#922b21'],
                ['Delivery', 'truck', '#78281f'],
            ],
            'Transportation' => [
                ['Fuel', 'fuel', '#e67e22'],
                ['Public Transport', 'train', '#d68910'],
                ['Ride Hailing', 'car', '#ca6f1e'],
                ['Parking', 'square', '#b9630b'],
                ['Toll', 'credit-card', '#a04000'],
                ['Vehicle Service', 'wrench', '#78281f'],
                ['Vehicle Insurance', 'shield', '#5d4037'],
            ],
            'Housing' => [
                ['Rent', 'home', '#3498db'],
                ['Mortgage', 'home', '#2980b9'],
                ['Electricity', 'zap', '#2874a6'],
                ['Water', 'droplets', '#1b4965'],
                ['Internet', 'wifi', '#154360'],
                ['Phone Bill', 'smartphone', '#0c2340'],
                ['Home Maintenance', 'wrench', '#16425b'],
                ['Furniture', 'box', '#1a5f7a'],
            ],
            'Health' => [
                ['Medicine', 'pill', '#8e44ad'],
                ['Doctor', 'heart', '#7d3c98'],
                ['Dental', 'smile', '#6c3483'],
                ['Hospital', 'cross', '#5b2c6f'],
                ['Health Insurance', 'shield', '#4a235a'],
                ['Fitness', 'activity', '#6a0572'],
            ],
            'Education' => [
                ['Course', 'book', '#16a085'],
                ['Books', 'book', '#138d75'],
                ['Tuition', 'graduation-cap', '#117a65'],
                ['Workshop', 'calendar', '#0e6251'],
                ['Certification', 'award', '#0b5345'],
            ],
            'Family' => [
                ['Parents', 'users', '#f39c12'],
                ['Children', 'user-check', '#e67e22'],
                ['Household Needs', 'shopping-cart', '#d68910'],
                ['Childcare', 'heart', '#ca6f1e'],
            ],
            'Lifestyle' => [
                ['Shopping', 'shopping-bag', '#9b59b6'],
                ['Beauty', 'sparkles', '#8e44ad'],
                ['Entertainment', 'smile', '#7d3c98'],
                ['Travel', 'plane', '#6c3483'],
                ['Hobby', 'game-2', '#5b2c6f'],
                ['Subscription', 'repeat', '#4a235a'],
            ],
            'Finance' => [
                ['Debt Payment', 'credit-card', '#c0392b'],
                ['Credit Card Bill', 'credit-card', '#a93226'],
                ['Tax', 'briefcase', '#922b21'],
                ['Admin Fee', 'minus-circle', '#78281f'],
                ['Bank Charge', 'minus-circle', '#5d4037'],
                ['Insurance', 'shield', '#4a235a'],
                ['Emergency Fund', 'save', '#2c3e50'],
            ],
            'Work' => [
                ['Office Supplies', 'package', '#34495e'],
                ['Tools & Software', 'tool', '#2c3e50'],
                ['Team Meal', 'coffee', '#1c2833'],
                ['Business Trip', 'plane', '#0b5345'],
            ],
            'Other Expenses' => [
                ['Donation', 'heart', '#27ae60'],
                ['Gift', 'gift', '#229954'],
                ['Pet', 'paw-print', '#1e8449'],
                ['Miscellaneous', 'minus-circle', '#186a3b'],
            ],
            'Hutang & Piutang' => [
                ['Dana Keluar untuk Hutang', 'arrow-up', '#e74c3c'],
                ['Piutang Diberikan', 'hand-helping', '#c0392b'],
            ],
        ];

        // Seed income categories
        foreach ($income as [$name, $icon, $color]) {
            Category::firstOrCreate(
                [
                    'user_id' => null,
                    'parent_category_id' => null,
                    'category_name' => $name,
                    'category_type' => 'income',
                    'is_system_default' => true,
                ],
                [
                    'icon' => $icon,
                    'color_code' => $color,
                ]
            );
        }

        // Seed expense categories
        foreach ($expenseGroups as $parentName => $children) {
            $parentIcon = $this->getParentIcon($parentName);
            $parentColor = $this->getParentColor($parentName);

            $parent = Category::firstOrCreate(
                [
                    'user_id' => null,
                    'parent_category_id' => null,
                    'category_name' => $parentName,
                    'category_type' => 'expense',
                    'is_system_default' => true,
                ],
                [
                    'icon' => $parentIcon,
                    'color_code' => $parentColor,
                ]
            );

            foreach ($children as [$childName, $icon, $color]) {
                Category::firstOrCreate(
                    [
                        'user_id' => null,
                        'parent_category_id' => $parent->category_id,
                        'category_name' => $childName,
                        'category_type' => 'expense',
                        'is_system_default' => true,
                    ],
                    [
                        'icon' => $icon,
                        'color_code' => $color,
                    ]
                );
            }
        }
    }

    // Helper function to get parent category icon
    private function getParentIcon($parentName)
    {
        $iconMap = [
            'Food & Drinks' => 'utensils',
            'Transportation' => 'car',
            'Housing' => 'home',
            'Health' => 'heart',
            'Education' => 'book',
            'Family' => 'users',
            'Lifestyle' => 'shopping-bag',
            'Finance' => 'credit-card',
            'Work' => 'briefcase',
            'Other Expenses' => 'minus-circle',
            'Hutang & Piutang' => 'link-2',
        ];

        return $iconMap[$parentName] ?? 'tag';
    }

    // Helper function to get parent category color
    private function getParentColor($parentName)
    {
        $colorMap = [
            'Food & Drinks' => '#e74c3c',
            'Transportation' => '#e67e22',
            'Housing' => '#3498db',
            'Health' => '#8e44ad',
            'Education' => '#16a085',
            'Family' => '#f39c12',
            'Lifestyle' => '#9b59b6',
            'Finance' => '#c0392b',
            'Work' => '#34495e',
            'Other Expenses' => '#7f8c8d',
            'Hutang & Piutang' => '#2c3e50',
        ];

        return $colorMap[$parentName] ?? '#95a5a6';
    }
}
