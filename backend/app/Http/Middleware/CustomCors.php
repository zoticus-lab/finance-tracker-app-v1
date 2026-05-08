<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class CustomCors
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @return mixed
     */
    public function handle(Request $request, Closure $next)
    {
        $allowedOrigins = [
            'http://localhost:3000',
            'http://localhost:5175',
            'http://localhost:5001',
            'http://100.64.168.127:5175',
            'http://100.64.168.127:5001',
            'http://100.64.168.127:3000',
        ];

        $origin = $request->header('Origin');
        
        // Check if origin is allowed or allow all for development
        $isAllowed = in_array($origin, $allowedOrigins) || true;

        if ($request->getMethod() === 'OPTIONS') {
            // Preflight request
            return response()
                ->header('Access-Control-Allow-Origin', $origin ?: '*')
                ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
                ->header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
                ->header('Access-Control-Max-Age', '3600')
                ->header('Access-Control-Allow-Credentials', 'true')
                ->send();
        }

        // Add CORS headers to response
        $response = $next($request);
        
        return $response
            ->header('Access-Control-Allow-Origin', $origin ?: '*')
            ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
            ->header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
            ->header('Access-Control-Allow-Credentials', 'true')
            ->header('Access-Control-Expose-Headers', 'Authorization');
    }
}
