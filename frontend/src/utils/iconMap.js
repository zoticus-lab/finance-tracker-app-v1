import * as Icons from 'lucide-react';

// Map icon name strings to lucide-react components
export const ICON_MAP = {
  // Income
  briefcase: Icons.Briefcase,
  trophy: Icons.Trophy,
  code: Icons.Code2,
  'trending-up': Icons.TrendingUp,
  percent: Icons.Percent,
  home: Icons.Home,
  gift: Icons.Gift,
  'plus-circle': Icons.PlusCircle,
  'dollar-sign': Icons.DollarSign,
  undo: Icons.RotateCcw,
  clock: Icons.Clock,

  // Transportation
  fuel: Icons.Fuel,
  train: Icons.Train,
  car: Icons.Car,
  wrench: Icons.Wrench,
  square: Icons.Square,
  truck: Icons.Truck,

  // Expense - common
  utensils: Icons.Utensils,
  'shopping-cart': Icons.ShoppingCart,
  'shopping-bag': Icons.ShoppingBag,
  zap: Icons.Zap,
  droplets: Icons.Droplets,
  wifi: Icons.Wifi,
  smartphone: Icons.Smartphone,
  heart: Icons.Heart,
  pill: Icons.Pill,
  smile: Icons.Smile,
  film: Icons.Film,
  activity: Icons.Activity,
  book: Icons.Book,
  shirt: Icons.Shirt,
  sparkles: Icons.Sparkles,
  shield: Icons.Shield,
  'paw-print': Icons.PawPrint,
  plane: Icons.Plane,
  bed: Icons.Bed,
  coffee: Icons.Coffee,
  repeat: Icons.Repeat,
  'credit-card': Icons.CreditCard,
  'minus-circle': Icons.MinusCircle,
  users: Icons.Users,
  'user-check': Icons.UserCheck,
  'game-2': Icons.Gamepad2,
  save: Icons.Save,
  package: Icons.Package,
  tool: Icons.Wrench,
  graduation: Icons.GraduationCap,
  award: Icons.Award,
  'graduation-cap': Icons.GraduationCap,
  cross: Icons.Plus,
  calendar: Icons.Calendar,
  box: Icons.Box,
};

export function getCategoryIcon(iconName) {
  return ICON_MAP[iconName] || Icons.Tag;
}
