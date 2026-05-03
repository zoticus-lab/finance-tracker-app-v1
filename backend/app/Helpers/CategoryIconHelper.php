<?php

namespace App\Helpers;

class CategoryIconHelper
{
    /**
     * Map kategori nama ke icon lucide-react
     */
    public static function getIconForCategory($categoryName, $type = 'expense')
    {
        $name = strtolower(trim($categoryName));
        
        // Income categories
        if ($type === 'income') {
            $iconMap = [
                'salary' => 'briefcase',
                'gaji' => 'briefcase',
                'bonus' => 'trophy',
                'freelance' => 'code',
                'business profit' => 'trending-up',
                'bisnis' => 'trending-up',
                'investment' => 'trending-up',
                'investasi' => 'trending-up',
                'interest' => 'percent',
                'rental' => 'home',
                'sewa' => 'home',
                'cashback' => 'gift',
                'refund' => 'undo',
                'gift' => 'gift',
                'hadiah' => 'gift',
                'commission' => 'percent',
                'overtime' => 'clock',
                'reimbursement' => 'dollar-sign',
                'scholarship' => 'book',
                'beasiswa' => 'book',
                'allowance' => 'dollar-sign',
                'other income' => 'plus-circle',
                'lainnya' => 'plus-circle',
            ];
        } else {
            // Expense categories
            $iconMap = [
                'food' => 'utensils',
                'makanan' => 'utensils',
                'groceries' => 'shopping-cart',
                'belanja' => 'shopping-cart',
                'dining' => 'coffee',
                'coffee' => 'coffee',
                'snacks' => 'utensils',
                'delivery' => 'truck',
                'transportation' => 'car',
                'transportasi' => 'car',
                'fuel' => 'fuel',
                'bensin' => 'fuel',
                'public transport' => 'train',
                'ride hailing' => 'car',
                'parking' => 'square',
                'toll' => 'credit-card',
                'vehicle service' => 'wrench',
                'vehicle insurance' => 'shield',
                'electricity' => 'zap',
                'listrik' => 'zap',
                'water' => 'droplets',
                'air' => 'droplets',
                'internet' => 'wifi',
                'phone' => 'smartphone',
                'home maintenance' => 'wrench',
                'furniture' => 'box',
                'health' => 'heart',
                'kesehatan' => 'heart',
                'medicine' => 'pill',
                'obat' => 'pill',
                'doctor' => 'heart',
                'dental' => 'smile',
                'hospital' => 'plus-circle',
                'fitness' => 'activity',
                'olahraga' => 'activity',
                'education' => 'book',
                'pendidikan' => 'book',
                'course' => 'book',
                'books' => 'book',
                'tuition' => 'graduation-cap',
                'workshop' => 'calendar',
                'certification' => 'award',
                'family' => 'users',
                'keluarga' => 'users',
                'parents' => 'users',
                'children' => 'user-check',
                'childcare' => 'heart',
                'household' => 'shopping-cart',
                'shopping' => 'shopping-bag',
                'belanja barang' => 'shopping-bag',
                'beauty' => 'sparkles',
                'kecantikan' => 'sparkles',
                'entertainment' => 'smile',
                'hiburan' => 'smile',
                'travel' => 'plane',
                'perjalanan' => 'plane',
                'hobby' => 'game-2',
                'subscription' => 'repeat',
                'langganan' => 'repeat',
                'debt' => 'credit-card',
                'hutang' => 'credit-card',
                'tax' => 'briefcase',
                'admin fee' => 'minus-circle',
                'insurance' => 'shield',
                'asuransi' => 'shield',
                'donation' => 'heart',
                'donasi' => 'heart',
                'pet' => 'paw-print',
                'hewan' => 'paw-print',
                'rent' => 'home',
                'mortgage' => 'home',
                'other expense' => 'minus-circle',
                'lainnya' => 'minus-circle',
                'supplies' => 'package',
                'software' => 'tool',
                'tools' => 'wrench',
            ];
        }
        
        // Check if name matches any mapping
        foreach ($iconMap as $key => $icon) {
            if (strpos($name, $key) !== false) {
                return $icon;
            }
        }
        
        // Default icon based on type
        return $type === 'income' ? 'dollar-sign' : 'minus-circle';
    }
    
    /**
     * Get color untuk kategori
     */
    public static function getColorForCategory($categoryName)
    {
        $colors = [
            '#3498db', // blue
            '#2ecc71', // green
            '#e74c3c', // red
            '#f39c12', // orange
            '#9b59b6', // purple
            '#1abc9c', // turquoise
            '#34495e', // dark gray
            '#e67e22', // carrot
        ];
        
        // Generate color seed dari nama
        $hash = crc32($categoryName);
        $index = abs($hash) % count($colors);
        
        return $colors[$index];
    }
}
