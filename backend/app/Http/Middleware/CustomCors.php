<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Throwable;

class CustomCors
{
    /**
     * Handle an incoming request.
     * 
     * This is a custom CORS middleware for Laravel 10+ compatibility.
     * We use this instead of fruitcake/laravel-cors which only supports Laravel 6-9.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @return mixed
     */
    public function handle(Request $request, Closure $next)
    {
        $origin = $request->header('Origin');
        
        // Allowed origins
        $allowedOrigins = [
            'http://localhost:3000',
            'http://localhost:5175',
            'http://localhost:5001',
            'http://100.64.168.127:5175',
            'http://100.64.168.127:5001',
            'http://100.64.168.127:3000',
        ];

        // For development, allow all origins. In production, validate against whitelist
        $corsOrigin = (in_array($origin, $allowedOrigins) || empty($origin)) ? ($origin ?: '*') : '*';

        // Handle preflight (OPTIONS) requests
        if ($request->getMethod() === 'OPTIONS') {
            return $this->addCorsHeaders(response(''), $corsOrigin);
        }

        try {
            // Process the request
            $response = $next($request);
        } catch (Throwable $e) {
            // Even on error, return response with CORS headers
            $response = response()->json([
                'success' => false,
                'message' => 'Internal server error',
                'debug' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }

        // Add CORS headers to all responses
        return $this->addCorsHeaders($response, $corsOrigin);
    }

    /**
     * Add CORS headers to response
     */
    private function addCorsHeaders($response, $corsOrigin)
    {
        if ($response === null) {
            $response = response('');
        }

        $response->header('Access-Control-Allow-Origin', $corsOrigin);
        $response->header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
        $response->header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
        $response->header('Access-Control-Max-Age', '3600');
        $response->header('Access-Control-Allow-Credentials', 'true');
        $response->header('Access-Control-Expose-Headers', 'Authorization, Content-Type');

        return $response;
    }
}
